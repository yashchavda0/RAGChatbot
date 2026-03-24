"""
Structured logging service for the RAG chatbot system.
Provides consistent logging across all services and agents.
"""
import logging
import json
from typing import Any, Dict, Optional
from datetime import datetime
from config import settings
from config.logging_config import get_logger, set_request_id

base_logger = get_logger(__name__)


class LoggerService:
    """Service for structured logging throughout the application."""

    def __init__(self, name: str = "rag_chatbot"):
        """Initialize the logger service."""
        self.logger = logging.getLogger(name)
        self.request_id: Optional[str] = None

    def set_request_id(self, request_id: str) -> None:
        """Set the request ID for logging context."""
        self.request_id = request_id
        set_request_id(request_id)

    def _log(self, level: str, message: str, **kwargs) -> None:
        """Internal log method."""
        log_data = {"message": message}

        # Add request ID if available
        if self.request_id:
            log_data["request_id"] = self.request_id

        # Add extra fields
        log_data.update(kwargs)

        # Get the appropriate log method
        log_func = getattr(self.logger, level.lower())
        log_func(message, extra=log_data)

    def debug(self, message: str, **kwargs) -> None:
        """Log debug message."""
        self._log("debug", message, **kwargs)

    def info(self, message: str, **kwargs) -> None:
        """Log info message."""
        self._log("info", message, **kwargs)

    def warning(self, message: str, **kwargs) -> None:
        """Log warning message."""
        self._log("warning", message, **kwargs)

    def error(self, message: str, **kwargs) -> None:
        """Log error message."""
        self._log("error", message, **kwargs)

    def critical(self, message: str, **kwargs) -> None:
        """Log critical message."""
        self._log("critical", message, **kwargs)

    def log_agent_execution(
        self,
        agent_id: str,
        agent_name: str,
        status: str,
        input_data: Dict[str, Any],
        output_data: Optional[Dict[str, Any]] = None,
        execution_time_ms: Optional[int] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """Log agent execution with structured data."""
        log_data = {
            "agent_id": agent_id,
            "agent_name": agent_name,
            "status": status,
            "input_keys": list(input_data.keys()) if input_data else [],
        }

        if output_data:
            log_data["output_keys"] = list(output_data.keys())

        if execution_time_ms is not None:
            log_data["execution_time_ms"] = execution_time_ms

        if error_message:
            log_data["error"] = error_message
            self.error(f"Agent {agent_name} failed", **log_data)
        else:
            self.info(f"Agent {agent_name} {status}", **log_data)

    def log_document_index(
        self,
        document_id: str,
        filename: str,
        chunks: int,
        embedding_models: list,
    ) -> None:
        """Log document indexing operation."""
        self.info(
            f"Document indexed: {filename}",
            document_id=document_id,
            chunks=chunks,
            embedding_models=embedding_models,
        )

    def log_search_query(
        self,
        query: str,
        results_count: int,
        embedding_model: str,
    ) -> None:
        """Log search query operation."""
        self.info(
            f"Search query executed",
            query_length=len(query),
            results_count=results_count,
            embedding_model=embedding_model,
        )

    def log_llm_call(
        self,
        model: str,
        prompt_length: int,
        response_length: int,
        tokens: Optional[int] = None,
    ) -> None:
        """Log LLM API call."""
        self.info(
            f"LLM call: {model}",
            prompt_length=prompt_length,
            response_length=response_length,
            tokens=tokens,
        )


# Global logger service instance
logger_service = LoggerService()
