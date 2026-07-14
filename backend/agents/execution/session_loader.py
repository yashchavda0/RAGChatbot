"""
Session Loader Agent: loads session context from Redis/PostgreSQL and
sets the reasoning_mode from chatbot settings.

Runs in parallel with QueryRewriterAgent at graph start.
"""
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config.settings import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


@register_agent(
    agent_id="session_loader",
    name="Session Loader",
    capabilities=["session_management", "context_loading"],
    description="Loads session context and chatbot reasoning mode configuration",
)
class SessionLoaderAgent(BaseAgent):

    async def execute(self, state: RAGState) -> RAGState:
        session_id = state.get("session_id", "")
        chatbot_id = state.get("chatbot_id", "")

        update_agent_execution(
            state, self.agent_id, self.agent_name, "running",
            {"session_id": session_id, "chatbot_id": chatbot_id},
        )

        # 1. Resolve reasoning mode from chatbot settings
        reasoning_mode = await self._load_reasoning_mode(chatbot_id)
        state["reasoning_mode"] = reasoning_mode

        # 2. Load conversation history (prior turns) for follow-up context
        conversation_history = await self._load_conversation_history(session_id)
        state["conversation_history"] = conversation_history

        # 3. Load session context
        session_context = await self._load_session_context(session_id, state)
        state["session_context"] = session_context

        # Track cache hit
        cache_hits = state.get("cache_hits", {})
        cache_hits["session"] = session_context.get("_from_cache", False)
        state["cache_hits"] = cache_hits

        update_agent_execution(
            state, self.agent_id, self.agent_name, "completed",
            {"session_id": session_id},
            {
                "reasoning_mode": reasoning_mode,
                "context_loaded": bool(session_context),
                "history_turns": len(conversation_history),
            },
        )
        return state

    async def _load_conversation_history(self, session_id: str) -> list:
        """Load recent prior turns (excluding the current turn) from Postgres.

        Returns the last N messages as compact [{role, content}] dicts, oldest→newest,
        with content truncated to bound token cost. The current user message is written
        to Postgres only after the graph runs, so this yields exactly the prior conversation.
        """
        if not session_id:
            return []
        try:
            from services.session_manager import get_session_manager
            history = await get_session_manager().get_conversation_history(
                session_id, limit=settings.conversation_history_limit,
            )
        except Exception as exc:
            logger.debug("Could not load conversation history: %s", exc)
            return []

        max_turns = settings.conversation_history_limit
        if len(history) > max_turns:
            history = history[-max_turns:]

        char_limit = settings.conversation_history_char_limit
        trimmed = []
        for msg in history:
            role = msg.get("role", "")
            content = (msg.get("content") or "").strip()
            if role in ("user", "assistant") and content:
                trimmed.append({"role": role, "content": content[:char_limit]})
        return trimmed

    async def _load_reasoning_mode(self, chatbot_id: str) -> str:
        try:
            from services.chatbot_service import get_chatbot_service
            chatbot = await get_chatbot_service().get(chatbot_id)
            if chatbot:
                chatbot_settings = chatbot.get("settings") or {}
                mode = chatbot_settings.get("reasoning_mode", settings.default_reasoning_mode)
                if mode in ("fast_rag", "multi_step", "research", "expert_review"):
                    return mode
        except Exception as exc:
            logger.debug("Could not load chatbot settings for reasoning_mode: %s", exc)
        return settings.default_reasoning_mode

    async def _load_session_context(self, session_id: str, state: RAGState) -> dict:
        if not session_id:
            return {}

        # Try Redis cache first
        try:
            from services.cache_service import get_cache_service
            cache = get_cache_service()
            cached = await cache.get_session(session_id)
            if cached:
                cached["_from_cache"] = True
                return cached
        except Exception as exc:
            logger.debug("Session cache lookup failed: %s", exc)

        # Fallback: build context from in-memory messages
        try:
            messages = state.get("messages", [])
            recent = []
            for msg in messages[-6:]:
                role = msg.get("role", msg.get("type", ""))
                content = msg.get("content", "")
                if role in ("user", "human") and content:
                    recent.append(content[:200])

            context = {
                "recent_queries": recent[-3:],
                "turn_count": len([m for m in messages if m.get("role") in ("user", "human")]),
                "_from_cache": False,
            }

            # Persist to cache for next turn
            try:
                from services.cache_service import get_cache_service
                cache = get_cache_service()
                await cache.set_session(session_id, context)
            except Exception:
                pass

            return context

        except Exception as exc:
            logger.debug("Session context build failed: %s", exc)
            return {}
