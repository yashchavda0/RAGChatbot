"""
Agent module - Individual agent files with auto-registration.

This module imports all agents which register themselves automatically via the @register_agent decorator.
"""
# Import all agents to trigger their registration via @register_agent decorator
from .registry import AgentRegistry, registry

# Import orchestration agents (they will auto-register themselves)
from .orchestration.intent_classifier import IntentClassifierAgent
from .orchestration.plan_generator import PlanGeneratorAgent
from .orchestration.plan_validator import PlanValidatorAgent

# Import execution agents
from .execution.document_search import DocumentSearchAgent
from .execution.web_search import WebSearchAgent
from .execution.ocr import OCRAgent
from .execution.url_processing import URLProcessingAgent
from .execution.reranker import RerankerAgent
from .execution.response_synthesis import ResponseSynthesisAgent

# Import indexing agents
# from .indexing.document_indexing import DocumentIndexingAgent

__all__ = [
    "AgentRegistry",
    "registry",
    "IntentClassifierAgent",
    "PlanGeneratorAgent",
    "PlanValidatorAgent",
    "DocumentSearchAgent",
    "WebSearchAgent",
    "OCRAgent",
    "URLProcessingAgent",
    "RerankerAgent",
    "ResponseSynthesisAgent",
]
