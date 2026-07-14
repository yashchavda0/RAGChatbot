"""Chat and document schemas."""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

# =============================================================================
# CHAT SCHEMAS
# =============================================================================


class ChatMessage(BaseModel):
    """User chat message."""

    message: str = Field(..., max_length=10000, description="User's message")
    session_id: str = Field(default="default", description="Session identifier")


class ChatResponse(BaseModel):
    """Chat response from the assistant."""

    response: str = Field(..., description="Assistant's response")
    sources: List[Dict[str, Any]] = Field(
        default_factory=list, description="Source citations"
    )
    session_id: str = Field(..., description="Session identifier")
    agent_executions: List[Dict[str, Any]] = Field(
        default_factory=list, description="Agent execution info"
    )
    # V2 fields
    answer_source: str = Field(default="documents", description="'documents' or 'web'")
    reasoning_mode: str = Field(default="fast_rag", description="Reasoning mode used")
    retrieval_latency_ms: Optional[float] = Field(
        default=None, description="Retrieval latency in ms"
    )
    generation_latency_ms: Optional[float] = Field(
        default=None, description="Generation latency in ms"
    )
    cache_hits: Optional[Dict[str, bool]] = Field(
        default=None, description="Cache hit flags per layer"
    )
    reranker_top_score: Optional[float] = Field(
        default=None, description="Top reranker score"
    )
    web_fallback_triggered: bool = Field(
        default=False, description="Whether web fallback was used"
    )
    fallback_reason: Optional[str] = Field(
        default=None, description="Why fallback content was used"
    )
    suggested_questions: List[str] = Field(
        default_factory=list, description="Suggested follow-up questions for the user"
    )
    # Legacy fields kept for backward compatibility
    chatbot_id: Optional[str] = Field(default=None)
    from_web_search: Optional[bool] = Field(default=None)
    token_usage: Optional[Dict[str, Any]] = Field(default=None)
    response_time_ms: Optional[int] = Field(default=None)
    intent_confidence: Optional[float] = Field(default=None)
    retrieval_confidence: Optional[float] = Field(default=None)


# =============================================================================
# DOCUMENT SCHEMAS
# =============================================================================


class DocumentUploadResponse(BaseModel):
    """Response after document upload."""

    message: str
    document_id: str
    chunks_created: int
    embedding_models: List[str] = Field(default_factory=list)


class DocumentInfo(BaseModel):
    """Information about a single document."""

    document_id: str
    filename: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    indexed_at: Optional[str] = None
    created_at: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DocumentListResponse(BaseModel):
    """List of documents."""

    documents: List[Dict[str, Any]] = Field(default_factory=list)


# =============================================================================
# AGENT SCHEMAS
# =============================================================================


class AgentStatus(BaseModel):
    """Agent status information."""

    agent_id: str
    agent_name: str
    status: str
    current_request: Optional[str] = None
