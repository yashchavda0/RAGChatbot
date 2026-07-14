"""
Confidence Evaluator Agent: evaluates post-rerank confidence and decides
whether to answer from documents or trigger web search fallback.
Pure logic — no LLM call required.
"""
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config.settings import settings
from config.logging_config import get_logger
from services.observability import get_observability_service

logger = get_logger(__name__)


@register_agent(
    agent_id="confidence_evaluator",
    name="Confidence Evaluator",
    capabilities=["confidence_scoring", "fallback_routing"],
    description="Evaluates reranker scores to decide document vs web search path",
)
class ConfidenceEvaluatorAgent(BaseAgent):

    async def execute(self, state: RAGState) -> RAGState:
        reranker_top_score = state.get("reranker_top_score", 0.0)
        reranked = state.get("reranked_results", [])
        has_kb = state.get("has_knowledge_base", True)

        update_agent_execution(
            state, self.agent_id, self.agent_name, "running",
            {"reranker_top_score": reranker_top_score, "n_results": len(reranked)},
        )

        threshold = settings.confidence_threshold
        obs = get_observability_service()
        trace_id = state.get("langsmith_trace_id", "")

        # If no knowledge base, always fall back to web
        if not has_kb or not reranked:
            confidence_score = 0.0
            answer_source = "web"
            web_fallback = True
        elif reranker_top_score >= threshold:
            confidence_score = reranker_top_score
            answer_source = "documents"
            web_fallback = False
        else:
            confidence_score = reranker_top_score
            answer_source = "web"
            web_fallback = True

        state["confidence_score"] = confidence_score
        state["answer_source"] = answer_source
        state["web_fallback_triggered"] = web_fallback
        # Propagate to legacy field
        state["from_web_search_only"] = web_fallback

        obs.log_confidence(trace_id, confidence_score, answer_source)
        logger.info(
            "Confidence: %.3f (threshold=%.2f) → source=%s",
            confidence_score, threshold, answer_source,
        )

        update_agent_execution(
            state, self.agent_id, self.agent_name, "completed",
            {"reranker_top_score": reranker_top_score},
            {
                "confidence_score": round(confidence_score, 4),
                "answer_source": answer_source,
                "web_fallback_triggered": web_fallback,
            },
        )
        return state
