"""
Plan Validator Agent - Orchestration

Validates generated execution plans.
Checks for circular dependencies, agent availability, and logical consistency.
"""
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config.logging_config import get_logger

logger = get_logger(__name__)


@register_agent(
    agent_id="plan_validator",
    name="Plan Validator",
    capabilities=["validation", "verification", "integrity_check"],
    description="Validates generated execution plans for correctness"
)
class PlanValidatorAgent(BaseAgent):
    """Validate the generated plan."""

    async def execute(self, state: RAGState) -> RAGState:
        """Validate the generated plan."""
        logger.info("Validating generated plan...")

        state = update_agent_execution(
            state,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status="running",
            input_data={"plan": state.get("plan")},
        )

        try:
            plan = state.get("plan", {})

            if not plan:
                state["plan_validated"] = False
                state["plan_validation_notes"] = "No plan to validate"
                return state

            # Check for circular dependencies using topological sort
            nodes = plan.get("nodes", [])

            # Build dependency graph
            graph = {node["node_id"]: node.get("dependencies", []) for node in nodes}

            # Check for cycles
            def has_cycle(graph: dict) -> bool:
                visited = set()
                rec_stack = set()

                def dfs(node: str) -> bool:
                    visited.add(node)
                    rec_stack.add(node)
                    for neighbor in graph.get(node, []):
                        if neighbor not in visited:
                            if dfs(neighbor):
                                return True
                        elif neighbor in rec_stack:
                            return True
                    rec_stack.remove(node)
                    return False

                for node in graph:
                    if node not in visited:
                        if dfs(node):
                            return True
                return False

            has_cycle_error = has_cycle(graph)

            # Validate all agents exist
            valid_agents = {
                "document_search", "web_search", "ocr", "url_process",
                "reranker", "response_synthesis"
            }
            plan_agents = {node.get("agent_id") for node in nodes}
            invalid_agents = plan_agents - valid_agents

            validation_notes = []
            is_valid = True

            if has_cycle_error:
                is_valid = False
                validation_notes.append("Plan contains circular dependencies")

            if invalid_agents:
                is_valid = False
                validation_notes.append(f"Invalid agents: {invalid_agents}")

            if not plan.get("entry_node"):
                is_valid = False
                validation_notes.append("No entry node specified")

            state["plan_validated"] = is_valid
            state["plan_validation_notes"] = "; ".join(validation_notes) if validation_notes else "Plan validated successfully"

            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="completed",
                input_data={"plan": plan},
                output_data={"valid": is_valid, "notes": state["plan_validation_notes"]},
            )

            logger.info(f"Plan validation: {is_valid} - {state['plan_validation_notes']}")

        except Exception as e:
            logger.error(f"Error validating plan: {e}")
            state["plan_validated"] = False
            state["plan_validation_notes"] = f"Validation error: {str(e)}"

            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="failed",
                error_message=str(e),
            )

        return state
