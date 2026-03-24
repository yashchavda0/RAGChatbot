"""
Pydantic schemas for chat-related API models.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class ChatMessage(BaseModel):
    """User chat message."""
    message: str = Field(..., description="User's message")
    session_id: Optional[str] = Field("default", description="Session identifier")


class ChatResponse(BaseModel):
    """Chat response from the assistant."""
    response: str = Field(..., description="Assistant's response")
    sources: List[Dict[str, Any]] = Field(default_factory=list, description="Source citations")
    session_id: str = Field(..., description="Session identifier")
    agent_executions: List[Dict[str, Any]] = Field(default_factory=list, description="Agent execution info")


class DocumentUploadResponse(BaseModel):
    """Response after document upload."""
    message: str = Field(..., description="Status message")
    document_id: str = Field(..., description="Document identifier")
    chunks_created: int = Field(..., description="Number of chunks created")
    embedding_models: List[str] = Field(default_factory=list, description="Models used")


class DocumentListResponse(BaseModel):
    """List of documents."""
    documents: List[Dict[str, Any]] = Field(default_factory=list)


class AgentStatus(BaseModel):
    """Agent status information."""
    agent_id: str
    agent_name: str
    status: str
    current_request: Optional[str] = None


class WorkflowExecution(BaseModel):
    """Workflow execution info."""
    execution_id: str
    status: str
    current_node: Optional[str] = None
    completed_nodes: List[str] = Field(default_factory=list)


class StreamChatMessage(BaseModel):
    """Message for streaming chat."""
    message: str
    session_id: Optional[str] = "default"
    stream: bool = False


class StreamChatChunk(BaseModel):
    """Chunk of streamed response."""
    type: str  # "agent_update", "progress", "chunk", "done", "error"
    content: Optional[str] = None
    agent: Optional[Dict[str, Any]] = None
    progress: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
