"""
Web Search Agent — clean fallback-only mode.

V2 changes:
- Only runs when state["web_fallback_triggered"] is True
- Clears document results to enforce source separation
- Sets answer_source = "web"
- Runs Tavily + You.com in parallel (unchanged logic)
"""
import asyncio
from urllib.parse import urlparse

from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


def _dedup_results(results: list[dict]) -> list[dict]:
    seen: set[str] = set()
    deduped: list[dict] = []
    for r in results:
        normalized = urlparse(r.get("url", "")).netloc + urlparse(r.get("url", "")).path.rstrip("/")
        if normalized not in seen:
            seen.add(normalized)
            deduped.append(r)
    return deduped


@register_agent(
    agent_id="web_search",
    name="Web Search",
    capabilities=["search", "web", "tavily", "youcom", "internet"],
    description="Web-only fallback search when document confidence is below threshold",
)
class WebSearchAgent(BaseAgent):

    async def execute(self, state: RAGState) -> RAGState:
        query = state.get("query_rewritten") or state.get("query", "")

        update_agent_execution(
            state, self.agent_id, self.agent_name, "running", {"query": query[:80]},
        )

        # Enforce source separation: clear document-derived results
        state["documents"] = []
        state["retrieval_candidates"] = []
        state["reranked_results"] = []
        state["compressed_context"] = []
        state["answer_source"] = "web"
        state["from_web_search_only"] = True

        try:
            tasks = []
            provider_names = []

            if settings.tavily_api_key:
                from services.tavily_service import get_tavily_service
                tasks.append(get_tavily_service().search(query=query, max_results=settings.tavily_max_results))
                provider_names.append("tavily")

            if settings.youcom_api_key:
                from services.youcom_service import get_youcom_service
                tasks.append(get_youcom_service().search(query=query, max_results=settings.youcom_max_results))
                provider_names.append("youcom")

            if not tasks:
                logger.warning("No web search API keys configured")
                state["web_results"] = []
                update_agent_execution(
                    state, self.agent_id, self.agent_name, "completed",
                    {"query": query}, {"results_count": 0, "providers": []},
                )
                return state

            search_results = await asyncio.gather(*tasks, return_exceptions=True)

            all_results = []
            for i, result in enumerate(search_results):
                if isinstance(result, Exception):
                    logger.error("Web search provider %s failed: %s", provider_names[i], result)
                elif isinstance(result, list):
                    all_results.extend(result)

            merged = _dedup_results(all_results)
            state["web_results"] = merged

            logger.info("Web fallback: %d results from %s", len(merged), ", ".join(provider_names))
            update_agent_execution(
                state, self.agent_id, self.agent_name, "completed",
                {"query": query},
                {"results_count": len(merged), "providers": provider_names},
            )

        except Exception as exc:
            logger.error("Web search failed: %s", exc)
            state["web_results"] = []
            state["error"] = str(exc)
            update_agent_execution(
                state, self.agent_id, self.agent_name, "failed",
                {"query": query}, error_message=str(exc),
            )

        return state
