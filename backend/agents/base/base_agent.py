"""
Base agent class and registration decorator for all agents.

All agents should inherit from BaseAgent and use the @register_agent decorator
for automatic registration with the AgentRegistry.
"""
from typing import List, Optional, Callable, Any
from agents.registry import AgentRegistry
from graph.state import RAGState
from config.logging_config import get_logger

logger = get_logger(__name__)


def register_agent(
    agent_id: str,
    name: str,
    capabilities: Optional[List[str]] = None,
    description: Optional[str] = None,
):
    """
    Decorator to automatically register an agent class.

    Args:
        agent_id: Unique identifier for the agent
        name: Human-readable name
        capabilities: List of agent capabilities
        description: Agent description

    Usage:
        @register_agent(
            agent_id="document_search",
            name="Document Search Agent",
            capabilities=["search", "milvus", "documents"]
        )
        class DocumentSearchAgent(BaseAgent):
            ...
    """
    def decorator(cls: type) -> type:
        # Create instance and register
        instance = cls()
        instance.agent_id = agent_id
        instance.agent_name = name
        instance.capabilities = capabilities or []
        instance.description = description or ""

        # Register the agent
        AgentRegistry.register(agent_id, instance, cls)

        # Add class properties for easy access
        cls.agent_id = agent_id
        cls.agent_name = name
        cls.capabilities = capabilities or []
        cls.description = description or ""

        return cls

    return decorator


class BaseAgent:
    """
    Base class for all agents in the RAG system.

    All agents must:
    1. Inherit from BaseAgent
    2. Use the @register_agent decorator
    3. Implement the execute() method
    4. Optionally implement to_langgraph_node() for custom node behavior

    Example:
        @register_agent(
            agent_id="my_agent",
            name="My Agent",
            capabilities=["task1", "task2"]
        )
        class MyAgent(BaseAgent):
            async def execute(self, state: RAGState) -> RAGState:
                # Agent implementation
                return state
    """

    # Class properties (set by decorator)
    agent_id: str = ""
    agent_name: str = ""
    capabilities: List[str] = []
    description: str = ""

    async def execute(self, state: RAGState) -> RAGState:
        """
        Execute the agent's logic on the given state.

        Args:
            state: Current LangGraph state

        Returns:
            Updated state after agent execution

        Raises:
            NotImplementedError: Must be implemented by subclasses
        """
        raise NotImplementedError(f"{self.__class__.__name__}.execute() must be implemented")

    def to_langgraph_node(self) -> Callable:
        """
        Convert this agent to a LangGraph node function.

        Override this method if you need custom node behavior.
        Most agents can use the default implementation.

        Returns:
            LangGraph node function
        """
        async def node(state: RAGState) -> RAGState:
            return await self.execute(state)

        # Set name for debugging
        node.__name__ = f"{self.agent_id}_node"
        return node

    def get_info(self) -> dict:
        """Get agent information as a dictionary."""
        return {
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "capabilities": self.capabilities,
            "description": self.description,
            "class": self.__class__.__name__,
        }

    async def validate_input(self, state: RAGState) -> bool:
        """
        Validate that the state has required inputs for this agent.

        Args:
            state: Current LangGraph state

        Returns:
            True if input is valid
        """
        # Base implementation - always valid
        return True

    async def handle_error(self, state: RAGState, error: Exception) -> RAGState:
        """
        Handle errors during agent execution.

        Args:
            state: Current state at time of error
            error: The exception that occurred

        Returns:
            Updated state with error information
        """
        from graph.state import update_agent_execution

        logger.error(f"Error in {self.agent_id}: {error}")

        # Record error in state
        state["error"] = str(error)
        state["current_agent"] = None

        # Update agent execution as failed
        if "agent_executions" not in state:
            state["agent_executions"] = []

        update_agent_execution(
            state,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status="failed",
            input_data={},
            error_message=str(error),
        )

        return state
