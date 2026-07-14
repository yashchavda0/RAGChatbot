"""
Agent module — V2 pipeline agent registration.

Old agents (intent_classifier, plan_generator, plan_validator, document_search)
are intentionally NOT imported here. Their @register_agent decorators only fire
on import, so they are invisible to the new graph.
"""
from .registry import AgentRegistry, registry

# --- V2 orchestration agents ---
from .orchestration.multi_step_planner import MultiStepPlannerAgent
from .orchestration.research_gap_analyzer import ResearchGapAnalyzerAgent

# --- V2 execution agents ---
from .execution.query_rewriter import QueryRewriterAgent
from .execution.session_loader import SessionLoaderAgent
from .execution.hybrid_retrieval import HybridRetrievalAgent
from .execution.confidence_evaluator import ConfidenceEvaluatorAgent
from .execution.context_compressor import ContextCompressorAgent
from .execution.draft_generator import DraftGeneratorAgent
from .execution.answer_critiquer import AnswerCritiquerAgent
from .execution.answer_improver import AnswerImproverAgent

# --- Kept / modified agents ---
from .execution.reranker import RerankerAgent
from .execution.web_search import WebSearchAgent
from .execution.response_synthesis import ResponseSynthesisAgent
from .execution.groundedness_check import GroundednessCheckAgent
from .execution.ocr import OCRAgent
from .execution.url_processing import URLProcessingAgent

__all__ = [
    "AgentRegistry",
    "registry",
    # V2 orchestration
    "MultiStepPlannerAgent",
    "ResearchGapAnalyzerAgent",
    # V2 execution
    "QueryRewriterAgent",
    "SessionLoaderAgent",
    "HybridRetrievalAgent",
    "ConfidenceEvaluatorAgent",
    "ContextCompressorAgent",
    "DraftGeneratorAgent",
    "AnswerCritiquerAgent",
    "AnswerImproverAgent",
    # Modified
    "RerankerAgent",
    "WebSearchAgent",
    "ResponseSynthesisAgent",
    "GroundednessCheckAgent",
    "OCRAgent",
    "URLProcessingAgent",
]
