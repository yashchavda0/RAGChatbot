"""API Routes."""
from .chat import router as chat_router
from .documents import router as documents_router
from .agents import router as agents_router
from .tasks import router as tasks_router

__all__ = ["chat_router", "documents_router", "agents_router", "tasks_router"]
