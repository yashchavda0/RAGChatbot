"""
Backward-compatible re-export.
Use `from services.llm_service import get_llm_service` in new code.
"""
from services.llm_service import get_llm_service as get_gemini_service, LLMService as GeminiService
