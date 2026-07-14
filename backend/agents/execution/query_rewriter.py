"""
Query Rewriter Agent: converts conversational follow-up questions into
standalone retrieval-optimized queries using conversation history.
"""
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


@register_agent(
    agent_id="query_rewriter",
    name="Query Rewriter",
    capabilities=["query_rewriting", "context_understanding"],
    description="Rewrites conversational queries into standalone retrieval-optimized questions",
)
class QueryRewriterAgent(BaseAgent):

    _REWRITE_PROMPT = """You are a query rewriter for a RAG retrieval system.

Your task: Rewrite the user's latest question into a STANDALONE, retrieval-optimized question
that can be answered without seeing the conversation history.

Rules:
- Resolve pronouns and references (e.g. "it", "that scheme", "them")
- Keep the exact intent — do not add new facts or assumptions
- Produce a concise, specific search query (not a paragraph)
- If the question is already standalone and clear, return it unchanged
- Return ONLY the rewritten question, no explanation

Conversation history:
{history}

Latest question: {query}

Rewritten question:"""

    async def execute(self, state: RAGState) -> RAGState:
        query = state.get("query", "")
        # Read prior turns loaded by session_loader (state["messages"] is always empty in V2).
        history = state.get("conversation_history", [])

        update_agent_execution(state, self.agent_id, self.agent_name, "running", {"query": query})

        # Preserve original query always
        state["original_query"] = query

        # If rewriting is disabled, pass the original query through unchanged.
        # Keeps the query in the user's language and avoids an extra LLM call.
        if not settings.query_rewrite_enabled:
            state["query_rewritten"] = query
            update_agent_execution(
                state, self.agent_id, self.agent_name, "completed",
                {"query": query},
                {"query_rewritten": query, "rewrite_skipped": True, "reason": "disabled"},
            )
            return state

        # Skip LLM call on first turn (no meaningful history)
        if len(history) <= 2:
            state["query_rewritten"] = query
            update_agent_execution(
                state, self.agent_id, self.agent_name, "completed",
                {"query": query}, {"query_rewritten": query, "rewrite_skipped": True},
            )
            return state

        try:
            from services.llm_service import get_llm_service

            # Build concise history string (last 6 messages)
            history_msgs = history[-6:] if len(history) > 6 else history
            history_lines = []
            for msg in history_msgs:
                role = msg.get("role", msg.get("type", "unknown"))
                content = msg.get("content", "")
                if content:
                    history_lines.append(f"{role}: {content[:300]}")
            history_str = "\n".join(history_lines) if history_lines else "No previous context."

            prompt = self._REWRITE_PROMPT.format(history=history_str, query=query)
            llm = get_llm_service()
            rewritten = await llm.generate(prompt, temperature=0.0, max_tokens=200)
            rewritten = rewritten.strip().strip('"').strip("'")

            # Sanity check: if rewrite is empty or much longer than original, fallback
            if not rewritten or len(rewritten) > len(query) * 3:
                rewritten = query

            state["query_rewritten"] = rewritten
            update_agent_execution(
                state, self.agent_id, self.agent_name, "completed",
                {"query": query},
                {"query_rewritten": rewritten, "rewrite_applied": rewritten != query},
            )

        except Exception as exc:
            logger.warning("Query rewriter failed, using original: %s", exc)
            state["query_rewritten"] = query
            update_agent_execution(
                state, self.agent_id, self.agent_name, "completed",
                {"query": query}, {"query_rewritten": query, "error": str(exc)},
            )

        return state
