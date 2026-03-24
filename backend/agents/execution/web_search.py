"""
Web Search Agent - Execution

Performs web searches using the Tavily API to fetch current information from the internet.
"""
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


@register_agent(
    agent_id="web_search",
    name="Web Search",
    capabilities=["search", "web", "tavily", "internet"],
    description="Searches the web using Tavily API for current information"
)
class WebSearchAgent(BaseAgent):
    """Perform web search using Tavily API."""

    async def execute(self, state: RAGState) -> RAGState:
        """Perform web search using Tavily API."""
        logger.info(f"Performing web search for: {state['query'][:50]}...")

        state = update_agent_execution(
            state,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status="running",
            input_data={"query": state["query"]},
        )

        try:
            from services.tavily_service import TavilyService

            tavily_service = TavilyService()

            results = await tavily_service.search(
                query=state["query"],
                max_results=settings.tavily_max_results,
            )

            state["web_results"] = results

            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="completed",
                input_data={"query": state["query"]},
                output_data={"results_count": len(results)},
            )

            logger.info(f"Found {len(results)} web results")

        except Exception as e:
            logger.error(f"Error in web search: {e}")
            state["error"] = str(e)

            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="failed",
                error_message=str(e),
            )

        return state
