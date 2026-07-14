"""
Graph edge routing functions for the V2 RAG pipeline.

Routing decisions are based on reasoning_mode and confidence_score,
not on intent classification.

Legacy functions (route_by_intent, validate_plan_route, should_rerank) are
kept at the bottom for reference but are not used by the new graph.
"""
from typing import Literal
from langgraph.graph import END
from graph.state import RAGState
from config.logging_config import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# After the sequential start (query_rewriter -> session_loader -> reasoning_router)
# ---------------------------------------------------------------------------

def route_by_reasoning_mode(
    state: RAGState,
) -> Literal["multi_step_planner", "hybrid_retrieval"]:
    """Route to planning or direct retrieval based on reasoning_mode."""
    mode = state.get("reasoning_mode", "fast_rag")
    if mode in ("multi_step", "research"):
        return "multi_step_planner"
    return "hybrid_retrieval"


# ---------------------------------------------------------------------------
# After reranker
# ---------------------------------------------------------------------------

def route_after_reranker(
    state: RAGState,
) -> Literal["research_gap_analyzer", "confidence_evaluator"]:
    """Research mode checks for gaps; all other modes go to confidence eval."""
    if state.get("reasoning_mode") == "research":
        return "research_gap_analyzer"
    return "confidence_evaluator"


# ---------------------------------------------------------------------------
# After research_gap_analyzer
# ---------------------------------------------------------------------------

def route_after_gap_analysis(
    state: RAGState,
) -> Literal["hybrid_retrieval", "confidence_evaluator"]:
    """If gaps found, trigger a second retrieval pass; otherwise proceed."""
    if state.get("reasoning_mode") == "research" and state.get("research_gaps"):
        return "hybrid_retrieval"
    return "confidence_evaluator"


# ---------------------------------------------------------------------------
# After confidence_evaluator
# ---------------------------------------------------------------------------

def route_by_confidence(
    state: RAGState,
) -> Literal["web_search", "context_compressor"]:
    """Low confidence → web fallback; high confidence → compress and generate."""
    if state.get("answer_source") == "web" or state.get("web_fallback_triggered"):
        return "web_search"
    return "context_compressor"


# ---------------------------------------------------------------------------
# After context_compressor
# ---------------------------------------------------------------------------

def route_after_compression(
    state: RAGState,
) -> Literal["draft_generator", "response_synthesis"]:
    """Expert Review mode routes through draft → critique → improve."""
    if state.get("reasoning_mode") == "expert_review":
        return "draft_generator"
    return "response_synthesis"


# ---------------------------------------------------------------------------
# After answer_improver (Expert Review mode)
# ---------------------------------------------------------------------------

def route_after_improvement(state: RAGState) -> str:
    """If final_response already set by answer_improver, end; else synthesize."""
    if state.get("final_response"):
        return END
    return "response_synthesis"


# ---------------------------------------------------------------------------
# After response_synthesis
# ---------------------------------------------------------------------------

def check_final_response(state: RAGState) -> str:
    """End if we have a response; avoid infinite retry on error."""
    if state.get("final_response"):
        return END
    if state.get("error"):
        return END
    return "response_synthesis"


# ---------------------------------------------------------------------------
# After response_synthesis (V2: groundedness gate for fast_rag)
# ---------------------------------------------------------------------------

def route_after_synthesis(state: RAGState) -> str:
    """fast_rag runs the groundedness gate; all other modes end immediately.

    (expert_review ends via route_after_improvement; multi_step/research end here.)
    """
    if state.get("error"):
        return END
    if state.get("reasoning_mode") == "fast_rag":
        return "groundedness_check"
    return END


def route_after_groundedness(state: RAGState) -> str:
    """Regenerate response_synthesis if the groundedness gate asked for a retry."""
    if state.get("should_retry"):
        return "response_synthesis"
    return END
