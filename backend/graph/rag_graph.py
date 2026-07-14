"""
V2 RAG LangGraph — reasoning-mode-aware pipeline with parallel start,
hybrid retrieval, confidence-based routing, context compression, and
4 reasoning modes (fast_rag, multi_step, research, expert_review).
"""
import uuid
import time
from typing import Optional

from langgraph.graph import StateGraph, START, END
from config.logging_config import get_logger
from graph.state import RAGState, create_initial_state
from agents.registry import AgentRegistry
import agents  # noqa: F401 — triggers @register_agent decorators
from graph.edges import (
    route_by_reasoning_mode,
    route_after_reranker,
    route_after_gap_analysis,
    route_by_confidence,
    route_after_compression,
    route_after_improvement,
    route_after_synthesis,
    route_after_groundedness,
)

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Thin passthrough node used as the parallel-join point
# ---------------------------------------------------------------------------

async def _reasoning_router(state: RAGState) -> RAGState:
    """No-op passthrough between the sequential start and reasoning-mode routing."""
    return state


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------

def build_rag_graph():
    """Build and compile the V2 RAG StateGraph."""
    workflow = StateGraph(RAGState)

    # ---- Register all agent nodes ----------------------------------------
    nodes = AgentRegistry.get_all_nodes()
    for agent_id, node_func in nodes.items():
        node_name = "url_process" if agent_id == "url_processing" else agent_id
        workflow.add_node(node_name, node_func)
        logger.debug("Registered node: %s", node_name)

    # ---- Add the passthrough join node ------------------------------------
    workflow.add_node("reasoning_router", _reasoning_router)

    # ---- Sequential start -------------------------------------------------
    # query_rewriter and session_loader both mutate state in place and return
    # the FULL state dict. If fanned out in parallel from START, each writes
    # every scalar channel (query, chatbot_id, ...) in the same super-step,
    # and scalar channels have no reducer -> INVALID_CONCURRENT_GRAPH_UPDATE.
    # Run them sequentially, then route from reasoning_router.
    workflow.add_edge(START, "query_rewriter")
    workflow.add_edge("query_rewriter", "session_loader")
    workflow.add_edge("session_loader", "reasoning_router")

    # ---- Route by reasoning mode ----------------------------------------
    workflow.add_conditional_edges(
        "reasoning_router",
        route_by_reasoning_mode,
        {
            "multi_step_planner": "multi_step_planner",
            "hybrid_retrieval": "hybrid_retrieval",
        },
    )

    # ---- Multi-step planner → retrieval ---------------------------------
    workflow.add_edge("multi_step_planner", "hybrid_retrieval")

    # ---- Retrieval → reranker -------------------------------------------
    workflow.add_edge("hybrid_retrieval", "reranker")

    # ---- Reranker → research gap analysis or confidence eval ------------
    workflow.add_conditional_edges(
        "reranker",
        route_after_reranker,
        {
            "research_gap_analyzer": "research_gap_analyzer",
            "confidence_evaluator": "confidence_evaluator",
        },
    )

    # ---- Gap analysis (research mode): optional second retrieval pass ---
    workflow.add_conditional_edges(
        "research_gap_analyzer",
        route_after_gap_analysis,
        {
            "hybrid_retrieval": "hybrid_retrieval",   # second pass if gaps found
            "confidence_evaluator": "confidence_evaluator",
        },
    )

    # ---- Confidence evaluation → web fallback or compression ------------
    workflow.add_conditional_edges(
        "confidence_evaluator",
        route_by_confidence,
        {
            "web_search": "web_search",
            "context_compressor": "context_compressor",
        },
    )

    # ---- Web fallback → synthesis ---------------------------------------
    workflow.add_edge("web_search", "response_synthesis")

    # ---- Context compression → expert-review or direct synthesis --------
    workflow.add_conditional_edges(
        "context_compressor",
        route_after_compression,
        {
            "draft_generator": "draft_generator",
            "response_synthesis": "response_synthesis",
        },
    )

    # ---- Expert Review pipeline -----------------------------------------
    workflow.add_edge("draft_generator", "answer_critiquer")
    workflow.add_edge("answer_critiquer", "answer_improver")
    workflow.add_conditional_edges(
        "answer_improver",
        route_after_improvement,
        {
            "response_synthesis": "response_synthesis",
            END: END,
        },
    )

    # ---- OCR / URL processing (special content types) -------------------
    # These bypass the retrieval pipeline; go straight to reranker
    workflow.add_edge("ocr", "reranker")
    workflow.add_edge("url_process", "reranker")

    # ---- Groundedness gate (fast_rag only) ------------------------------
    # fast_rag scores the answer vs. sources and may regenerate synthesis once;
    # expert_review ends via route_after_improvement, multi_step/research end here.
    workflow.add_conditional_edges(
        "response_synthesis",
        route_after_synthesis,
        {
            "groundedness_check": "groundedness_check",
            END: END,
        },
    )
    workflow.add_conditional_edges(
        "groundedness_check",
        route_after_groundedness,
        {
            "response_synthesis": "response_synthesis",
            END: END,
        },
    )

    app = workflow.compile()
    logger.info("V2 RAG graph compiled successfully")
    return app


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

_rag_graph = None


def get_rag_graph():
    global _rag_graph
    if _rag_graph is None:
        logger.info("Initializing V2 RAG graph...")
        _rag_graph = build_rag_graph()
    return _rag_graph


# ---------------------------------------------------------------------------
# Execution helpers (kept API-compatible with v1)
# ---------------------------------------------------------------------------

async def process_query(
    query: str,
    session_id: str = "default",
    chatbot_id: str = "default",
    system_prompt: str = "You are a helpful assistant.",
    has_knowledge_base: bool = True,
    config: Optional[dict] = None,
) -> RAGState:
    """Process a user query through the V2 RAG graph."""
    request_id = str(uuid.uuid4())
    initial_state = create_initial_state(
        query=query,
        session_id=session_id,
        request_id=request_id,
        chatbot_id=chatbot_id,
        system_prompt=system_prompt,
        has_knowledge_base=has_knowledge_base,
    )

    graph = get_rag_graph()
    if config is None:
        config = {"configurable": {"thread_id": session_id}}

    try:
        start = time.perf_counter()
        result = await graph.ainvoke(initial_state, config)
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        try:
            result["response_time_ms"] = int(result.get("response_time_ms", elapsed_ms))
        except Exception:
            result["response_time_ms"] = elapsed_ms
        logger.info("Query processed (chatbot=%s): %s…", chatbot_id, query[:50])
        return result
    except Exception as exc:
        logger.error("Error processing query: %s", exc)
        initial_state["error"] = str(exc)
        return initial_state


async def stream_query(
    query: str,
    session_id: str = "default",
    chatbot_id: str = "default",
    system_prompt: str = "You are a helpful assistant.",
    has_knowledge_base: bool = True,
    config: Optional[dict] = None,
):
    """Stream the V2 RAG graph execution, yielding per-node state updates."""
    request_id = str(uuid.uuid4())
    initial_state = create_initial_state(
        query=query,
        session_id=session_id,
        request_id=request_id,
        chatbot_id=chatbot_id,
        system_prompt=system_prompt,
        has_knowledge_base=has_knowledge_base,
    )

    graph = get_rag_graph()
    if config is None:
        config = {"configurable": {"thread_id": session_id}}

    final_state = None
    start = time.perf_counter()
    try:
        async for event in graph.astream(initial_state, config):
            yield event
            if isinstance(event, dict):
                for node_name, node_state in event.items():
                    if node_state:
                        final_state = node_state

        elapsed_ms = int((time.perf_counter() - start) * 1000)
        target = final_state if final_state else initial_state
        try:
            target["response_time_ms"] = int(target.get("response_time_ms", elapsed_ms))
        except Exception:
            pass
        yield {"__final_state__": True, "state": target}

    except Exception as exc:
        logger.error("Error streaming query: %s", exc)
        yield {"error": str(exc)}


def get_graph_visualization() -> str:
    return get_rag_graph().get_graph().print_ascii()


def print_graph():
    print(get_graph_visualization())
