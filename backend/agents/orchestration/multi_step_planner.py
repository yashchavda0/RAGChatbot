"""
Multi-Step Planner Agent: decomposes complex queries into ordered retrieval steps.
Used for reasoning_mode in {multi_step, research}.
"""
import json
import re
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config.logging_config import get_logger

logger = get_logger(__name__)

_PLAN_PROMPT = """You are an expert query decomposer for a RAG retrieval system.

Break the user's question into ordered retrieval steps. Each step should retrieve
information needed to answer a specific sub-question.

Rules:
- Each step must have a focused, standalone sub-query
- Steps must be ordered by dependency (step 2 may depend on step 1)
- Maximum 4 steps
- Return ONLY valid JSON

User question: {query}

Return JSON in this exact format:
{{
  "steps": [
    {{"step_id": 1, "sub_query": "...", "purpose": "..."}}
  ]
}}

JSON:"""

_FALLBACK_STEPS = [
    {"step_id": 1, "sub_query": "{query}", "purpose": "Primary information retrieval"},
]


@register_agent(
    agent_id="multi_step_planner",
    name="Multi-Step Planner",
    capabilities=["planning", "query_decomposition", "multi_step", "research"],
    description="Decomposes complex queries into ordered retrieval steps",
)
class MultiStepPlannerAgent(BaseAgent):

    async def execute(self, state: RAGState) -> RAGState:
        query = state.get("query_rewritten") or state.get("query", "")
        reasoning_mode = state.get("reasoning_mode", "multi_step")

        update_agent_execution(
            state, self.agent_id, self.agent_name, "running",
            {"query": query, "reasoning_mode": reasoning_mode},
        )

        try:
            from services.llm_service import get_llm_service
            prompt = _PLAN_PROMPT.format(query=query)
            llm = get_llm_service()
            response = await llm.generate(prompt, temperature=0.1, max_tokens=600)

            # Extract JSON from response
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                plan_data = json.loads(response[json_start:json_end])
                steps = plan_data.get("steps", [])
                if steps and isinstance(steps, list):
                    # Validate step format
                    validated = []
                    for step in steps[:4]:
                        if isinstance(step, dict) and "sub_query" in step:
                            validated.append({
                                "step_id": step.get("step_id", len(validated) + 1),
                                "sub_query": step["sub_query"],
                                "purpose": step.get("purpose", ""),
                            })
                    if validated:
                        state["plan_steps"] = validated
                        update_agent_execution(
                            state, self.agent_id, self.agent_name, "completed",
                            {"query": query},
                            {"n_steps": len(validated), "steps": [s["sub_query"] for s in validated]},
                        )
                        return state
        except Exception as exc:
            logger.warning("Multi-step planning failed, using single step: %s", exc)

        # Fallback to single-step plan
        fallback = [{"step_id": 1, "sub_query": query, "purpose": "Direct retrieval"}]
        state["plan_steps"] = fallback
        update_agent_execution(
            state, self.agent_id, self.agent_name, "completed",
            {"query": query},
            {"n_steps": 1, "fallback": True},
        )
        return state
