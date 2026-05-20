"""
Redis cache service for caching embeddings, search results, and session data.
"""
import json
import hashlib
from typing import Any, Optional, List
import redis.asyncio as redis
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


def _stable_hash(text: str) -> str:
    """Generate a deterministic hash for cache keys."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


class RedisService:
    """Service for Redis caching operations."""

    def __init__(self):
        """Initialize the Redis service."""
        self.url = settings.redis_url
        self.ttl = settings.redis_cache_ttl
        self.client: Optional[redis.Redis] = None

    async def connect(self) -> None:
        """Connect to Redis."""
        try:
            self.client = await redis.from_url(
                self.url,
                encoding="utf-8",
                decode_responses=True,
            )

            # Test connection
            await self.client.ping()

            logger.info(f"Connected to Redis at {self.url}")

        except Exception as e:
            logger.warning(f"Could not connect to Redis: {e}")
            self.client = None

    async def disconnect(self) -> None:
        """Disconnect from Redis."""
        if self.client:
            await self.client.close()
            logger.info("Disconnected from Redis")

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if not self.client:
            return None

        try:
            value = await self.client.get(key)

            if value:
                # Try to parse as JSON
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    return value

            return None

        except Exception as e:
            logger.error(f"Error getting from cache: {e}")
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
    ) -> bool:
        """Set value in cache."""
        if not self.client:
            return False

        try:
            # Serialize value
            if not isinstance(value, str):
                value = json.dumps(value)

            ttl = ttl or self.ttl

            if ttl > 0:
                await self.client.setex(key, ttl, value)
            else:
                await self.client.set(key, value)

            return True

        except Exception as e:
            logger.error(f"Error setting cache: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        if not self.client:
            return False

        try:
            await self.client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Error deleting from cache: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        if not self.client:
            return False

        try:
            return await self.client.exists(key) > 0
        except Exception as e:
            logger.error(f"Error checking cache: {e}")
            return False

    # ============================================================================
    # SPECIFIC CACHE METHODS
    # ============================================================================

    async def cache_embedding(
        self,
        text: str,
        embedding: List[float],
        model_name: str,
        ttl: Optional[int] = None,
    ) -> bool:
        """Cache text embedding."""
        key = f"embedding:{model_name}:{_stable_hash(text)}"
        return await self.set(key, embedding, ttl=ttl or 86400)  # 24 hours

    async def get_embedding(
        self,
        text: str,
        model_name: str,
    ) -> Optional[List[float]]:
        """Get cached embedding."""
        key = f"embedding:{model_name}:{_stable_hash(text)}"
        return await self.get(key)

    async def cache_search_results(
        self,
        query: str,
        results: List[dict],
        ttl: Optional[int] = None,
    ) -> bool:
        """Cache search results."""
        key = f"search:{_stable_hash(query)}"
        return await self.set(key, results, ttl=ttl or 3600)  # 1 hour

    async def get_search_results(
        self,
        query: str,
    ) -> Optional[List[dict]]:
        """Get cached search results."""
        key = f"search:{_stable_hash(query)}"
        return await self.get(key)

    async def cache_llm_response(
        self,
        prompt: str,
        response: str,
        ttl: Optional[int] = None,
    ) -> bool:
        """Cache LLM response."""
        key = f"llm:{_stable_hash(prompt)}"
        return await self.set(key, response, ttl=ttl or 3600)

    async def get_llm_response(
        self,
        prompt: str,
    ) -> Optional[str]:
        """Get cached LLM response."""
        key = f"llm:{_stable_hash(prompt)}"
        return await self.get(key)

    async def cache_reranker_results(
        self,
        query: str,
        documents: List[dict],
        results: List[dict],
        ttl: Optional[int] = None,
    ) -> bool:
        """Cache reranker results."""
        # Create a hash of query + document IDs for cache key
        doc_ids = "-".join(sorted(d.get("id", "") for d in documents))
        key = f"reranker:{_stable_hash(query)}:{_stable_hash(doc_ids)}"
        return await self.set(key, results, ttl=ttl or 3600)

    async def get_reranker_results(
        self,
        query: str,
        documents: List[dict],
    ) -> Optional[List[dict]]:
        """Get cached reranker results."""
        doc_ids = "-".join(sorted(d.get("id", "") for d in documents))
        key = f"reranker:{_stable_hash(query)}:{_stable_hash(doc_ids)}"
        return await self.get(key)


# Global Redis service instance
_redis_service: Optional[RedisService] = None


async def get_redis_service() -> RedisService:
    """Get or create the global Redis service instance."""
    global _redis_service
    if _redis_service is None:
        _redis_service = RedisService()
        await _redis_service.connect()
    return _redis_service
