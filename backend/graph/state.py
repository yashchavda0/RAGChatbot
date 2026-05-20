"""
LangGraph state definitions for the RAG chatbot system.
Defines the state structure that flows through the agent graph.
"""
from typing import TypedDict, List, Dict, Any, Optional, Annotated
from langgraph.graph import add_messages


class IntentType:
    """Intent types for query classification."""
    DOCUMENT_SEARCH = "document_search"
    WEB_SEARCH = "web_search"
    OCR = "ocr"
    URL_PROCESS = "url_process"
    COMPLEX = "complex"


class RAGState(TypedDict):
    """
    Main state for the RAG LangGraph.
    This state flows through all nodes and gets updated at each step.
    """

    # Core query and messages
    messages: Annotated[List[Dict[str, Any]], add_messages]  # LangGraph message annotation
    query: str  # Original user query

    # Chatbot context (multi-tenant)
    chatbot_id: str  # Chatbot ID for knowledge base filtering
    system_prompt: str  # Custom system prompt for this chatbot
    has_knowledge_base: bool  # Whether chatbot has indexed documents

    # Intent classification
    intent: str  # Classified intent (DOCUMENT_SEARCH, WEB_SEARCH, OCR, URL_PROCESS, COMPLEX)
    intent_confidence: float  # Confidence score for intent classification

    # Plan (for complex queries)
    plan: Optional[Dict[str, Any]]  # Generated plan for complex queries
    plan_validated: bool  # Whether plan has been validated
    plan_validation_notes: Optional[str]  # Validation notes

    # Document search results
    documents: List[Dict[str, Any]]  # Retrieved documents from Milvus

    # Web search results
    web_results: List[Dict[str, Any]]  # Results from Tavily web search

    # OCR results
    ocr_results: List[Dict[str, Any]]  # Extracted text from images

    # URL processing results
    url_results: List[Dict[str, Any]]  # Processed URL content

    # Reranked results
    reranked_results: List[Dict[str, Any]]  # Results after reranking

    # Final response
    final_response: Optional[str]  # Final synthesized response
    response_sources: List[Dict[str, Any]]  # Sources cited in response
    from_web_search_only: bool  # True if response is from web search only (no KB)

    # Agent execution tracking
    agent_executions: List[Dict[str, Any]]  # Track all agent executions
    current_agent: Optional[str]  # Currently executing agent

    # Session and metadata
    session_id: str  # Session identifier
    request_id: str  # Request identifier for tracking
    metadata: Dict[str, Any]  # Additional metadata

    # Error handling
    error: Optional[str]  # Error message if something went wrong
    retry_count: int  # Number of retries attempted


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
        "messages": [],
        "query": query,
        "chatbot_id": chatbot_id,
        "system_prompt": system_prompt,
        "has_knowledge_base": has_knowledge_base,
        "intent": "",
        "intent_confidence": 0.0,
        "plan": None,
        "plan_validated": False,
        "plan_validation_notes": None,
        "documents": [],
        "web_results": [],
        "ocr_results": [],
        "url_results": [],
        "reranked_results": [],
        "final_response": None,
        "response_sources": [],
        "from_web_search_only": False,
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
