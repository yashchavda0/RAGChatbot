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
    sources: List[Dict[str, Any]] = Field(default_factory=list, description="Source citations")
    session_id: str = Field(..., description="Session identifier")
    agent_executions: List[Dict[str, Any]] = Field(default_factory=list, description="Agent execution info")


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
