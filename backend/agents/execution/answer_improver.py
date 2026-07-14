"""
Answer Improver Agent (Expert Review mode): produces the final polished answer
by applying the critique to improve the draft.
"""
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config.logging_config import get_logger

logger = get_logger(__name__)

_IMPROVE_PROMPT = """You are an expert at refining AI-generated answers.

Given the original draft and a critique, produce a final, improved answer.
Fix all identified issues while preserving correct content.
Use ONLY information from the source context — do not add external facts.
Always answer in the same language the user used in their question — even if the source context is in a different language.

Source context:
{context}

User question: {query}

Original draft:
{draft}

Critique:
{critique}

Improved final answer:"""


@register_agent(
    agent_id="answer_improver",
    name="Answer Improver",
    capabilities=["answer_improvement", "expert_review"],
    description="Improves draft answer based on critique to produce final response",
)
class AnswerImproverAgent(BaseAgent):

    async def execute(self, state: RAGState) -> RAGState:
        query = state.get("query_rewritten") or state.get("query", "")
        draft = state.get("draft_answer", "")
        critique = state.get("critique", "")
        compressed = state.get("compressed_context", [])

        update_agent_execution(
            state, self.agent_id, self.agent_name, "running",
            {"has_draft": bool(draft), "has_critique": bool(critique)},
        )

        # If critique approves the draft as-is, skip improvement
        if critique.startswith("APPROVED"):
            state["final_response"] = draft
            update_agent_execution(
                state, self.agent_id, self.agent_name, "completed",
                {}, {"final_length": len(draft), "improvement": "skipped - approved"},
            )
            return state

        if not draft:
            state["final_response"] = None
            update_agent_execution(
                state, self.agent_id, self.agent_name, "completed",
                {}, {"final_length": 0, "improvement": "skipped - no draft"},
            )
            return state

        context_str = "\n\n".join(
            f"[{doc.get('source', f'Source {i+1}')}]: {doc.get('content', '')}"
            for i, doc in enumerate(compressed)
        )

        try:
            from services.llm_service import get_llm_service
            prompt = _IMPROVE_PROMPT.format(
                context=context_str[:4000],
                query=query,
                draft=draft[:2000],
                critique=critique[:800],
            )
            llm = get_llm_service()
            improved = await llm.generate(prompt, temperature=0.3, max_tokens=2000)
            state["final_response"] = improved.strip()
        except Exception as exc:
            logger.error("Answer improvement failed, falling back to draft: %s", exc)
            state["final_response"] = draft  # fallback to draft

        update_agent_execution(
            state, self.agent_id, self.agent_name, "completed",
            {},
            {"final_length": len(state.get("final_response") or "")},
        )
        return state
