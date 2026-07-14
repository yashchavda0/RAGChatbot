"""
Draft Generator Agent (Expert Review mode): generates an initial detailed
draft answer from compressed context before critique and improvement.
"""
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config.logging_config import get_logger

logger = get_logger(__name__)

_DRAFT_PROMPT = """You are an expert knowledge assistant generating an initial draft answer.

Using ONLY the provided context, write a comprehensive and accurate answer to the user's question.
Be thorough — this draft will be reviewed and improved. Include all relevant details.
Always answer in the same language the user used in their question — even if the context is in a different language.
{history}Context:
{context}

User Question: {query}

Draft Answer:"""


@register_agent(
    agent_id="draft_generator",
    name="Draft Generator",
    capabilities=["draft_generation", "expert_review"],
    description="Generates initial draft answer for Expert Review mode",
)
class DraftGeneratorAgent(BaseAgent):

    async def execute(self, state: RAGState) -> RAGState:
        query = state.get("query_rewritten") or state.get("query", "")
        compressed = state.get("compressed_context", [])

        update_agent_execution(
            state, self.agent_id, self.agent_name, "running",
            {"query": query, "n_chunks": len(compressed)},
        )

        context_parts = []
        for i, doc in enumerate(compressed, 1):
            source = doc.get("source", f"Source {i}")
            content = doc.get("content", "")
            context_parts.append(f"[{source}]:\n{content}")
        context_str = "\n\n---\n\n".join(context_parts) if context_parts else "No context available."

        try:
            from services.llm_service import get_llm_service
            # Conversation history: intent/reference context only, NOT a source of facts.
            history = state.get("conversation_history", [])
            if history:
                history_lines = [
                    f"{m.get('role', 'user')}: {m.get('content', '')}" for m in history
                ]
                history_str = (
                    "Recent conversation (use ONLY to understand intent and references; "
                    "do NOT treat it as a source of facts):\n"
                    + "\n".join(history_lines)
                    + "\n\n"
                )
            else:
                history_str = ""
            prompt = _DRAFT_PROMPT.format(history=history_str, context=context_str, query=query)
            llm = get_llm_service()
            draft = await llm.generate(prompt, temperature=0.3, max_tokens=1500)
            state["draft_answer"] = draft.strip()
        except Exception as exc:
            logger.error("Draft generation failed: %s", exc)
            state["draft_answer"] = ""

        update_agent_execution(
            state, self.agent_id, self.agent_name, "completed",
            {"query": query},
            {"draft_length": len(state["draft_answer"])},
        )
        return state
