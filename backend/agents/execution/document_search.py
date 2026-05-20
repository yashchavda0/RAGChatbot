"""
Document Search Agent - Execution

Searches documents in Milvus vector database using Gemini embeddings.
Returns relevant document chunks for answering user queries.
"""
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


@register_agent(
    agent_id="document_search",
    name="Document Search",
    capabilities=["search", "milvus", "documents", "retrieval"],
    description="Searches uploaded documents using Gemini embeddings"
)
class DocumentSearchAgent(BaseAgent):
    """Search documents in Milvus using Gemini embeddings."""

    async def execute(self, state: RAGState) -> RAGState:
        """Search documents in Milvus with Gemini embeddings."""
        logger.info(f"Searching documents for: {state['query'][:50]}...")

        state = update_agent_execution(
            state,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status="running",
            input_data={"query": state["query"]},
        )

        try:
            from services.milvus_service import get_milvus_service
            from services.embedding_service import get_embedding_service

            milvus_service = get_milvus_service()
            embedding_service = get_embedding_service()

            chatbot_id = state.get("chatbot_id", "")

            # Generate query embedding with Gemini
            all_results = []

            for model_name in settings.embedding_models:
                logger.info(f"Searching with model: {model_name}")

                query_embedding = await embedding_service.embed_query(
                    state["query"], model_name=model_name
                )

                results = await milvus_service.search(
                    query_embedding=query_embedding,
                    chatbot_id=chatbot_id,
                    embedding_model=model_name,
                    top_k=20,
                )

                for result in results:
                    result["embedding_model"] = model_name

                all_results.extend(results)

            state["documents"] = all_results

            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="completed",
                input_data={"query": state["query"]},
                output_data={"results_count": len(all_results)},
            )

            logger.info(f"Found {len(all_results)} document chunks")

        except Exception as e:
            logger.error(f"Error in document search: {e}")
            state["error"] = str(e)

            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="failed",
                error_message=str(e),
            )

        return state
