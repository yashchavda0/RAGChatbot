"""
Hybrid Retrieval Agent: parallel Milvus vector search + BM25 keyword search,
fused with Reciprocal Rank Fusion → top 30 candidates.
Checks retrieval cache first to skip redundant searches.
"""
import asyncio
import time
from typing import Any, Dict, List

from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config.settings import settings
from config.logging_config import get_logger
from services.cache_service import get_cache_service
from services.observability import get_observability_service

logger = get_logger(__name__)

_RRF_K = 60


def _rrf_fuse(
    vector_results: List[Dict[str, Any]],
    bm25_results: List[Dict[str, Any]],
    top_k: int,
) -> List[Dict[str, Any]]:
    """Merge vector and BM25 results with Reciprocal Rank Fusion."""
    scores: Dict[str, float] = {}
    items: Dict[str, Dict[str, Any]] = {}

    for rank, doc in enumerate(vector_results):
        cid = doc.get("chunk_id") or doc.get("id", f"v_{rank}")
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (_RRF_K + rank + 1)
        if cid not in items:
            items[cid] = doc

    for rank, doc in enumerate(bm25_results):
        cid = doc.get("chunk_id") or doc.get("id", f"b_{rank}")
        # BM25 results use bm25_score field; normalise them into the same dict
        if cid not in items:
            doc_copy = dict(doc)
            doc_copy["score"] = doc.get("bm25_score", 0.0)
            items[cid] = doc_copy
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (_RRF_K + rank + 1)

    sorted_ids = sorted(scores, key=lambda x: scores[x], reverse=True)[:top_k]
    fused = []
    for cid in sorted_ids:
        doc = dict(items[cid])
        doc["fusion_score"] = scores[cid]
        fused.append(doc)
    return fused


@register_agent(
    agent_id="hybrid_retrieval",
    name="Hybrid Retrieval",
    capabilities=["retrieval", "milvus", "bm25", "hybrid_search", "caching"],
    description="Parallel Milvus vector search + BM25, fused with RRF → top 30 candidates",
)
class HybridRetrievalAgent(BaseAgent):

    async def execute(self, state: RAGState) -> RAGState:
        query = state.get("query_rewritten") or state.get("query", "")
        chatbot_id = state.get("chatbot_id", "")
        top_k = settings.retrieval_top_k  # default 30

        update_agent_execution(
            state, self.agent_id, self.agent_name, "running",
            {"query": query, "chatbot_id": chatbot_id, "top_k": top_k},
        )

        cache = get_cache_service()
        obs = get_observability_service()
        trace_id = state.get("langsmith_trace_id", "")
        cache_hits = state.get("cache_hits", {})
        t_start = time.monotonic()

        # Check retrieval cache
        q_hash = cache.compute_query_hash(query, chatbot_id)
        cached = await cache.get_retrieval(q_hash, chatbot_id)
        if cached:
            state["retrieval_candidates"] = cached
            state["documents"] = cached  # populate legacy field too
            cache_hits["retrieval"] = True
            state["cache_hits"] = cache_hits
            state["retrieval_latency_ms"] = (time.monotonic() - t_start) * 1000
            obs.log_cache_event(trace_id, "retrieval", True)
            obs.log_retrieval_metrics(
                trace_id, len(cached), 0, 0.0,
                state["retrieval_latency_ms"], cache_hit=True,
            )
            update_agent_execution(
                state, self.agent_id, self.agent_name, "completed",
                {"query": query},
                {"candidates": len(cached), "cache_hit": True},
            )
            return state

        cache_hits["retrieval"] = False
        state["cache_hits"] = cache_hits

        try:
            vector_results, bm25_results = await asyncio.gather(
                self._vector_search(query, chatbot_id, top_k),
                self._bm25_search(query, chatbot_id, top_k),
                return_exceptions=True,
            )

            if isinstance(vector_results, Exception):
                logger.warning("Vector search failed: %s", vector_results)
                vector_results = []
            if isinstance(bm25_results, Exception):
                logger.warning("BM25 search failed: %s", bm25_results)
                bm25_results = []

            if bm25_results and vector_results:
                candidates = _rrf_fuse(vector_results, bm25_results, top_k)
            elif vector_results:
                candidates = vector_results[:top_k]
            else:
                candidates = bm25_results[:top_k]

        except Exception as exc:
            logger.error("Hybrid retrieval failed: %s", exc)
            candidates = []

        latency_ms = (time.monotonic() - t_start) * 1000
        state["retrieval_candidates"] = candidates
        state["documents"] = candidates  # populate legacy field
        state["retrieval_latency_ms"] = latency_ms

        # Store in cache
        if candidates:
            await cache.set_retrieval(q_hash, chatbot_id, candidates)

        obs.log_retrieval_metrics(
            trace_id, len(candidates), 0,
            candidates[0].get("fusion_score", candidates[0].get("score", 0.0)) if candidates else 0.0,
            latency_ms, cache_hit=False,
        )
        update_agent_execution(
            state, self.agent_id, self.agent_name, "completed",
            {"query": query},
            {"candidates": len(candidates), "latency_ms": round(latency_ms, 1)},
        )
        return state

    async def _vector_search(
        self, query: str, chatbot_id: str, top_k: int
    ) -> List[Dict[str, Any]]:
        from services.embedding_service import get_embedding_service
        from services.milvus_service import get_milvus_service

        emb_service = get_embedding_service()
        milvus = get_milvus_service()

        embeddings = await emb_service.embed_query_with_all_models(query)
        if not embeddings:
            return []

        results = await milvus.ensemble_search(
            query_embeddings=embeddings,
            chatbot_id=chatbot_id,
            top_k=top_k,
            fusion_method=settings.ensemble_fusion_method,
        )
        return results

    async def _bm25_search(
        self, query: str, chatbot_id: str, top_k: int
    ) -> List[Dict[str, Any]]:
        if not settings.bm25_enabled:
            return []

        from services.bm25_service import get_bm25_service
        from services.milvus_service import get_milvus_service

        bm25 = get_bm25_service()

        # Build index on-demand if not present
        if not bm25.has_index(chatbot_id):
            milvus = get_milvus_service()
            chunks_data = await milvus.get_chunks_for_bm25(chatbot_id, limit=10000)
            if chunks_data:
                texts = [c.get("content", "") for c in chunks_data]
                ids = [c.get("chunk_id", str(i)) for i, c in enumerate(chunks_data)]
                bm25.build_index(chatbot_id, texts, ids)
            else:
                return []

        return bm25.search(chatbot_id, query, top_k=top_k)
