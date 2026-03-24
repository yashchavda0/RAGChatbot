"""
Integration API routes for external application integration.
"""
from fastapi import APIRouter, Header, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from config import settings
from config.logging_config import get_logger
from graph.rag_graph import process_query
from services.session_manager import get_session_manager

router = APIRouter(prefix="/api/v1", tags=["integration"])
logger = get_logger(__name__)


def verify_api_key(x_api_key: str = Header(...)):
    """Verify the API key."""
    if not x_api_key or x_api_key != settings.integration_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


class IntegrationChatRequest(BaseModel):
    """Chat request for integration API."""
    message: str
    session_id: Optional[str] = "default"
    context: Optional[str] = None
    stream: bool = False


class IntegrationChatResponse(BaseModel):
    """Chat response for integration API."""
    response: str
    sources: List[dict]
    session_id: str
    agent_executions: List[dict]


@router.post("/chat", response_model=IntegrationChatResponse)
async def integration_chat(
    request: IntegrationChatRequest,
    api_key: str = Depends(verify_api_key),
):
    """
    Chat endpoint for external applications.

    Headers required:
    - X-API-Key: Your integration API key

    Body:
    - message: The user's message
    - session_id: Optional session identifier for conversation context
    - context: Optional additional context for the conversation
    """
    try:
        # Ensure session exists
        session_manager = get_session_manager()
        session = await session_manager.get_session(request.session_id)

        if not session:
            await session_manager.create_session(session_id=request.session_id)

        # Add context if provided
        message = request.message
        if request.context:
            message = f"Context: {request.context}\n\nUser Question: {request.message}"

        # Process query
        state = await process_query(
            query=message,
            session_id=request.session_id,
        )

        response = state.get("final_response", "")
        sources = state.get("response_sources", [])
        agent_executions = state.get("agent_executions", [])

        # Save to conversation history
        await session_manager.add_message(
            session_id=request.session_id,
            role="user",
            content=request.message,
        )

        await session_manager.add_message(
            session_id=request.session_id,
            role="assistant",
            content=response,
            sources=sources,
            agent_executions=agent_executions,
        )

        return IntegrationChatResponse(
            response=response,
            sources=sources,
            session_id=request.session_id,
            agent_executions=agent_executions,
        )

    except Exception as e:
        logger.error(f"Error in integration chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def integration_status(api_key: str = Depends(verify_api_key)):
    """Get the status of the RAG chatbot system."""
    try:
        # TODO: Get actual document counts from database
        return {
            "status": "active",
            "total_documents": 0,
            "total_chunks": 0,
            "ready": True,
        }

    except Exception as e:
        logger.error(f"Error getting status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config")
async def get_config(api_key: str = Depends(verify_api_key)):
    """Get the current chatbot configuration."""
    return {
        "name": "RAG Chatbot",
        "version": "2.0.0",
        "description": "Multi-agent RAG chatbot with LangGraph",
        "features": [
            "document_search",
            "web_search",
            "ocr",
            "intent_classification",
            "plan_generation",
            "agent_visualization",
        ],
        "embedding_models": ["bge-small-en-v1.5", "bge-large-en-v1.5", "stella-en-400M-v5"],
        "reranker": "bge-reranker-v2-m3",
    }
