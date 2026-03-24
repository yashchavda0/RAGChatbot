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
    """
    Route to appropriate agent based on classified intent.
    """
    intent = state.get("intent", "")
    confidence = state.get("intent_confidence", 0.0)

    logger.info(f"Routing by intent: {intent} (confidence: {confidence})")

    # Low confidence - go to planning
    if confidence < 0.5:
        logger.info("Low confidence, routing to plan generator")
        return "plan_generator"

    # Route based on intent
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
        # Default to document search for unknown intents
        return "document_search"


def validate_plan_route(state: RAGState) -> Literal["execute_plan", "regenerate_plan", "end"]:
    """
    Route after plan validation.
    """
    is_valid = state.get("plan_validated", False)
    notes = state.get("plan_validation_notes", "")

    logger.info(f"Plan validation route: valid={is_valid}, notes={notes}")

    if is_valid:
        return "execute_plan"
    else:
        # Check retry count
        retry_count = state.get("retry_count", 0)
        if retry_count < 2:
            state["retry_count"] = retry_count + 1
            return "regenerate_plan"
        else:
            # Too many retries, proceed with fallback
            logger.warning("Max retries reached, using fallback")
            return "execute_plan"


def should_rerank(state: RAGState) -> Literal["reranker", "response_synthesis"]:
    """
    Determine if reranking is needed.
    """
    documents_count = len(state.get("documents", []))
    web_results_count = len(state.get("web_results", []))
    ocr_count = len(state.get("ocr_results", []))
    url_count = len(state.get("url_results", []))

    total_results = documents_count + web_results_count + ocr_count + url_count

    # Rerank if we have results from multiple sources or many results
    if total_results > 5 or (documents_count > 0 and web_results_count > 0):
        return "reranker"
    else:
        return "response_synthesis"


def has_error(state: RAGState) -> Literal["end", "continue"]:
    """
    Check if there's a critical error that should stop execution.
    """
    error = state.get("error")

    if error and "critical" in error.lower():
        logger.error(f"Critical error encountered: {error}")
        return "end"
    else:
        return "continue"


def check_final_response(state: RAGState) -> Literal["end", "reranker"]:
    """
    Check if we have a final response or need to rerank.
    """
    final_response = state.get("final_response")

    if final_response:
        return "end"
    else:
        # No response yet, might need to try different path
        reranked = state.get("reranked_results")

        if not reranked:
            # Try reranking if not done yet
            return "reranker"
        else:
            # Should have response by now
            return "end"


# =============================================================================
# WORKFLOW EXECUTION EDGE (for complex plans)
# =============================================================================

async def execute_plan_workflow(state: RAGState) -> RAGState:
    """
    Execute a complex plan by following the node graph.
    This function orchestrates execution based on the plan structure.
    """
    from graph.nodes import (
        document_search_node,
        web_search_node,
        ocr_node,
        url_processing_node,
        reranker_node,
        response_synthesis_node,
    )

    plan = state.get("plan", {})
    nodes = plan.get("nodes", [])
    entry_node = plan.get("entry_node", "")

    # Map agent IDs to node functions
    agent_functions = {
        "document_search": document_search_node,
        "web_search": web_search_node,
        "ocr": ocr_node,
        "url_process": url_processing_node,
        "reranker": reranker_node,
        "response_synthesis": response_synthesis_node,
    }

    # Track executed nodes and their results
    executed_nodes = {}
    node_results = {}

    # Find nodes in execution order (respect dependencies)
    def get_execution_order(nodes, entry_node):
        """Get nodes in topological order."""
        order = []
        visited = set()

        def visit(node_id):
            if node_id in visited:
                return
            visited.add(node_id)

            # Find node
            node = next((n for n in nodes if n["node_id"] == node_id), None)
            if node:
                # Visit dependencies first
                for dep in node.get("dependencies", []):
                    visit(dep)
                order.append(node)

        visit(entry_node)
        return order

    try:
        execution_order = get_execution_order(nodes, entry_node)

        logger.info(f"Executing plan with {len(execution_order)} nodes")

        for node in execution_order:
            agent_id = node.get("agent_id")
            node_id = node.get("node_id")

            logger.info(f"Executing node {node_id}: {agent_id}")

            if agent_id in agent_functions:
                # Execute the node function
                node_func = agent_functions[agent_id]
                state = await node_func(state)
                executed_nodes[node_id] = True

                # Check for errors
                if state.get("error"):
                    logger.warning(f"Node {node_id} encountered error: {state['error']}")

        # After executing all nodes, ensure we have a final response
        if not state.get("final_response"):
            # Force response synthesis
            state = await response_synthesis_node(state)

    except Exception as e:
        logger.error(f"Error executing plan: {e}")
        state["error"] = str(e)

    return state


# =============================================================================
# EDGE CONDITIONS FOR WEBSOCKET UPDATES
# =============================================================================

def should_send_update(state: RAGState) -> bool:
    """
    Determine if a WebSocket update should be sent.
    """
    # Send update when:
    # - An agent completes execution
    # - Final response is ready
    # - Error occurs

    return (
        state.get("current_agent") is not None
        or state.get("final_response") is not None
        or state.get("error") is not None
    )


def get_execution_progress(state: RAGState) -> dict:
    """
    Get current execution progress for WebSocket updates.
    """
    total_agents = len(state.get("agent_executions", []))
    completed_agents = sum(
        1 for e in state.get("agent_executions", [])
        if e.get("status") in ["completed", "failed"]
    )

    return {
        "session_id": state.get("session_id"),
        "request_id": state.get("request_id"),
        "current_agent": state.get("current_agent"),
        "total_agents": total_agents,
        "completed_agents": completed_agents,
        "progress": completed_agents / max(total_agents, 1) * 100,
        "has_response": state.get("final_response") is not None,
        "has_error": state.get("error") is not None,
    }
