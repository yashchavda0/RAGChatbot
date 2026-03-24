"""
Intent Classifier Agent - Orchestration

Classifies user queries into intent types (DOCUMENT_SEARCH, WEB_SEARCH, OCR, URL_PROCESS, COMPLEX)
to determine how to route the query through the agent system.
"""
import uuid
from typing import List
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, IntentType, update_agent_execution
from config.logging_config import get_logger, set_request_id
from config import settings

logger = get_logger(__name__)


@register_agent(
    agent_id="intent_classifier",
    name="Intent Classifier",
    capabilities=["classification", "intent", "routing"],
    description="Classifies user queries to determine the appropriate agent routing"
)
class IntentClassifierAgent(BaseAgent):
    """
    Classifies the user query into an intent type.

    Uses Gemini LLM for intelligent classification of queries.
    """

    async def execute(self, state: RAGState) -> RAGState:
        """Classify the user query into an intent type."""
        request_id = state.get("request_id", str(uuid.uuid4()))
        set_request_id(request_id)

        logger.info(f"Classifying intent for query: {state['query'][:50]}...")

        # Update agent execution as running
        state = update_agent_execution(
            state,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status="running",
            input_data={"query": state["query"]},
        )

        try:
            from services.gemini_service import GeminiService

            gemini_service = GeminiService()

            # Classify intent using Gemini
            prompt = f"""Classify the following user query into one of these intents:
            - DOCUMENT_SEARCH: Query asking about information from uploaded documents
            - WEB_SEARCH: Query asking for current information, news, or general knowledge
            - OCR: Query mentioning images or scanned documents
            - URL_PROCESS: Query providing a URL to process
            - COMPLEX: Query requiring multiple steps or combining sources

            Query: {state['query']}

            Respond with only the intent name and confidence score (0-1) in format: INTENT|CONFIDENCE
            Example: DOCUMENT_SEARCH|0.95
            """

            response = await gemini_service.generate(prompt, temperature=0.1)

            # Parse response
            parts = response.strip().split("|")
            intent = parts[0].upper().strip() if len(parts) > 0 else IntentType.DOCUMENT_SEARCH
            confidence = float(parts[1]) if len(parts) > 1 else 0.8

            # Validate intent
            valid_intents = [
                IntentType.DOCUMENT_SEARCH,
                IntentType.WEB_SEARCH,
                IntentType.OCR,
                IntentType.URL_PROCESS,
                IntentType.COMPLEX,
            ]
            if intent not in valid_intents:
                intent = IntentType.COMPLEX  # Default to complex for unknown intents

            state["intent"] = intent
            state["intent_confidence"] = confidence

            # Update agent execution as completed
            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="completed",
                input_data={"query": state["query"]},
                output_data={"intent": intent, "confidence": confidence},
            )

            logger.info(f"Intent classified: {intent} (confidence: {confidence})")

        except Exception as e:
            logger.error(f"Error in intent classification: {e}")
            state["intent"] = IntentType.COMPLEX  # Default to complex on error
            state["intent_confidence"] = 0.5
            state["error"] = str(e)

            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="failed",
                input_data={"query": state["query"]},
                error_message=str(e),
            )

        return state
