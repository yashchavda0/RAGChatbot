"""
Document Search Agent - Execution

Per-model vector searches with detailed per-model logging and BM25 hybrid fusion.
Runs search separately for each active embedding model, logs timing and top scores,
then fuses results (RRF or weighted) and optionally fuses with BM25 results.
"""
import time
import json
import asyncio
from typing import Dict, List, Any

from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


@register_agent(
    agent_id="document_search",
    name="Document Search",
    capabilities=["search", "milvus", "documents", "retrieval", "ensemble", "bm25"],
    description="Per-model ensemble search using multiple embeddings + optional BM25 hybrid"
)
class DocumentSearchAgent(BaseAgent):
    """Search documents using per-model vector searches and optional BM25 fusion."""

    async def execute(self, state: RAGState) -> RAGState:
        """Execute per-model document searches, fuse results and log metrics."""
        query = state.get("query", "")
        logger.info(f"DocumentSearchAgent: starting search for query='{query[:80]}'")

        state = update_agent_execution(
            state,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status="running",
            input_data={"query": query},
        )

        try:
            from services.milvus_service import get_milvus_service
            from services.embedding_service import get_embedding_service
            from services.bm25_service import get_bm25_service, fuse_results as bm25_fuse
            from services.chatbot_service import get_chatbot_service

            milvus_service = get_milvus_service()
            embedding_service = get_embedding_service()
            bm25_service = get_bm25_service()

            chatbot_id = state.get("chatbot_id", "")

            # Embed query with all active models
            start_embed = time.perf_counter()
            query_embeddings: Dict[str, List[float]] = await embedding_service.embed_query_with_all_models(query)
            embed_time = time.perf_counter() - start_embed

            if not query_embeddings:
                raise RuntimeError("No query embeddings available from any provider")

            active_models = list(query_embeddings.keys())
            logger.info(f"DocumentSearchAgent: obtained embeddings for models: {active_models} (embed_time={embed_time:.3f}s)")

            # Per-model searches
            per_model_results: Dict[str, List[Dict[str, Any]]] = {}
            per_model_stats: List[Dict[str, Any]] = []

            per_model_top_scores: Dict[str, float] = {}

            top_k = 20

            # Parallelize per-model searches to utilize threadpool-backed milvus_service.search
            async def _search_one(m_name: str, q_vector: List[float]):
                model_start = time.perf_counter()
                try:
                    res = await milvus_service.search(
                        query_embedding=q_vector,
                        chatbot_id=chatbot_id,
                        model_name=m_name,
                        top_k=top_k,
                        filters=None,
                    )
                except Exception as e:
                    logger.error(f"Error searching with model {m_name}: {e}")
                    res = []
                elapsed = time.perf_counter() - model_start
                return m_name, res, elapsed

            tasks = [
                asyncio.create_task(_search_one(mn, emb)) for mn, emb in query_embeddings.items()
            ]

            search_results = await asyncio.gather(*tasks)

            for model_name, results, model_elapsed in search_results:
                results_count = len(results)
                top_score = max((r.get("score", 0) for r in results), default=0.0)
                per_model_results[model_name] = results
                per_model_top_scores[model_name] = top_score

                per_model_stats.append({
                    "model": model_name,
                    "results_count": results_count,
                    "top_score": float(top_score),
                    "search_time_s": round(model_elapsed, 4),
                })

                logger.info(
                    f"ModelSearch: {model_name} returned {results_count} hits "
                    f"(top_score={top_score:.4f}, time={model_elapsed:.3f}s)"
                )

                # Log detailed per-chunk results for this model
                logger.info(json.dumps({
                    "event": "retrieval.model_search",
                    "model": model_name,
                    "query": query[:120],
                    "results_count": results_count,
                    "search_time_s": round(model_elapsed, 4),
                    "top_score": round(top_score, 6),
                    "results": [
                        {
                            "rank": idx,
                            "chunk_id": r.get("chunk_id") or r.get("id") or "N/A",
                            "similarity_score": round(float(r.get("score", 0.0)), 6),
                            "source": r.get("source_name") or "document",
                            "content_preview": (r.get("content") or "")[:100].replace("\n", " "),
                        }
                        for idx, r in enumerate(results[:10], start=1)
                    ]
                }))

            # Fuse per-model results using MilvusService fusion (RRF or weighted)
            try:
                fused = milvus_service._fuse_results(per_model_results, method=settings.ensemble_fusion_method)
            except Exception:
                # Fallback to milvus ensemble helper
                fused = await milvus_service.ensemble_search(
                    query_embeddings=query_embeddings,
                    chatbot_id=chatbot_id,
                    top_k=top_k,
                    fusion_method=settings.ensemble_fusion_method,
                )

            # Log fused results
            logger.info(json.dumps({
                "event": "retrieval.fusion_results",
                "fusion_method": settings.ensemble_fusion_method,
                "query": query[:120],
                "results_count": len(fused),
                "top_score": round(max((f.get("fusion_score", 0.0) for f in fused), default=0.0), 6),
                "results": [
                    {
                        "rank": idx,
                        "chunk_id": f.get("chunk_id") or f.get("id") or "N/A",
                        "fusion_score": round(float(f.get("fusion_score", f.get("score", 0.0))), 6),
                        "source": f.get("source_name") or "document",
                        "content_preview": (f.get("content") or "")[:100].replace("\n", " "),
                    }
                    for idx, f in enumerate(fused[:10], start=1)
                ]
            }))

            bm25_used = False
            final_results = fused

            # BM25 hybrid fusion if enabled
            if settings.bm25_enabled:
                # Ensure BM25 index exists; if not, try to build from Milvus chunks
                if not bm25_service.has_index(chatbot_id):
                    logger.info(f"BM25: building index for chatbot {chatbot_id}")
                    chunks_data = await milvus_service.get_chunks_for_bm25(chatbot_id)
                    if chunks_data:
                        bm25_service.build_index(
                            chatbot_id=chatbot_id,
                            chunks=[c["content"] for c in chunks_data],
                            chunk_ids=[c["chunk_id"] for c in chunks_data],
                        )

                if bm25_service.has_index(chatbot_id):
                    bm25_results = bm25_service.search(chatbot_id=chatbot_id, query=query, top_k=top_k)
                    logger.info(f"BM25: returned {len(bm25_results)} results for chatbot {chatbot_id}")
                    
                    # Log BM25 results
                    logger.info(json.dumps({
                        "event": "retrieval.bm25_results",
                        "query": query[:120],
                        "results_count": len(bm25_results),
                        "top_score": round(max((b.get("bm25_score", 0.0) for b in bm25_results), default=0.0), 6),
                        "results": [
                            {
                                "rank": idx,
                                "chunk_id": b.get("chunk_id") or "N/A",
                                "bm25_score": round(float(b.get("bm25_score", 0.0)), 6),
                                "content_preview": (b.get("content") or "")[:100].replace("\n", " "),
                            }
                            for idx, b in enumerate(bm25_results[:10], start=1)
                        ]
                    }))
                    
                    if bm25_results:
                        final_results = bm25_fuse(
                            vector_results=fused,
                            bm25_results=bm25_results,
                            bm25_weight=settings.bm25_weight,
                            method=settings.ensemble_fusion_method,
                        )
                        bm25_used = True

            # Attach documents and metadata to state
            state["documents"] = final_results

            # Compute max score from fusion (fusion_score preferred, else score)
            fused_max_score = 0.0
            if final_results:
                fused_max_score = max(r.get("fusion_score", r.get("score", 0.0)) for r in final_results)

            # Use the raw vector similarity for fallback decisions so RRF fusion does not
            # compress the score into a tiny range like 0.02-0.04.
            raw_max_score = max(per_model_top_scores.values(), default=0.0)

            # Determine relevance threshold (chatbot override allowed)
            threshold = float(settings.relevance_threshold)
            try:
                if chatbot_id:
                    chatbot_conf = await get_chatbot_service().get(chatbot_id)
                    if chatbot_conf and chatbot_conf.get("web_search_threshold") is not None:
                        threshold = float(chatbot_conf.get("web_search_threshold"))
            except Exception as e:
                logger.debug(f"Unable to fetch chatbot-specific threshold: {e}")

            low_relevance = raw_max_score < threshold

            # Update execution tracking with details
            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="completed",
                input_data={"query": query},
                output_data={
                    "results_count": len(final_results),
                    "max_score": float(raw_max_score),
                    "fused_max_score": float(fused_max_score),
                    "low_relevance": low_relevance,
                    "relevance_threshold_used": float(threshold),
                    "models_used": active_models,
                    "per_model_stats": per_model_stats,
                    "per_model_top_scores": per_model_top_scores,
                    "bm25_enabled": bm25_used,
                    "fusion_method": settings.ensemble_fusion_method,
                },
            )

            logger.info(
                f"DocumentSearchAgent: completed (fused_results={len(final_results)}, raw_max_score={raw_max_score:.4f}, "
                f"fused_max_score={fused_max_score:.4f}, low_relevance={low_relevance}, "
                f"models={len(active_models)}, bm25={bm25_used})"
            )

            # Log final merged results summary
            logger.info(json.dumps({
                "event": "retrieval.final_results",
                "query": query[:120],
                "final_count": len(final_results),
                "raw_max_score": round(raw_max_score, 6),
                "fused_max_score": round(fused_max_score, 6),
                "threshold_used": round(threshold, 6),
                "low_relevance": low_relevance,
                "bm25_used": bm25_used,
                "results": [
                    {
                        "rank": idx,
                        "chunk_id": r.get("chunk_id") or r.get("id") or "N/A",
                        "source": r.get("source") or "document",
                        "fusion_score": round(float(r.get("fusion_score", r.get("score", 0.0))), 6),
                        "content_preview": (r.get("content") or "")[:100].replace("\n", " "),
                    }
                    for idx, r in enumerate(final_results[:10], start=1)
                ]
            }))

            # Store some convenient fields on state for downstream agents
            state["low_relevance"] = low_relevance
            state["max_document_score"] = float(raw_max_score)
            state["max_fused_document_score"] = float(fused_max_score)
            state["relevance_threshold_used"] = float(threshold)

        except Exception as e:
            logger.exception(f"DocumentSearchAgent: error during search: {e}")
            state["documents"] = []
            state["error"] = str(e)

            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="failed",
                input_data={"query": state.get("query", "")},
                error_message=str(e),
            )

        return state
