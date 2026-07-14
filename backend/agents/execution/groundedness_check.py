"""
Groundedness Check Agent (fast_rag mode): a cheap, embedding-based quality gate
that runs after response_synthesis. Scores how relevant the generated answer is
to the retrieved source chunks via cosine similarity, and requests a bounded
regeneration (retry) of response_synthesis when relevance is low.

Pure compute + one embedding call — no LLM. This keeps fast_rag fast while
adding a lightweight quality assurance step. Heavier, LLM-based factual
refinement lives in the expert_review pipeline (draft/critique/improve).

Limitation: cosine similarity measures semantic relatedness, not factual
groundedness — it catches off-topic answers reliably, subtle hallucinations
less so. It is a retry gate, not a hallucination detector.
"""
from typing import Any, Dict, List

import numpy as np

from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config import settings
from config.logging_config import get_logger
from services.observability import get_observability_service

logger = get_logger(__name__)

# Truncate text sent to the embedding API, matching the reranker's behaviour.
_MAX_EMBED_CHARS = 2000


def _cosine(a: "np.ndarray", b: "np.ndarray") -> float:
    na = float(np.linalg.norm(a))
    nb = float(np.linalg.norm(b))
    if na > 0 and nb > 0:
        return float(np.dot(a, b) / (na * nb))
    return 0.0


@register_agent(
    agent_id="groundedness_check",
    name="Groundedness Check",
    capabilities=["groundedness", "quality_gate", "fast_rag"],
    description="Embedding-based answer-vs-source relevancy gate with bounded retry (fast_rag)",
)
class GroundednessCheckAgent(BaseAgent):

    async def execute(self, state: RAGState) -> RAGState:
        answer = state.get("final_response") or ""

        update_agent_execution(
            state, self.agent_id, self.agent_name, "running",
            {"answer_length": len(answer), "enabled": settings.groundedness_check_enabled},
        )

        # Disabled → pass through, never retry (restores prior fast_rag behaviour).
        if not settings.groundedness_check_enabled:
            state["should_retry"] = False
            update_agent_execution(
                state, self.agent_id, self.agent_name, "completed",
                {}, {"bypassed": True},
            )
            return state

        # Nothing to check or a hard failure upstream → end, don't loop.
        if state.get("error") or not answer:
            state["groundedness_score"] = 0.0
            state["should_retry"] = False
            update_agent_execution(
                state, self.agent_id, self.agent_name, "completed",
                {}, {"groundedness_score": 0.0, "should_retry": False, "reason": "no_answer_or_error"},
            )
            return state

        source_contents = self._collect_source_contents(state)
        if not source_contents:
            # No sources to ground against → retrying synthesis won't help.
            state["groundedness_score"] = 0.0
            state["should_retry"] = False
            update_agent_execution(
                state, self.agent_id, self.agent_name, "completed",
                {}, {"groundedness_score": 0.0, "should_retry": False, "reason": "no_sources"},
            )
            return state

        score = await self._score(answer, source_contents)
        state["groundedness_score"] = score

        threshold = settings.groundedness_threshold
        max_retries = settings.groundedness_max_retries
        retries = state.get("retry_count", 0)

        should_retry = score < threshold and retries < max_retries
        if should_retry:
            state["retry_count"] = retries + 1
        state["should_retry"] = should_retry

        try:
            get_observability_service().log_confidence(
                state.get("langsmith_trace_id", ""), score, "groundedness",
            )
        except Exception:
            pass

        logger.info(
            "Groundedness: %.3f (threshold=%.2f, retries=%d/%d) → retry=%s",
            score, threshold, retries, max_retries, should_retry,
        )

        update_agent_execution(
            state, self.agent_id, self.agent_name, "completed",
            {"answer_length": len(answer), "n_sources": len(source_contents)},
            {
                "groundedness_score": round(score, 4),
                "should_retry": should_retry,
                "retry_count": state.get("retry_count", retries),
            },
        )
        return state

    def _collect_source_contents(self, state: RAGState) -> List[str]:
        """Gather the same source text response_synthesis answered from."""
        contents: List[str] = []
        compressed = state.get("compressed_context", [])
        if compressed:
            contents = [str(c.get("content", "")) for c in compressed if c.get("content")]
        if not contents:
            reranked = state.get("reranked_results", [])
            contents = [str(r.get("content", "")) for r in reranked if r.get("content")]
        if not contents:
            web = state.get("web_results", [])
            contents = [
                str(w.get("content") or w.get("snippet") or w.get("text", ""))
                for w in web
                if (w.get("content") or w.get("snippet") or w.get("text"))
            ]
        return contents

    async def _score(self, answer: str, source_contents: List[str]) -> float:
        """Max cosine similarity between the answer and any source chunk.

        Both the answer and the chunks are embedded as documents so they live in
        the same embedding space (symmetric comparison).
        """
        from services.embedding_service import get_embedding_service

        embedding_service = get_embedding_service()

        texts = [answer[:_MAX_EMBED_CHARS]] + [c[:_MAX_EMBED_CHARS] for c in source_contents]
        try:
            embeddings = await embedding_service.embed_documents(texts)
        except Exception as exc:
            logger.warning("Groundedness embedding failed, accepting answer: %s", exc)
            return settings.groundedness_threshold  # fail open: don't retry on embed errors

        if not embeddings:
            return settings.groundedness_threshold

        answer_vec = np.array(embeddings[0])
        chunk_vecs = [np.array(v) for v in embeddings[1:]]

        return max((_cosine(answer_vec, cv) for cv in chunk_vecs), default=0.0)
