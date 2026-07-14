"""
LangGraph state definitions for the RAG chatbot system.
Defines the state structure that flows through the agent graph.
"""

from typing import TypedDict, List, Dict, Any, Optional, Annotated
from langgraph.graph import add_messages


class IntentType:
    """Intent types for query classification (kept for backward compatibility)."""

    DOCUMENT_SEARCH = "document_search"
    WEB_SEARCH = "web_search"
    OCR = "ocr"
    URL_PROCESS = "url_process"
    COMPLEX = "complex"


class ReasoningMode:
    """Reasoning mode constants for the enhanced pipeline."""

    FAST_RAG = "fast_rag"
    MULTI_STEP = "multi_step"
    RESEARCH = "research"
    EXPERT_REVIEW = "expert_review"


class RAGState(TypedDict):
    """
    Main state for the RAG LangGraph.
    This state flows through all nodes and gets updated at each step.
    """

    # Core query and messages
    messages: Annotated[
        List[Dict[str, Any]], add_messages
    ]  # LangGraph message annotation
    query: str  # Original user query

    # Chatbot context (multi-tenant)
    chatbot_id: str  # Chatbot ID for knowledge base filtering
    system_prompt: str  # Custom system prompt for this chatbot
    has_knowledge_base: bool  # Whether chatbot has indexed documents

    # --- V2 Pipeline fields ---

    # Query rewriting
    original_query: str  # Preserved original query before rewriting
    query_rewritten: str  # Retrieval-optimized version of the query

    # Reasoning mode (loaded from chatbot settings by session_loader)
    reasoning_mode: str  # fast_rag | multi_step | research | expert_review

    # Session context (loaded by session_loader)
    session_context: Dict[str, Any]  # {summary, recent_queries, recent_sources}

    # Conversation history (loaded by session_loader from Postgres)
    conversation_history: List[Dict[str, Any]]  # [{role, content}, ...] prior turns

    # Hybrid retrieval candidates (top 30 before reranking)
    retrieval_candidates: List[Dict[str, Any]]
    retrieval_latency_ms: float

    # Reranker outputs
    reranker_scores: List[float]
    reranker_top_score: float

    # Confidence evaluation
    confidence_score: float
    answer_source: str  # "documents" | "web"
    web_fallback_triggered: bool

    # Context compression (top 5 compressed chunks)
    compressed_context: List[Dict[str, Any]]

    # Multi-step / Research mode
    plan_steps: List[Dict[str, Any]]  # [{step_id, sub_query, purpose}]
    step_results: List[Dict[str, Any]]  # [{step_id, documents, score}]
    research_gaps: List[str]
    verified_findings: List[Dict[str, Any]]

    # Expert Review mode
    draft_answer: str
    critique: str

    # Cache tracking
    cache_hits: Dict[str, bool]  # {embedding, retrieval, response, session}

    # Timing
    generation_latency_ms: float

    # Observability
    langsmith_trace_id: str

    # --- Legacy / kept for backward compatibility ---

    # Intent classification (unused in v2 pipeline, kept for old agents)
    intent: str
    intent_confidence: float

    # Plan (for complex queries, legacy)
    plan: Optional[Dict[str, Any]]
    plan_validated: bool
    plan_validation_notes: Optional[str]

    # Document search results (populated by hybrid_retrieval, legacy field name)
    documents: List[Dict[str, Any]]
    low_relevance: bool
    max_document_score: float

    # Web search results
    web_results: List[Dict[str, Any]]

    # OCR results
    ocr_results: List[Dict[str, Any]]

    # URL processing results
    url_results: List[Dict[str, Any]]

    # Reranked results
    reranked_results: List[Dict[str, Any]]  # Results after reranking (top 5)

    # Groundedness gate (fast_rag): embedding-based answer-vs-source relevancy
    groundedness_score: float
    should_retry: bool  # True → regenerate response_synthesis (bounded by retry_count)

    # Final response
    final_response: Optional[str]
    fallback_reason: Optional[str]
    suggested_questions: List[str]
    response_sources: List[Dict[str, Any]]
    from_web_search_only: bool  # True if response is from web search only
    token_usage: Dict[str, Any]

    # Agent execution tracking
    agent_executions: List[Dict[str, Any]]
    current_agent: Optional[str]

    # Session and metadata
    session_id: str
    request_id: str
    metadata: Dict[str, Any]

    # Error handling
    error: Optional[str]
    retry_count: int


class AgentExecution(TypedDict):
    """Record of an agent execution."""

    agent_id: str
    agent_name: str
    status: str
    input_data: Dict[str, Any]
    output_data: Dict[str, Any]
    started_at: str
    completed_at: Optional[str]
    execution_time_ms: Optional[int]
    error_message: Optional[str]


def create_initial_state(
    query: str,
    session_id: str,
    request_id: str,
    chatbot_id: str = "default",
    system_prompt: str = "You are a helpful assistant.",
    has_knowledge_base: bool = True,
) -> RAGState:
    """Create initial state for a new query."""
    return {
        # Core
        "messages": [],
        "query": query,
        "chatbot_id": chatbot_id,
        "system_prompt": system_prompt,
        "has_knowledge_base": has_knowledge_base,
        # V2 pipeline fields
        "original_query": query,
        "query_rewritten": "",
        "reasoning_mode": "fast_rag",
        "session_context": {},
        "conversation_history": [],
        "retrieval_candidates": [],
        "retrieval_latency_ms": 0.0,
        "reranker_scores": [],
        "reranker_top_score": 0.0,
        "confidence_score": 0.0,
        "answer_source": "documents",
        "web_fallback_triggered": False,
        "compressed_context": [],
        "plan_steps": [],
        "step_results": [],
        "research_gaps": [],
        "verified_findings": [],
        "draft_answer": "",
        "critique": "",
        "cache_hits": {},
        "generation_latency_ms": 0.0,
        "langsmith_trace_id": "",
        # Legacy fields
        "intent": "",
        "intent_confidence": 0.0,
        "plan": None,
        "plan_validated": False,
        "plan_validation_notes": None,
        "documents": [],
        "low_relevance": False,
        "max_document_score": 0.0,
        "web_results": [],
        "ocr_results": [],
        "url_results": [],
        "reranked_results": [],
        "groundedness_score": 0.0,
        "should_retry": False,
        "final_response": None,
        "fallback_reason": None,
        "suggested_questions": [],
        "response_sources": [],
        "from_web_search_only": False,
        "token_usage": {},
        "agent_executions": [],
        "current_agent": None,
        "session_id": session_id,
        "request_id": request_id,
        "metadata": {},
        "error": None,
        "retry_count": 0,
    }


def update_agent_execution(
    state: RAGState,
    agent_id: str,
    agent_name: str,
    status: str,
    input_data: Dict[str, Any],
    output_data: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None,
) -> RAGState:
    """Update state with agent execution info."""
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)

    execution: AgentExecution = {
        "agent_id": agent_id,
        "agent_name": agent_name,
        "status": status,
        "input_data": input_data,
        "output_data": output_data or {},
        "started_at": now.isoformat(),
        "completed_at": now.isoformat() if status in ["completed", "failed"] else None,
        "execution_time_ms": None,
        "error_message": error_message,
    }

    state["agent_executions"].append(execution)
    state["current_agent"] = agent_id if status == "running" else None

    return state
