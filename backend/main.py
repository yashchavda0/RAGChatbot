"""
RAG Chatbot API - Main Application Entry Point
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import asyncio
import uvicorn

from config import settings
from config.logging_config import get_logger, setup_logging
from services.models import init_database

setup_logging()
logger = get_logger(__name__)


async def _warmup_embeddings():
    """Pre-load local embedding models in the background so the first real
    query doesn't pay the sentence-transformers load cost."""
    await asyncio.sleep(settings.warmup_delay_seconds)
    try:
        from services.embedding_service import get_embedding_service

        service = get_embedding_service()
        if settings.warmup_local_embedding_models:
            await service.warmup()
        logger.info("Embedding warmup complete")
    except Exception as e:
        logger.warning(f"Embedding warmup failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting RAG Chatbot API...")

    # Initialize database (uses shared engine from PostgreSQLService)
    try:
        init_database()
        logger.info("Database initialized")
    except Exception as e:
        logger.warning(f"Database initialization warning: {e}")

    # Initialize Redis
    try:
        from services.redis_service import get_redis_service

        await get_redis_service().connect()
        logger.info("Redis connected")
    except Exception as e:
        logger.warning(f"Redis connection warning: {e}")

    # Initialize LangGraph
    try:
        from graph.rag_graph import get_rag_graph

        get_rag_graph()
        logger.info("LangGraph initialized")
    except Exception as e:
        logger.warning(f"LangGraph initialization warning: {e}")

    # Schedule background embedding warmup (non-blocking)
    if settings.warmup_on_start and settings.warmup_embeddings:
        app.state.warmup_task = asyncio.create_task(_warmup_embeddings())

    logger.info("RAG Chatbot API started successfully")
    yield

    # --- Shutdown cleanup ---
    logger.info("Shutting down...")

    warmup_task = getattr(app.state, "warmup_task", None)
    if warmup_task and not warmup_task.done():
        warmup_task.cancel()

    try:
        from services.redis_service import get_redis_service

        redis = await get_redis_service()
        await redis.disconnect()
        logger.info("Redis disconnected")
    except Exception as e:
        logger.warning(f"Error disconnecting Redis: {e}")

    try:
        from services.milvus_service import get_milvus_service

        milvus = get_milvus_service()
        milvus.dispose()
        logger.info("Milvus connection closed")
    except Exception as e:
        logger.warning(f"Error closing Milvus: {e}")

    try:
        from services.postgres_service import get_postgres_service

        pg = get_postgres_service()
        pg.dispose()
        logger.info("PostgreSQL engine disposed")
    except Exception as e:
        logger.warning(f"Error disposing PostgreSQL: {e}")

    logger.info("Shutdown complete")


app = FastAPI(
    title="RAG Chatbot API",
    description="Multi-agent RAG system with LangGraph orchestration",
    version="2.0.0",
    lifespan=lifespan,
)

# Allow local widget embeds (including file://, which appears as Origin: null)
# and sandboxed iframes. The widget is public so null origin must be allowed
# in all environments.
cors_origins = list(settings.cors_origins)
for extra_origin in ["null", "http://localhost", "http://127.0.0.1"]:
    if extra_origin not in cors_origins:
        cors_origins.append(extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
)


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "RAG Chatbot API",
        "version": "2.0.0",
        "status": "running",
        "endpoints": {
            "chatbots": "/chatbots",
            "chat": "/chat/{chatbot_id}",
            "websocket": "/chat/{chatbot_id}/ws",
            "documents": "/documents",
            "agents": "/agents",
            "health": "/health",
            "docs": "/docs",
        },
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    health_status = {"status": "healthy", "services": {}}

    # Check database
    try:
        from services.postgres_service import get_postgres_service

        pg = get_postgres_service()
        healthy = await pg.health_check()
        if healthy:
            health_status["services"]["database"] = {"status": "connected"}
        else:
            health_status["services"]["database"] = {"status": "disconnected"}
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["services"]["database"] = {
            "status": "disconnected",
            "error": str(e)[:100],
        }
        health_status["status"] = "degraded"

    # Check Milvus
    try:
        from services.milvus_service import get_milvus_service

        milvus = get_milvus_service()
        if milvus._connected:
            stats = await milvus.get_stats()
            health_status["services"]["milvus"] = {
                "status": "connected",
                "vector_count": stats.get("count", 0),
            }
        else:
            health_status["services"]["milvus"] = {"status": "not_configured"}
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["services"]["milvus"] = {"status": "disconnected"}
        health_status["status"] = "degraded"

    # Check Redis
    try:
        from services.redis_service import get_redis_service

        redis = await get_redis_service()
        if redis.client:
            await redis.client.ping()
            health_status["services"]["redis"] = {"status": "connected"}
        else:
            health_status["services"]["redis"] = {"status": "disconnected"}
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["services"]["redis"] = {
            "status": "disconnected",
            "error": str(e)[:100],
        }
        health_status["status"] = "degraded"

    return health_status


# Include API routes
from api.routes import chat, documents, agents, chatbots, auth, tasks

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(agents.router)
app.include_router(chatbots.router)
app.include_router(tasks.router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
