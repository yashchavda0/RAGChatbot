"""
LangGraph conditional edge functions for routing between nodes.
These functions determine which node to execute next based on the current state.
"""
from typing import Literal
from graph.state import RAGState, IntentType
from config.logging_config import get_logger

logger = get_logger(__name__)


# =============================================================================
# CONDITIONAL EDGE FUNCTIONS
# =============================================================================

def route_by_intent(state: RAGState) -> Literal["document_search", "web_search", "ocr", "url_process", "plan_generator", "end"]:
    """Route to appropriate agent based on classified intent."""
    intent = state.get("intent", "")
    confidence = state.get("intent_confidence", 0.0)

    logger.info(f"Routing by intent: {intent} (confidence: {confidence})")

    if confidence < 0.5:
        logger.info("Low confidence, routing to plan generator")
        return "plan_generator"

    if intent == IntentType.DOCUMENT_SEARCH:
        return "document_search"
    elif intent == IntentType.WEB_SEARCH:
        return "web_search"
    elif intent == IntentType.OCR:
        return "ocr"
    elif intent == IntentType.URL_PROCESS:
        return "url_process"
    elif intent == IntentType.COMPLEX:
        return "plan_generator"
    else:
        return "document_search"


def validate_plan_route(state: RAGState) -> Literal["execute_plan", "regenerate_plan", "end"]:
    """Route after plan validation."""
    is_valid = state.get("plan_validated", False)

    logger.info(f"Plan validation route: valid={is_valid}")

    if is_valid:
        return "execute_plan"
    else:
        retry_count = state.get("retry_count", 0)
        if retry_count < 2:
            state["retry_count"] = retry_count + 1
            return "regenerate_plan"
        else:
            logger.warning("Max retries reached, using fallback")
            return "execute_plan"


def should_rerank(state: RAGState) -> Literal["reranker", "response_synthesis"]:
    """Determine if reranking is needed."""
    documents_count = len(state.get("documents", []))
    web_results_count = len(state.get("web_results", []))
    ocr_count = len(state.get("ocr_results", []))
    url_count = len(state.get("url_results", []))

    total_results = documents_count + web_results_count + ocr_count + url_count

    if total_results > 5 or (documents_count > 0 and web_results_count > 0):
        return "reranker"
    else:
        return "response_synthesis"


def check_final_response(state: RAGState) -> Literal["end", "reranker"]:
    """Check if we have a final response or need to rerank."""
    final_response = state.get("final_response")

    if final_response:
        return "end"
    else:
        reranked = state.get("reranked_results")
        if not reranked:
            return "reranker"
        else:
            return "end"
