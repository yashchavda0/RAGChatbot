"""
Plan Generator Agent - Orchestration

Generates execution plans for complex multi-step queries.
Creates task graphs with nodes and edges that define which agents to run and in what order.
"""
import uuid
import json
from typing import Dict, Any
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config.logging_config import get_logger

logger = get_logger(__name__)


@register_agent(
    agent_id="plan_generator",
    name="Plan Generator",
    capabilities=["planning", "orchestration", "graph_generation"],
    description="Generates execution plans for complex multi-step queries"
)
class PlanGeneratorAgent(BaseAgent):
    """Generate an execution plan for complex queries."""

    async def execute(self, state: RAGState) -> RAGState:
        """Generate an execution plan for complex queries."""
        logger.info(f"Generating plan for complex query: {state['query'][:50]}...")

        state = update_agent_execution(
            state,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status="running",
            input_data={"query": state["query"], "intent": state["intent"]},
        )

        try:
            from services.llm_service import get_llm_service

            gemini_service = get_llm_service()

            # Generate plan using Gemini
            prompt = f"""Generate an execution plan for this complex query.
            Query: {state['query']}
            Intent: {state['intent']}

            Available agents:
            - document_search: Search uploaded documents
            - web_search: Search the web
            - ocr: Extract text from images
            - url_process: Process URL content
            - reranker: Rerank and merge results
            - response_synthesis: Generate final response

            Create a plan as JSON:
            {{
                "plan_id": "unique_id",
                "nodes": [
                    {{"node_id": "1", "agent_id": "document_search", "dependencies": []}},
                    {{"node_id": "2", "agent_id": "web_search", "dependencies": []}},
                    {{"node_id": "3", "agent_id": "reranker", "dependencies": ["1", "2"]}},
                    {{"node_id": "4", "agent_id": "response_synthesis", "dependencies": ["3"]}}
                ],
                "entry_node": "1",
                "description": "Plan description"
            }}

            Respond only with valid JSON.
            """

            response = await gemini_service.generate(prompt, temperature=0.3)

            # Parse JSON response
            try:
                # Extract JSON from response if there's extra text
                start = response.find("{")
                end = response.rfind("}") + 1
                json_str = response[start:end]
                plan = json.loads(json_str)
            except (json.JSONDecodeError, ValueError):
                # Fallback plan
                plan = {
                    "plan_id": str(uuid.uuid4()),
                    "nodes": [
                        {"node_id": "1", "agent_id": "document_search", "dependencies": []},
                        {"node_id": "2", "agent_id": "reranker", "dependencies": ["1"]},
                        {"node_id": "3", "agent_id": "response_synthesis", "dependencies": ["2"]},
                    ],
                    "entry_node": "1",
                    "description": "Fallback plan",
                }

            state["plan"] = plan

            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="completed",
                input_data={"query": state["query"]},
                output_data={"plan": plan},
            )

            logger.info(f"Plan generated: {plan.get('description', 'No description')}")

        except Exception as e:
            logger.error(f"Error generating plan: {e}")
            state["error"] = str(e)

            # Create fallback plan
            state["plan"] = {
                "plan_id": str(uuid.uuid4()),
                "nodes": [
                    {"node_id": "1", "agent_id": "document_search", "dependencies": []},
                    {"node_id": "2", "agent_id": "response_synthesis", "dependencies": ["1"]},
                ],
                "entry_node": "1",
                "description": "Fallback plan",
            }

            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="failed",
                input_data={"query": state["query"]},
                error_message=str(e),
            )

        return state
