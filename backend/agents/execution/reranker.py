"""
Reranker Agent - Execution

Reranks and merges results from multiple sources using Gemini.
Combines document search results, web search results, and OCR outputs into a single
ranked list for optimal relevance.
"""
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


@register_agent(
    agent_id="reranker",
    name="Reranker",
    capabilities=["reranking", "ranking", "merging"],
    description="Reranks and merges results using Gemini"
)
class RerankerAgent(BaseAgent):
    """Rerank and merge results from all sources."""

    async def execute(self, state: RAGState) -> RAGState:
        """Rerank results from multiple sources."""
        logger.info("Reranking results...")

        state = update_agent_execution(
            state,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status="running",
            input_data={
                "documents_count": len(state.get("documents", [])),
                "web_results_count": len(state.get("web_results", [])),
            },
        )

        try:
            from services.baai_reranker_service import get_reranker_service

            reranker_service = get_reranker_service()

            # Combine all results
            all_results = []

            # Add document results
            for doc in state.get("documents", []):
                all_results.append({
                    "content": doc.get("content", ""),
                    "source": "document",
                    "metadata": doc,
                })

            # Add web results
            for web in state.get("web_results", []):
                all_results.append({
                    "content": web.get("content", web.get("snippet", "")),
                    "source": "web",
                    "metadata": web,
                })

            # Add OCR results
            for ocr in state.get("ocr_results", []):
                all_results.append({
                    "content": ocr.get("text", ""),
                    "source": "ocr",
                    "metadata": ocr,
                })

            # Rerank
            if all_results:
                reranked = await reranker_service.rerank(
                    query=state["query"],
                    documents=all_results,
                    top_k=settings.reranker_top_k,
                )

                state["reranked_results"] = reranked
            else:
                state["reranked_results"] = []

            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="completed",
                output_data={"results_count": len(state.get("reranked_results", []))},
            )

            logger.info(f"Reranked to {len(state.get('reranked_results', []))} results")

        except Exception as e:
            logger.error(f"Error in reranking: {e}")
            # Use original results if reranking fails
            state["reranked_results"] = state.get("documents", [])[:settings.reranker_top_k]

            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="failed",
                error_message=str(e),
            )

        return state
