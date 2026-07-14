"""
Research Gap Analyzer Agent: identifies unanswered sub-questions after initial
retrieval and sets state["research_gaps"] for a second retrieval pass.
Used only in reasoning_mode=research.
"""
import json
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config.logging_config import get_logger

logger = get_logger(__name__)

_GAP_PROMPT = """You are a research quality evaluator.

Analyze whether the retrieved documents adequately answer the user's question.
Identify specific information gaps — aspects of the question that are not answered.

User question: {query}

Retrieved content summary:
{content_summary}

Instructions:
- List only SPECIFIC, searchable gaps (not vague feedback)
- Maximum 3 gaps
- If the question is fully answered, return an empty list
- Return ONLY valid JSON

JSON format:
{{"gaps": ["gap 1", "gap 2"]}}

JSON:"""


@register_agent(
    agent_id="research_gap_analyzer",
    name="Research Gap Analyzer",
    capabilities=["gap_analysis", "research", "iterative_retrieval"],
    description="Identifies unanswered sub-questions in research mode for additional retrieval",
)
class ResearchGapAnalyzerAgent(BaseAgent):

    async def execute(self, state: RAGState) -> RAGState:
        query = state.get("query_rewritten") or state.get("query", "")
        reranked = state.get("reranked_results", [])

        update_agent_execution(
            state, self.agent_id, self.agent_name, "running",
            {"query": query, "n_results": len(reranked)},
        )

        # Cap at 1 additional retrieval pass to prevent infinite loops
        meta = state.get("metadata", {}) or {}
        if meta.get("gap_analysis_pass", 0) >= 1:
            state["research_gaps"] = []
            update_agent_execution(
                state, self.agent_id, self.agent_name, "completed",
                {}, {"gaps": [], "reason": "max_iterations_reached"},
            )
            return state

        if not reranked:
            state["research_gaps"] = []
            update_agent_execution(
                state, self.agent_id, self.agent_name, "completed",
                {}, {"gaps": 0, "reason": "no results to analyze"},
            )
            return state

        # Build content summary (first 300 chars per result)
        summary_parts = []
        for i, doc in enumerate(reranked[:5], 1):
            content = doc.get("content", "")[:300]
            source = doc.get("source_name") or doc.get("filename") or f"doc_{i}"
            summary_parts.append(f"[{source}]: {content}")
        content_summary = "\n".join(summary_parts)

        try:
            from services.llm_service import get_llm_service
            prompt = _GAP_PROMPT.format(query=query, content_summary=content_summary)
            llm = get_llm_service()
            response = await llm.generate(prompt, temperature=0.1, max_tokens=400)

            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                data = json.loads(response[json_start:json_end])
                gaps = data.get("gaps", [])
                # Merge gaps into a single follow-up query for the second retrieval pass
                if gaps and isinstance(gaps, list):
                    valid_gaps = [g for g in gaps if isinstance(g, str) and g.strip()][:3]
                    state["research_gaps"] = valid_gaps
                    # Update the rewritten query to also cover the gaps
                    if valid_gaps:
                        gap_context = "; ".join(valid_gaps)
                        state["query_rewritten"] = f"{query}. Specifically: {gap_context}"
                    # Track iteration count
                    meta = state.get("metadata", {}) or {}
                    meta["gap_analysis_pass"] = meta.get("gap_analysis_pass", 0) + 1
                    state["metadata"] = meta
                    update_agent_execution(
                        state, self.agent_id, self.agent_name, "completed",
                        {"query": query},
                        {"gaps": valid_gaps},
                    )
                    return state

        except Exception as exc:
            logger.warning("Gap analysis failed: %s", exc)

        # Mark this pass so second run clears gaps (prevents infinite loop)
        meta = state.get("metadata", {}) or {}
        meta["gap_analysis_pass"] = meta.get("gap_analysis_pass", 0) + 1
        state["metadata"] = meta

        state["research_gaps"] = []
        update_agent_execution(
            state, self.agent_id, self.agent_name, "completed",
            {"query": query}, {"gaps": []},
        )
        return state
