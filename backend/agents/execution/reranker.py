"""
Reranker Agent — always-on, top-N, with score tracking.

V2 changes:
- Always runs (no pre-rerank relevance checks)
- Uses retrieval_candidates (top 30) as input
- Returns top settings.reranker_top_n (default 5) results
- Records reranker_scores and reranker_top_score on state
"""
import json

from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config import settings
from config.logging_config import get_logger
from services.observability import get_observability_service

logger = get_logger(__name__)


@register_agent(
    agent_id="reranker",
    name="Reranker",
    capabilities=["reranking", "ranking", "merging"],
    description="Reranks retrieval candidates using Gemini cosine similarity → top 5",
)
class RerankerAgent(BaseAgent):

    async def execute(self, state: RAGState) -> RAGState:
        query = state.get("query_rewritten") or state.get("query", "")

        # V2: use retrieval_candidates; fall back to legacy documents field
        candidates = state.get("retrieval_candidates") or state.get("documents", [])

        # Also include OCR and URL results if present (non-document mode)
        all_inputs = list(candidates)
        for ocr in state.get("ocr_results", []):
            all_inputs.append({"content": ocr.get("text", ""), "source": "ocr", "metadata": ocr})
        for url in state.get("url_results", []):
            all_inputs.append({"content": url.get("content", ""), "source": "url", "metadata": url})

        update_agent_execution(
            state, self.agent_id, self.agent_name, "running",
            {"candidates": len(all_inputs), "query": query[:80]},
        )

        obs = get_observability_service()
        trace_id = state.get("langsmith_trace_id", "")
        top_n = settings.reranker_top_n  # default 5

        if not all_inputs:
            state["reranked_results"] = []
            state["reranker_scores"] = []
            state["reranker_top_score"] = 0.0
            update_agent_execution(
                state, self.agent_id, self.agent_name, "completed",
                {}, {"reranked": 0},
            )
            return state

        try:
            from services.baai_reranker_service import get_reranker_service

            reranked = await get_reranker_service().rerank(
                query=query,
                documents=all_inputs,
                top_k=top_n,
            )

            scores = [float(r.get("reranker_score", r.get("score", 0.0))) for r in reranked]
            top_score = scores[0] if scores else 0.0

            state["reranked_results"] = reranked
            state["reranker_scores"] = scores
            state["reranker_top_score"] = top_score

            obs.log_retrieval_metrics(
                trace_id,
                n_candidates=len(all_inputs),
                n_reranked=len(reranked),
                top_score=top_score,
                latency_ms=0.0,
                cache_hit=False,
            )

            logger.info(json.dumps({
                "event": "reranker.completed",
                "candidates": len(all_inputs),
                "reranked": len(reranked),
                "top_score": round(top_score, 4),
            }))

            update_agent_execution(
                state, self.agent_id, self.agent_name, "completed",
                {"candidates": len(all_inputs)},
                {"reranked": len(reranked), "top_score": round(top_score, 4)},
            )

        except Exception as exc:
            logger.error("Reranker failed: %s", exc)
            # Fallback: return first top_n candidates with score 0.5
            fallback = all_inputs[:top_n]
            for doc in fallback:
                doc["reranker_score"] = 0.5
            state["reranked_results"] = fallback
            state["reranker_scores"] = [0.5] * len(fallback)
            state["reranker_top_score"] = 0.5 if fallback else 0.0

            update_agent_execution(
                state, self.agent_id, self.agent_name, "failed",
                {}, error_message=str(exc),
            )

        return state
