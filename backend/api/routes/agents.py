"""Agent management routes."""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from config.logging_config import get_logger

router = APIRouter(prefix="/agents", tags=["agents"])
logger = get_logger(__name__)


@router.get("")
async def list_agents():
    """List all registered agents."""
    try:
        from agents.registry import AgentRegistry

        agent_ids = AgentRegistry.list_agents()
        agents = []

        for agent_id in agent_ids:
            agent = AgentRegistry.get_agent(agent_id)
            agents.append({
                "agent_id": agent_id,
                "agent_name": getattr(agent, "name", agent_id),
                "status": "active",
                "capabilities": getattr(agent, "capabilities", []),
            })

        return agents

    except Exception as e:
        logger.error(f"Error listing agents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph")
async def get_graph_structure():
    """Get the LangGraph structure for visualization."""
    try:
        from graph.rag_graph import get_graph_visualization
        graph_viz = get_graph_visualization()
        return {"graph": graph_viz}

    except Exception as e:
        logger.error(f"Error getting graph: {e}")
        raise HTTPException(status_code=500, detail=str(e))
