"""
RAG Chatbot API - Main Application Entry Point

A multi-agent RAG system built with LangGraph, featuring:
- Intent classification
- Plan generation and validation
- Document search with Milvus
- Web search with Tavily
- OCR with PaddleOCR
- Multi-model embeddings (bge-small, bge-large, stella)
- BAAI reranker
- Real-time WebSocket updates
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from contextlib import asynccontextmanager
import os
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import new components
from config import settings
from config.logging_config import get_logger, setup_logging
from services.models import init_database

# Set up logging
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting RAG Chatbot API...")

    # Initialize database
    try:
        logger.info("Initializing database...")
        init_database(os.getenv("POSTGRES_URL", settings.postgres_url))
        logger.info("✓ Database initialized")
    except Exception as e:
        logger.warning(f"⚠ Database initialization warning: {e}")

    # Initialize Redis
    try:
        from services.redis_service import get_redis_service
        await get_redis_service().connect()
        logger.info("✓ Redis connected")
    except Exception as e:
        logger.warning(f"⚠ Redis connection warning: {e}")

    # Initialize LangGraph
    try:
        from graph.rag_graph import get_rag_graph
        get_rag_graph()
        logger.info("✓ LangGraph initialized")
    except Exception as e:
        logger.warning(f"⚠ LangGraph initialization warning: {e}")

    logger.info("RAG Chatbot API started successfully")
    yield
    logger.info("Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="RAG Chatbot API",
    description="Multi-agent RAG system with LangGraph orchestration",
    version="2.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# ROOT & HEALTH ENDPOINTS
# =============================================================================

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "RAG Chatbot API",
        "version": "2.0.0",
        "status": "running",
        "description": "Multi-agent RAG system with LangGraph",
        "features": [
            "Intent classification",
            "Plan generation & validation",
            "Document search (Milvus)",
            "Web search (Tavily)",
            "OCR (PaddleOCR)",
            "Multi-model embeddings",
            "BAAI reranker",
            "WebSocket streaming",
        ],
        "endpoints": {
            "chat": "/chat",
            "websocket": "/chat/ws",
            "documents": "/documents",
            "health": "/health",
            "docs": "/docs",
        },
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    health_status = {"status": "healthy"}

    # Check database
    try:
        health_status["database"] = "configured"
    except Exception:
        health_status["database"] = "not configured"

    # Check Milvus
    try:
        from services.milvus_service import MilvusService
        milvus = MilvusService()
        stats = await milvus.get_stats()
        health_status["milvus"] = {"status": "connected", "count": stats.get("count", 0)}
    except Exception:
        health_status["milvus"] = "disconnected"

    # Check Redis
    try:
        from services.redis_service import get_redis_service
        redis = await get_redis_service()
        health_status["redis"] = "connected" if redis.client else "disconnected"
    except Exception:
        health_status["redis"] = "disconnected"

    return health_status


# =============================================================================
# API ROUTES
# =============================================================================

# Include new LangGraph-based routes
try:
    from api.routes import chat, documents, agents, integration
    app.include_router(chat.router)
    app.include_router(documents.router)
    app.include_router(agents.router)
    app.include_router(integration.router)
except ImportError as e:
    logger.warning(f"Could not import all routes: {e}")


# =============================================================================
# LEGACY ENDPOINTS (for backward compatibility)
# =============================================================================

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = "default"


class ChatResponse(BaseModel):
    response: str
    sources: List[str]


class DocumentUploadResponse(BaseModel):
    message: str
    document_id: str
    chunks_created: int


# Legacy chat endpoint using new LangGraph system
@app.post("/chat", response_model=ChatResponse, include_in_schema=False)
async def chat_legacy(chat_message: ChatMessage):
    """Legacy chat endpoint (use /chat route from api.routes instead)."""
    try:
        from graph.rag_graph import process_query
        from services.session_manager import get_session_manager

        # Ensure session exists
        session_manager = get_session_manager()
        await session_manager.create_session(session_id=chat_message.session_id)

        # Process query through LangGraph
        state = await process_query(
            query=chat_message.message,
            session_id=chat_message.session_id,
        )

        response = state.get("final_response", "No response generated.")
        sources = [s.get("title", s.get("url", "")) for s in state.get("response_sources", [])]

        return ChatResponse(response=response, sources=sources)
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# ERROR HANDLERS
# =============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return {"error": "Internal server error", "detail": str(exc)}


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )