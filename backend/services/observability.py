"""
Observability service: LangSmith tracing + structured JSON metrics logging.

All public methods are non-fatal — exceptions are swallowed so observability
never blocks the pipeline. If LangSmith is not configured, only structured
JSON logs are emitted.
"""
import logging
import time
import uuid
from typing import Any, Dict, Optional

from config.settings import settings

logger = logging.getLogger(__name__)


class ObservabilityService:
    """LangSmith tracing + structured metrics emitter."""

    def __init__(self) -> None:
        self._client = None
        self._enabled = settings.langsmith_tracing_enabled and bool(settings.langsmith_api_key)
        if self._enabled:
            try:
                from langsmith import Client
                self._client = Client(api_key=settings.langsmith_api_key)
                logger.info("LangSmith tracing enabled (project=%s)", settings.langsmith_project)
            except Exception as exc:
                logger.warning("LangSmith init failed, tracing disabled: %s", exc)
                self._enabled = False

    # ------------------------------------------------------------------
    # Run lifecycle
    # ------------------------------------------------------------------

    def create_run(
        self,
        query: str,
        chatbot_id: str,
        session_id: str,
        reasoning_mode: str,
    ) -> str:
        """Start a new LangSmith run and return the run_id."""
        run_id = str(uuid.uuid4())
        try:
            if self._client:
                self._client.create_run(
                    id=run_id,
                    name="rag_pipeline",
                    run_type="chain",
                    project_name=settings.langsmith_project,
                    inputs={
                        "query": query,
                        "chatbot_id": chatbot_id,
                        "session_id": session_id,
                        "reasoning_mode": reasoning_mode,
                    },
                )
        except Exception as exc:
            logger.debug("LangSmith create_run error: %s", exc)
        self._log(
            "pipeline_start",
            run_id=run_id,
            chatbot_id=chatbot_id,
            session_id=session_id,
            reasoning_mode=reasoning_mode,
        )
        return run_id

    def end_run(
        self,
        run_id: str,
        outputs: Dict[str, Any],
        error: Optional[str] = None,
    ) -> None:
        try:
            if self._client:
                self._client.update_run(
                    run_id=run_id,
                    outputs=outputs,
                    error=error,
                    end_time=time.time(),
                )
        except Exception as exc:
            logger.debug("LangSmith end_run error: %s", exc)
        self._log(
            "pipeline_end",
            run_id=run_id,
            answer_source=outputs.get("answer_source"),
            reasoning_mode=outputs.get("reasoning_mode"),
            total_latency_ms=outputs.get("total_latency_ms"),
            error=error,
        )

    # ------------------------------------------------------------------
    # Node-level tracing
    # ------------------------------------------------------------------

    def log_node(
        self,
        run_id: str,
        node_name: str,
        inputs: Dict[str, Any],
        outputs: Dict[str, Any],
        latency_ms: float,
    ) -> None:
        try:
            if self._client:
                child_id = str(uuid.uuid4())
                self._client.create_run(
                    id=child_id,
                    parent_run_id=run_id,
                    name=node_name,
                    run_type="tool",
                    project_name=settings.langsmith_project,
                    inputs=inputs,
                )
                self._client.update_run(
                    run_id=child_id,
                    outputs=outputs,
                    end_time=time.time(),
                )
        except Exception as exc:
            logger.debug("LangSmith log_node error: %s", exc)
        self._log("node_complete", run_id=run_id, node=node_name, latency_ms=latency_ms)

    # ------------------------------------------------------------------
    # Domain-specific metrics
    # ------------------------------------------------------------------

    def log_retrieval_metrics(
        self,
        run_id: str,
        n_candidates: int,
        n_reranked: int,
        top_score: float,
        latency_ms: float,
        cache_hit: bool,
    ) -> None:
        self._log(
            "retrieval_metrics",
            run_id=run_id,
            n_candidates=n_candidates,
            n_reranked=n_reranked,
            top_score=round(top_score, 4),
            latency_ms=round(latency_ms, 1),
            cache_hit=cache_hit,
        )

    def log_token_usage(
        self,
        run_id: str,
        prompt_tokens: int,
        completion_tokens: int,
        total_tokens: int,
    ) -> None:
        self._log(
            "token_usage",
            run_id=run_id,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
        )

    def log_cache_event(self, run_id: str, layer: str, hit: bool) -> None:
        self._log("cache_event", run_id=run_id, layer=layer, hit=hit)

    def log_confidence(self, run_id: str, score: float, answer_source: str) -> None:
        self._log(
            "confidence_decision",
            run_id=run_id,
            score=round(score, 4),
            answer_source=answer_source,
        )

    def log_compression_metrics(
        self, run_id: str, original_tokens: int, compressed_tokens: int
    ) -> None:
        ratio = round(1 - compressed_tokens / max(original_tokens, 1), 3)
        self._log(
            "compression_metrics",
            run_id=run_id,
            original_tokens=original_tokens,
            compressed_tokens=compressed_tokens,
            reduction_ratio=ratio,
        )

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _log(self, event: str, **kwargs) -> None:
        logger.info({"event": event, **kwargs})


_obs_service: Optional[ObservabilityService] = None


def get_observability_service() -> ObservabilityService:
    global _obs_service
    if _obs_service is None:
        _obs_service = ObservabilityService()
    return _obs_service
