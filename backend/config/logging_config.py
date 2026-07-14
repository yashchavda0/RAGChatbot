"""
Logging configuration for structured JSON logging.
"""
import logging
import logging.config
import queue
import atexit
from logging.handlers import QueueHandler, QueueListener
import json
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict
from contextvars import ContextVar
from config.settings import settings

# Context variable for request tracking
request_id_var: ContextVar[str] = ContextVar("request_id", default="")


class TaskLogFilter(logging.Filter):
    """Keep only task-completion/result INFO logs while always allowing warnings/errors."""

    ALLOWED_KEYWORDS = (
        "completed",
        "completion",
        "results",
        "result",
        "decision",
        "final response",
        "generated response",
        "query processed",
        "uploaded",
        "deleted",
        "created",
        "processed",
    )

    def filter(self, record: logging.LogRecord) -> bool:
        if record.levelno >= logging.WARNING:
            return True

        if not settings.log_task_only:
            return True

        message = record.getMessage().strip()
        lower_message = message.lower()

        if message.startswith("{") or message.startswith("["):
            try:
                payload = json.loads(message)
                if isinstance(payload, dict):
                    event = str(payload.get("event", "")).lower()
                    status = str(payload.get("status", "")).lower()

                    if status in {"completed", "failed"}:
                        return True

                    if any(keyword in event for keyword in self.ALLOWED_KEYWORDS):
                        return True

                    if any(key in payload for key in ("results", "results_count", "final_count", "response_length", "max_score", "fused_max_score")):
                        return True
            except json.JSONDecodeError:
                pass

        return any(keyword in lower_message for keyword in self.ALLOWED_KEYWORDS)


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        message = record.getMessage()
        log_data: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": message,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # If the log message itself is JSON, surface it as structured fields so it
        # is readable in Docker logs and JSON viewers instead of being double-escaped.
        stripped_message = message.strip()
        if stripped_message.startswith("{") or stripped_message.startswith("["):
            try:
                structured_message = json.loads(stripped_message)
                log_data["message"] = structured_message.get("event", message) if isinstance(structured_message, dict) else message
                log_data["payload"] = structured_message
            except json.JSONDecodeError:
                pass

        # Add request_id if available
        request_id = request_id_var.get()
        if request_id:
            log_data["request_id"] = request_id

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields from record
        if hasattr(record, "agent_id"):
            log_data["agent_id"] = record.agent_id
        if hasattr(record, "session_id"):
            log_data["session_id"] = record.session_id
        if hasattr(record, "execution_id"):
            log_data["execution_id"] = record.execution_id

        # Add any extra fields
        for key, value in record.__dict__.items():
            if key not in {
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "lineno", "funcName", "created", "msecs",
                "relativeCreated", "thread", "threadName", "processName",
                "process", "exc_info", "exc_text", "stack_info"
            }:
                log_data[key] = value

        return json.dumps(log_data)


class TextFormatter(logging.Formatter):
    """Custom text formatter with colors for console output."""

    COLORS = {
        "DEBUG": "\033[36m",    # Cyan
        "INFO": "\033[32m",     # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",    # Red
        "CRITICAL": "\033[35m", # Magenta
        "RESET": "\033[0m",     # Reset
    }

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as colored text."""
        level_color = self.COLORS.get(record.levelname, self.COLORS["RESET"])
        reset = self.COLORS["RESET"]

        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        request_id = request_id_var.get()

        base_msg = f"{level_color}[{record.levelname}]{reset} {timestamp} {record.name}"
        if request_id:
            base_msg += f" [{request_id[:8]}]"

        base_msg += f" - {record.getMessage()}"

        # Add agent/session info if available
        extra_info = []
        if hasattr(record, "agent_id"):
            extra_info.append(f"agent={record.agent_id}")
        if hasattr(record, "session_id"):
            extra_info.append(f"session={record.session_id}")

        if extra_info:
            base_msg += f" ({', '.join(extra_info)})"

        if record.exc_info:
            base_msg += "\n" + self.formatException(record.exc_info)

        return base_msg


def setup_logging() -> None:
    """Set up logging configuration based on settings."""
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
    log_format = settings.log_format.lower()

    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Remove existing handlers
    root_logger.handlers.clear()

    # Console handler (used by QueueListener when async logging enabled)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.addFilter(TaskLogFilter())

    if log_format == "json":
        formatter = JSONFormatter()
    else:
        formatter = TextFormatter()

    console_handler.setFormatter(formatter)

    # Optionally use QueueHandler/QueueListener for non-blocking logging
    if settings.log_async:
        log_queue: queue.Queue = queue.Queue(-1)
        queue_handler = QueueHandler(log_queue)
        queue_handler.setLevel(log_level)
        queue_handler.addFilter(TaskLogFilter())
        queue_handler.setFormatter(formatter)
        root_logger.addHandler(queue_handler)

        # Start background listener that forwards queue entries to console_handler
        listener = QueueListener(log_queue, console_handler, respect_handler_level=True)
        listener.start()

        # Register atexit hook to stop listener cleanly
        def _stop_listener():
            try:
                listener.stop()
            except Exception:
                pass

        atexit.register(_stop_listener)
    else:
        root_logger.addHandler(console_handler)

    # Suppress noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("pymilvus").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the given name."""
    return logging.getLogger(name)


def set_request_id(request_id: str) -> None:
    """Set the request ID for logging context."""
    request_id_var.set(request_id)


def get_request_id() -> str:
    """Get the current request ID from logging context."""
    return request_id_var.get()
