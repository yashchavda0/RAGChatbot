"""
Agent Registry for managing all registered agents.

This registry allows agents to auto-register themselves using the @register_agent decorator,
and provides methods to retrieve agents and convert them to LangGraph nodes.
"""
from typing import Dict, List, Callable, Any, TYPE_CHECKING
from graph.state import RAGState
from config.logging_config import get_logger

logger = get_logger(__name__)

if TYPE_CHECKING:
    from .base_agent import BaseAgent


class AgentRegistry:
    """
    Central registry for all agents in the system.

    Agents are registered automatically using the @register_agent decorator.
    The registry provides methods to retrieve agents and export them as LangGraph nodes.
    """

    _agents: Dict[str, "BaseAgent"] = {}
    _agent_classes: Dict[str, type] = {}

    @classmethod
    def register(cls, agent_id: str, agent_instance: "BaseAgent", agent_class: type = None) -> None:
        """
        Register an agent instance.

        Args:
            agent_id: Unique identifier for the agent
            agent_instance: Instance of the agent
            agent_class: Optional class reference for creating new instances
        """
        cls._agents[agent_id] = agent_instance
        if agent_class:
            cls._agent_classes[agent_id] = agent_class
        logger.info(f"Registered agent: {agent_id}")

    @classmethod
    def get_agent(cls, agent_id: str) -> "BaseAgent":
        """
        Get a registered agent by ID.

        Args:
            agent_id: Agent identifier

        Returns:
            Agent instance
        """
        agent = cls._agents.get(agent_id)
        if not agent:
            raise ValueError(f"Agent not found: {agent_id}")
        return agent

    @classmethod
    def get_agent_class(cls, agent_id: str) -> type:
        """Get the agent class for creating new instances."""
        agent_class = cls._agent_classes.get(agent_id)
        if not agent_class:
            raise ValueError(f"Agent class not found: {agent_id}")
        return agent_class

    @classmethod
    def list_agents(cls) -> List[str]:
        """List all registered agent IDs."""
        return list(cls._agents.keys())

    @classmethod
    def list_agents_by_capability(cls, capability: str) -> List[str]:
        """
        List agents that have a specific capability.

        Args:
            capability: Capability to filter by

        Returns:
            List of agent IDs with the capability
        """
        matching_agents = []
        for agent_id, agent in cls._agents.items():
            if hasattr(agent, 'capabilities') and capability in agent.capabilities:
                matching_agents.append(agent_id)
        return matching_agents

    @classmethod
    def get_all_nodes(cls) -> Dict[str, Callable]:
        """
        Get all registered agents as LangGraph node functions.

        Returns:
            Dictionary mapping agent_id to LangGraph node function
        """
        nodes = {}

        def make_node(agent: "BaseAgent", agent_id: str) -> Callable:
            """Factory function to create a node with proper closure."""
            async def node(state: RAGState) -> RAGState:
                return await agent.execute(state)
            node.__name__ = f"{agent_id}_node"
            return node

        for agent_id, agent in cls._agents.items():
            nodes[agent_id] = make_node(agent, agent_id)

        logger.info(f"Exported {len(nodes)} agents as LangGraph nodes")
        return nodes

    @classmethod
    def get_node(cls, agent_id: str) -> Callable:
        """
        Get a specific agent as a LangGraph node function.

        Args:
            agent_id: Agent identifier

        Returns:
            LangGraph node function
        """
        agent = cls.get_agent(agent_id)

        async def node(state: RAGState) -> RAGState:
            return await agent.execute(state)

        node.__name__ = f"{agent_id}_node"
        return node

    @classmethod
    def clear(cls) -> None:
        """Clear all registered agents (useful for testing)."""
        cls._agents.clear()
        cls._agent_classes.clear()
        logger.info("Cleared agent registry")


# Global registry instance
registry = AgentRegistry()
