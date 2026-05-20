"""
Main LangGraph StateGraph for the RAG chatbot system.
This file defines the complete agent workflow graph.

Agents are auto-registered via the AgentRegistry system.
Importing agents module triggers registration of all agents.
"""
import uuid
from typing import Optional
from langgraph.graph import StateGraph, END
from config import settings
from config.logging_config import get_logger
from graph.state import RAGState, create_initial_state
from agents.registry import AgentRegistry
# Import agents to trigger auto-registration
import agents
from graph.edges import (
    route_by_intent,
    validate_plan_route,
    should_rerank,
    check_final_response,
)

logger = get_logger(__name__)


# =============================================================================
# GRAPH BUILDER
# =============================================================================

def build_rag_graph():
    """
    Build and compile the RAG LangGraph.

    Returns:
        Compiled StateGraph ready for invocation.
    """
    # Create the state graph
    workflow = StateGraph(RAGState)

    # ========================================================================
    # ADD NODES (from AgentRegistry)
    # ========================================================================

    # Get all registered agents as LangGraph nodes
    nodes = AgentRegistry.get_all_nodes()

    # Add all nodes to the workflow
    for agent_id, node_func in nodes.items():
        # Map agent_id to the node name used in the graph
        # url_processing agent -> url_process node name
        node_name = "url_process" if agent_id == "url_processing" else agent_id
        workflow.add_node(node_name, node_func)
        logger.info(f"Added node: {node_name} -> agent: {agent_id}")

    # ========================================================================
    # ADD EDGES (ROUTING)
    # ========================================================================

    # Entry point
    workflow.set_entry_point("intent_classifier")

    # After intent classification, route based on intent
    workflow.add_conditional_edges(
        "intent_classifier",
        route_by_intent,
        {
            "document_search": "document_search",
            "web_search": "web_search",
            "ocr": "ocr",
            "url_process": "url_process",
            "plan_generator": "plan_generator",
        },
    )

    # After plan generation, go to validation
    workflow.add_edge("plan_generator", "plan_validator")

    # After plan validation, check if valid
    workflow.add_conditional_edges(
        "plan_validator",
        validate_plan_route,
        {
            "execute_plan": "document_search",  # Start execution with document search
            "regenerate_plan": "plan_generator",
        },
    )

    # After direct execution nodes, decide whether to rerank
    workflow.add_conditional_edges(
        "document_search",
        should_rerank,
        {
            "reranker": "reranker",
            "response_synthesis": "response_synthesis",
        },
    )

    workflow.add_conditional_edges(
        "web_search",
        should_rerank,
        {
            "reranker": "reranker",
            "response_synthesis": "response_synthesis",
        },
    )

    # OCR and URL processing always go to reranker
    workflow.add_edge("ocr", "reranker")
    workflow.add_edge("url_process", "reranker")

    # After reranker, go to response synthesis
    workflow.add_edge("reranker", "response_synthesis")

    # After response synthesis, check if we need to retry or end
    workflow.add_conditional_edges(
        "response_synthesis",
        check_final_response,
        {
            "end": END,
            "reranker": "reranker",
        },
    )

    # Compile the graph (no checkpointer for simplicity)
    app = workflow.compile()

    logger.info("RAG LangGraph compiled successfully")

    return app


# =============================================================================
# GLOBAL GRAPH INSTANCE
# =============================================================================

# Global graph instance
_rag_graph = None


def get_rag_graph():
    """
    Get or create the global RAG graph instance.

    Returns:
        Compiled StateGraph.
    """
    global _rag_graph

    if _rag_graph is None:
        logger.info("Initializing RAG graph...")
        _rag_graph = build_rag_graph()

    return _rag_graph


# =============================================================================
# GRAPH EXECUTION FUNCTIONS
# =============================================================================

async def process_query(
    query: str,
    session_id: str = "default",
    chatbot_id: str = "default",
    system_prompt: str = "You are a helpful assistant.",
    has_knowledge_base: bool = True,
    config: Optional[dict] = None,
) -> RAGState:
    """
    Process a user query through the RAG graph.

    Args:
        query: User's query string
        session_id: Session identifier for conversation memory
        chatbot_id: Chatbot ID for knowledge base filtering
        system_prompt: System prompt for the LLM
        has_knowledge_base: Whether chatbot has indexed documents
        config: Optional configuration for graph execution

    Returns:
        Final state after graph execution.
    """
    logger.info(f"Processing query for chatbot {chatbot_id}, session {session_id}: {query[:50]}...")

    # Generate request ID
    request_id = str(uuid.uuid4())

    # Create initial state
    initial_state = create_initial_state(
        query=query,
        session_id=session_id,
        request_id=request_id,
        chatbot_id=chatbot_id,
        system_prompt=system_prompt,
        has_knowledge_base=has_knowledge_base,
    )

    # Get the graph
    graph = get_rag_graph()

    # Configure execution
    if config is None:
        config = {
            "configurable": {
                "thread_id": session_id,
            }
        }

    # Run the graph
    try:
        result = await graph.ainvoke(initial_state, config)

        logger.info(f"Query processed. Final response: {result.get('final_response', '')[:50]}...")

        return result

    except Exception as e:
        logger.error(f"Error processing query: {e}")
        initial_state["error"] = str(e)
        return initial_state


async def stream_query(
    query: str,
    session_id: str = "default",
    chatbot_id: str = "default",
    system_prompt: str = "You are a helpful assistant.",
    has_knowledge_base: bool = True,
    config: Optional[dict] = None,
):
    """
    Stream the execution of a query through the RAG graph.
    Yields state updates as agents execute, then yields final state.

    Args:
        query: User's query string
        session_id: Session identifier for conversation memory
        chatbot_id: Chatbot ID for knowledge base filtering
        system_prompt: System prompt for the LLM
        has_knowledge_base: Whether chatbot has indexed documents
        config: Optional configuration for graph execution

    Yields:
        State updates during graph execution, with final state marked.
    """
    logger.info(f"Streaming query for chatbot {chatbot_id}, session {session_id}: {query[:50]}...")

    # Generate request ID
    request_id = str(uuid.uuid4())

    # Create initial state
    initial_state = create_initial_state(
        query=query,
        session_id=session_id,
        request_id=request_id,
        chatbot_id=chatbot_id,
        system_prompt=system_prompt,
        has_knowledge_base=has_knowledge_base,
    )

    # Get the graph
    graph = get_rag_graph()

    # Configure execution
    if config is None:
        config = {
            "configurable": {
                "thread_id": session_id,
            }
        }

    # Stream the graph execution and track final state
    final_state = None
    try:
        async for event in graph.astream(initial_state, config):
            yield event
            # Track the latest state from events
            if isinstance(event, dict):
                # Single node result contains the updated state
                for node_name, node_state in event.items():
                    if node_state:
                        final_state = node_state

        # Yield final state with a marker
        if final_state:
            yield {"__final_state__": True, "state": final_state}
        else:
            # If no final state was captured, return initial state
            yield {"__final_state__": True, "state": initial_state}

    except Exception as e:
        logger.error(f"Error streaming query: {e}")
        yield {"error": str(e)}


# =============================================================================
# GRAPH VISUALIZATION
# =============================================================================

def get_graph_visualization() -> str:
    """
    Get a printable representation of the graph structure.

    Returns:
        ASCII art representation of the graph.
    """
    graph = get_rag_graph()

    # Get the graph structure
    graph_dict = graph.get_graph().print_ascii()

    return graph_dict


def print_graph():
    """Print the graph structure to console."""
    print(get_graph_visualization())
