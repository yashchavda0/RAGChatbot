"""
Response Synthesis Agent - Execution

Synthesizes the final response using Gemini LLM.
Combines information from all sources and generates a comprehensive answer with proper citations.
"""
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


@register_agent(
    agent_id="response_synthesis",
    name="Response Synthesis",
    capabilities=["synthesis", "generation", "llm", "gemini"],
    description="Synthesizes final response using Gemini LLM"
)
class ResponseSynthesisAgent(BaseAgent):
    """Synthesize the final response using Gemini LLM."""

    async def execute(self, state: RAGState) -> RAGState:
        """Synthesize final response using Gemini."""
        logger.info("Synthesizing final response...")

        state = update_agent_execution(
            state,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status="running",
            input_data={"query": state["query"]},
        )

        try:
            from services.gemini_service import get_gemini_service

            gemini_service = get_gemini_service()

            # Build context from reranked results (or raw results if reranking was skipped)
            context_parts = []
            sources = []

            results = state.get("reranked_results", [])
            if not results:
                # Reranker was skipped - combine raw results directly
                for doc in state.get("documents", []):
                    results.append({"content": doc.get("content", ""), "source": "document", "metadata": doc})
                for web in state.get("web_results", []):
                    results.append({"content": web.get("content", web.get("snippet", "")), "source": "web", "metadata": web})
                for ocr in state.get("ocr_results", []):
                    results.append({"content": ocr.get("text", ""), "source": "ocr", "metadata": ocr})
                for url in state.get("url_results", []):
                    results.append({"content": url.get("text", ""), "source": "url", "metadata": url})

            for i, result in enumerate(results[:5], 1):
                content = result.get("content", "")
                source_type = result.get("source", "unknown")
                metadata = result.get("metadata", {})

                context_parts.append(f"[Source {i} - {source_type}]: {content}")

                # Track sources
                if source_type == "document":
                    sources.append({
                        "type": "document",
                        "filename": metadata.get("filename", "Unknown"),
                        "chunk_id": metadata.get("chunk_id", ""),
                    })
                elif source_type == "web":
                    sources.append({
                        "type": "web",
                        "url": metadata.get("url", ""),
                        "title": metadata.get("title", ""),
                    })

            context = "\n\n".join(context_parts)

            # Generate response
            prompt = f"""Based on the following context, answer the user's query.
Provide a comprehensive response with proper citations.

User Query: {state['query']}

Context:
{context}

Instructions:
1. Answer the query based on the provided context
2. Cite sources using [Source N] notation
3. If the context doesn't contain enough information, say so
4. Be concise but thorough

Response:"""

            response = await gemini_service.generate(
                prompt=prompt,
                temperature=settings.gemini_temperature,
                max_tokens=settings.gemini_max_tokens,
            )

            state["final_response"] = response
            state["response_sources"] = sources

            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="completed",
                output_data={"response_length": len(response)},
            )

            logger.info(f"Generated response: {len(response)} chars")

        except Exception as e:
            logger.error(f"Error synthesizing response: {e}")
            state["error"] = str(e)
            state["final_response"] = "I apologize, but I encountered an error while generating the response."

            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="failed",
                error_message=str(e),
            )

        return state
