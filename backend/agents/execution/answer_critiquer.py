"""
Answer Critiquer Agent (Expert Review mode): critiques the draft answer
for factual accuracy, completeness, and clarity against the source context.
"""
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config.logging_config import get_logger

logger = get_logger(__name__)

_CRITIQUE_PROMPT = """You are a critical reviewer for an AI assistant.

Review the draft answer below against the source context. Identify specific issues:

1. FACTUAL ERRORS: Claims not supported by the context
2. MISSING INFORMATION: Important facts from the context not included
3. CLARITY ISSUES: Vague, ambiguous, or poorly structured parts
4. HALLUCINATIONS: Any information not present in the context

Source context:
{context}

User question: {query}

Draft answer:
{draft}

Provide a concise critique (bullet points). If the draft is already good, say "APPROVED - no significant issues."

Critique:"""


@register_agent(
    agent_id="answer_critiquer",
    name="Answer Critiquer",
    capabilities=["critique", "quality_review", "expert_review"],
    description="Critiques draft answer for accuracy, completeness, and clarity",
)
class AnswerCritiquerAgent(BaseAgent):

    async def execute(self, state: RAGState) -> RAGState:
        query = state.get("query_rewritten") or state.get("query", "")
        draft = state.get("draft_answer", "")
        compressed = state.get("compressed_context", [])

        update_agent_execution(
            state, self.agent_id, self.agent_name, "running",
            {"draft_length": len(draft)},
        )

        if not draft:
            state["critique"] = "No draft to critique."
            update_agent_execution(
                state, self.agent_id, self.agent_name, "completed",
                {}, {"critique": "skipped - no draft"},
            )
            return state

        context_str = "\n\n".join(
            f"[{doc.get('source', f'Source {i+1}')}]: {doc.get('content', '')}"
            for i, doc in enumerate(compressed)
        )

        try:
            from services.llm_service import get_llm_service
            prompt = _CRITIQUE_PROMPT.format(
                context=context_str[:4000], query=query, draft=draft[:2000]
            )
            llm = get_llm_service()
            critique = await llm.generate(prompt, temperature=0.2, max_tokens=600)
            state["critique"] = critique.strip()
        except Exception as exc:
            logger.error("Answer critique failed: %s", exc)
            state["critique"] = "Critique unavailable due to error."

        update_agent_execution(
            state, self.agent_id, self.agent_name, "completed",
            {"draft_length": len(draft)},
            {"critique_length": len(state["critique"])},
        )
        return state
