"""
Document Search Agent - Execution

Searches documents in Milvus vector database using all 3 embedding models.
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
    description="Searches uploaded documents using multi-model embeddings"
)
class DocumentSearchAgent(BaseAgent):
    """Search documents in Milvus using all 3 embedding models."""

    async def execute(self, state: RAGState) -> RAGState:
        """Search documents in Milvus with all 3 embedding models."""
        logger.info(f"Searching documents for: {state['query'][:50]}...")

        state = update_agent_execution(
            state,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status="running",
            input_data={"query": state["query"]},
        )

        try:
            from services.milvus_service import MilvusService
            from services.embedding_service import EmbeddingService

            milvus_service = MilvusService()
            embedding_service = EmbeddingService()

            # Generate embeddings with all 3 models
            all_results = []

            for model_name in settings.embedding_models:
                logger.info(f"Searching with model: {model_name}")

                # Generate query embedding
                query_embedding = await embedding_service.embed_query(
                    state["query"], model_name=model_name
                )

                # Search Milvus
                results = await milvus_service.search(
                    query_embedding=query_embedding,
                    embedding_model=model_name,
                    top_k=20,  # Get more results for reranking
                )

                # Add model info to results
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
