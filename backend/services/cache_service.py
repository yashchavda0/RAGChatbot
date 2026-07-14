"""
4-layer Redis cache service for the RAG pipeline.

Layer 1: Embedding cache  (query_hash → embedding vector)  TTL: 24h
Layer 2: Retrieval cache  (query_hash+chatbot_id → top-30 results) TTL: 1h
Layer 3: Response cache   (query_hash+chatbot_id → final response)  TTL: 30min
Layer 4: Session cache    (session_id → context summary)            TTL: 1h
"""
import hashlib
import json
import logging
from typing import Any, Dict, List, Optional

from config.settings import settings

logger = logging.getLogger(__name__)

_NS_EMBEDDING = "emb"
_NS_RETRIEVAL = "ret"
_NS_RESPONSE = "resp"
_NS_SESSION = "sess"


def _compute_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:40]


class CacheService:
    """4-layer Redis-backed cache. All methods are non-fatal on Redis errors."""

    def compute_query_hash(self, query: str, chatbot_id: str = "") -> str:
        return _compute_hash(f"{chatbot_id}::{query.strip().lower()}")

    async def _redis(self):
        from services.redis_service import get_redis_service
        return await get_redis_service()

    # ------------------------------------------------------------------
    # Layer 1 – Embedding cache
    # ------------------------------------------------------------------

    async def get_embedding(self, query_hash: str) -> Optional[List[float]]:
        try:
            r = await self._redis()
            return await r.get(f"{_NS_EMBEDDING}:{query_hash}")
        except Exception as exc:
            logger.debug("embedding cache get error: %s", exc)
        return None

    async def set_embedding(self, query_hash: str, embedding: List[float]) -> None:
        try:
            r = await self._redis()
            await r.set(
                f"{_NS_EMBEDDING}:{query_hash}",
                json.dumps(embedding),
                ttl=settings.embedding_cache_ttl,
            )
        except Exception as exc:
            logger.debug("embedding cache set error: %s", exc)

    # ------------------------------------------------------------------
    # Layer 2 – Retrieval cache
    # ------------------------------------------------------------------

    async def get_retrieval(self, query_hash: str, chatbot_id: str) -> Optional[List[Dict[str, Any]]]:
        try:
            r = await self._redis()
            return await r.get(f"{_NS_RETRIEVAL}:{chatbot_id}:{query_hash}")
        except Exception as exc:
            logger.debug("retrieval cache get error: %s", exc)
        return None

    async def set_retrieval(
        self, query_hash: str, chatbot_id: str, results: List[Dict[str, Any]]
    ) -> None:
        try:
            r = await self._redis()
            await r.set(
                f"{_NS_RETRIEVAL}:{chatbot_id}:{query_hash}",
                results,
                ttl=settings.retrieval_cache_ttl,
            )
        except Exception as exc:
            logger.debug("retrieval cache set error: %s", exc)

    # ------------------------------------------------------------------
    # Layer 3 – Response cache
    # ------------------------------------------------------------------

    async def get_response(self, query_hash: str, chatbot_id: str) -> Optional[Dict[str, Any]]:
        try:
            r = await self._redis()
            return await r.get(f"{_NS_RESPONSE}:{chatbot_id}:{query_hash}")
        except Exception as exc:
            logger.debug("response cache get error: %s", exc)
        return None

    async def set_response(
        self, query_hash: str, chatbot_id: str, response: Dict[str, Any]
    ) -> None:
        try:
            r = await self._redis()
            await r.set(
                f"{_NS_RESPONSE}:{chatbot_id}:{query_hash}",
                response,
                ttl=settings.response_cache_ttl,
            )
        except Exception as exc:
            logger.debug("response cache set error: %s", exc)

    # ------------------------------------------------------------------
    # Layer 4 – Session cache
    # ------------------------------------------------------------------

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        try:
            r = await self._redis()
            return await r.get(f"{_NS_SESSION}:{session_id}")
        except Exception as exc:
            logger.debug("session cache get error: %s", exc)
        return None

    async def set_session(self, session_id: str, data: Dict[str, Any]) -> None:
        try:
            r = await self._redis()
            await r.set(
                f"{_NS_SESSION}:{session_id}",
                data,
                ttl=settings.session_cache_ttl,
            )
        except Exception as exc:
            logger.debug("session cache set error: %s", exc)


_cache_service: Optional[CacheService] = None


def get_cache_service() -> CacheService:
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
    return _cache_service
