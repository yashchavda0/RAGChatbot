"""
Agent management routes for monitoring agent status and executions.
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from config.logging_config import get_logger
from api.schemas.chat import AgentStatus, WorkflowExecution

router = APIRouter(prefix="/agents", tags=["agents"])
logger = get_logger(__name__)


@router.get("", response_model=List[AgentStatus])
async def list_agents():
    """List all available agents and their status."""
    try:
        agents = [
            {
                "agent_id": "intent_classifier",
                "agent_name": "Intent Classifier",
                "status": "active",
                "current_request": None,
            },
            {
                "agent_id": "plan_generator",
                "agent_name": "Plan Generator",
                "status": "active",
                "current_request": None,
            },
            {
                "agent_id": "plan_validator",
                "agent_name": "Plan Validator",
                "status": "active",
                "current_request": None,
            },
            {
                "agent_id": "document_search",
                "agent_name": "Document Search",
                "status": "active",
                "current_request": None,
            },
            {
                "agent_id": "web_search",
                "agent_name": "Web Search",
                "status": "active",
                "current_request": None,
            },
            {
                "agent_id": "ocr",
                "agent_name": "OCR Agent",
                "status": "active",
                "current_request": None,
            },
            {
                "agent_id": "url_process",
                "agent_name": "URL Processing",
                "status": "active",
                "current_request": None,
            },
            {
                "agent_id": "reranker",
                "agent_name": "Reranker",
                "status": "active",
                "current_request": None,
            },
            {
                "agent_id": "response_synthesis",
                "agent_name": "Response Synthesis",
                "status": "active",
                "current_request": None,
            },
        ]

        return agents

    except Exception as e:
        logger.error(f"Error listing agents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/executions")
async def list_executions(session_id: str = None, limit: int = 50):
    """List recent agent executions."""
    try:
        # TODO: Implement execution listing from database
        return {
            "executions": [],
            "session_id": session_id,
            "limit": limit,
        }

    except Exception as e:
        logger.error(f"Error listing executions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph")
async def get_graph_structure():
    """Get the LangGraph structure for visualization."""
    try:
        from graph.rag_graph import get_graph_visualization

        graph_viz = get_graph_visualization()

        return {
            "graph": graph_viz,
            "description": "RAG Chatbot Agent Graph"
        }

    except Exception as e:
        logger.error(f"Error getting graph structure: {e}")
        raise HTTPException(status_code=500, detail=str(e))
