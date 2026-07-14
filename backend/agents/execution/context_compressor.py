"""
Context Compressor Agent: reduces token usage by compressing each of the
top-5 reranked chunks to only the sentences relevant to the user query.
All chunks are compressed in parallel via asyncio.gather.
"""
import asyncio
import time
from typing import Any, Dict, List

from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config.settings import settings
from config.logging_config import get_logger
from services.observability import get_observability_service

logger = get_logger(__name__)

_COMPRESS_PROMPT = """You are a precise document summarizer for a RAG system.

Task: From the document chunk below, extract ONLY the sentences that are directly
relevant to answering the user query. Preserve exact wording — do not paraphrase.
Preserve all facts, numbers, dates, and named entities.

If no sentences are relevant, return: [NOT RELEVANT]

User query: {query}

Document chunk:
{content}

Extracted relevant sentences:"""


@register_agent(
    agent_id="context_compressor",
    name="Context Compressor",
    capabilities=["context_compression", "token_reduction"],
    description="Compresses top-5 reranked chunks to query-relevant sentences (parallel)",
)
class ContextCompressorAgent(BaseAgent):

    async def execute(self, state: RAGState) -> RAGState:
        reranked = state.get("reranked_results", [])
        query = state.get("query_rewritten") or state.get("query", "")
        obs = get_observability_service()
        trace_id = state.get("langsmith_trace_id", "")

        update_agent_execution(
            state, self.agent_id, self.agent_name, "running",
            {"n_chunks": len(reranked), "compression_enabled": settings.context_compression_enabled},
        )

        if not reranked:
            state["compressed_context"] = []
            update_agent_execution(
                state, self.agent_id, self.agent_name, "completed",
                {}, {"compressed_context": 0},
            )
            return state

        if not settings.context_compression_enabled:
            # Passthrough — wrap chunks in the expected format
            state["compressed_context"] = [
                {
                    "content": doc.get("content", ""),
                    "source": doc.get("source_name") or doc.get("filename") or doc.get("source", ""),
                    "chunk_id": doc.get("chunk_id", ""),
                    "score": doc.get("reranker_score", doc.get("score", 0.0)),
                    "original_length": len(doc.get("content", "")),
                    "compressed_length": len(doc.get("content", "")),
                }
                for doc in reranked[:settings.reranker_top_n]
            ]
            update_agent_execution(
                state, self.agent_id, self.agent_name, "completed",
                {}, {"compressed_context": len(state["compressed_context"]), "bypassed": True},
            )
            return state

        t_start = time.monotonic()
        chunks = reranked[:settings.reranker_top_n]

        compressed = await asyncio.gather(
            *[self._compress_chunk(query, doc) for doc in chunks],
            return_exceptions=True,
        )

        results: List[Dict[str, Any]] = []
        total_original = 0
        total_compressed = 0

        for i, result in enumerate(compressed):
            doc = chunks[i]
            original_content = doc.get("content", "")
            total_original += len(original_content)

            if isinstance(result, Exception):
                logger.warning("Chunk compression failed for chunk %d: %s", i, result)
                compressed_content = original_content  # fallback
            elif result == "[NOT RELEVANT]" or not result:
                compressed_content = original_content  # keep original if nothing relevant
            else:
                compressed_content = result

            total_compressed += len(compressed_content)
            results.append({
                "content": compressed_content,
                "source": doc.get("source_name") or doc.get("filename") or doc.get("source", ""),
                "chunk_id": doc.get("chunk_id", ""),
                "document_id": doc.get("document_id", ""),
                "score": doc.get("reranker_score", doc.get("score", 0.0)),
                "original_length": len(original_content),
                "compressed_length": len(compressed_content),
                "metadata": doc.get("metadata", {}),
            })

        state["compressed_context"] = results
        latency_ms = (time.monotonic() - t_start) * 1000

        # Estimate token reduction (rough: 4 chars ≈ 1 token)
        obs.log_compression_metrics(
            trace_id, total_original // 4, total_compressed // 4
        )

        update_agent_execution(
            state, self.agent_id, self.agent_name, "completed",
            {"n_chunks": len(chunks)},
            {
                "compressed_context": len(results),
                "original_chars": total_original,
                "compressed_chars": total_compressed,
                "reduction_pct": round((1 - total_compressed / max(total_original, 1)) * 100, 1),
                "latency_ms": round(latency_ms, 1),
            },
        )
        return state

    async def _compress_chunk(self, query: str, doc: Dict[str, Any]) -> str:
        content = doc.get("content", "")
        if not content:
            return ""

        # Skip compression for very short chunks — not worth the LLM call
        if len(content) < 300:
            return content

        from services.llm_service import get_llm_service
        prompt = _COMPRESS_PROMPT.format(query=query, content=content[:3000])
        llm = get_llm_service()
        result = await llm.generate(prompt, temperature=0.0, max_tokens=800)
        return result.strip()
