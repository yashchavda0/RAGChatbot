"""
Multi-provider embedding service supporting API and local models.
Supports ensemble embeddings with multiple models running in parallel.
"""

import asyncio
import hashlib
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import aiohttp
from config.settings import settings, EMBEDDING_DIMENSIONS
from config.logging_config import get_logger

logger = get_logger(__name__)


class BaseEmbeddingProvider(ABC):
    """Abstract base class for embedding providers."""

    model_name: str
    dimension: int

    @abstractmethod
    async def embed_texts(
        self, texts: List[str], task: str = "document"
    ) -> List[List[float]]:
        """Embed multiple texts."""
        ...

    @abstractmethod
    async def embed_query(self, query: str) -> List[float]:
        """Embed a query (may use different task type)."""
        ...

    def get_short_name(self) -> str:
        """Get short name for storage (no special chars)."""
        return self.model_name.replace("/", "_").replace("-", "_")


class GeminiEmbeddingProvider(BaseEmbeddingProvider):
    """Embedding provider using Google Gemini API."""

    MAX_RETRIES = 4
    RETRY_BASE_DELAY = 2.0
    RETRYABLE_KEYWORDS = (
        "rate limit",
        "quota",
        "429",
        "resource exhausted",
        "500",
        "503",
    )

    def __init__(self):
        from google import generativeai as genai

        self._genai = genai
        genai.configure(api_key=settings.gemini_api_key)
        self.model_name = "gemini-embedding-001"
        self.dimension = EMBEDDING_DIMENSIONS.get(self.model_name, 768)
        self._batch_size = 100
        logger.info(f"Gemini embedding provider initialized (dim: {self.dimension})")

    async def embed_texts(
        self, texts: List[str], task: str = "document"
    ) -> List[List[float]]:
        task_type = "RETRIEVAL_DOCUMENT" if task == "document" else "RETRIEVAL_QUERY"
        all_embeddings = []

        for i in range(0, len(texts), self._batch_size):
            batch = texts[i : i + self._batch_size]
            embeddings = await self._embed_batch(batch, task_type)
            all_embeddings.extend(embeddings)
            if i + self._batch_size < len(texts):
                await asyncio.sleep(0.5)

        return all_embeddings

    async def embed_query(self, query: str) -> List[float]:
        results = await self._embed_batch([query], "RETRIEVAL_QUERY")
        return results[0]

    def _is_retryable(self, exc: Exception) -> bool:
        error_str = str(exc).lower()
        return any(kw in error_str for kw in self.RETRYABLE_KEYWORDS)

    async def _embed_batch(self, texts: List[str], task_type: str) -> List[List[float]]:
        loop = asyncio.get_event_loop()

        def _call():
            result = self._genai.embed_content(
                model="models/gemini-embedding-001",
                content=texts,
                task_type=task_type,
                output_dimensionality=self.dimension,
            )
            return result["embedding"]

        for attempt in range(self.MAX_RETRIES + 1):
            try:
                return await loop.run_in_executor(None, _call)
            except Exception as e:
                if attempt == self.MAX_RETRIES or not self._is_retryable(e):
                    raise
                delay = self.RETRY_BASE_DELAY * (2**attempt)
                logger.warning(
                    f"Gemini embedding transient error (attempt {attempt + 1}/{self.MAX_RETRIES}), "
                    f"retrying in {delay:.1f}s: {e}"
                )
                await asyncio.sleep(delay)


class JinaEmbeddingProvider(BaseEmbeddingProvider):
    """Embedding provider using Jina AI API (free tier: 1M tokens/month)."""

    API_URL = "https://api.jina.ai/v1/embeddings"

    def __init__(self):
        self.api_key = settings.jina_api_key
        if not self.api_key:
            raise ValueError("JINA_API_KEY is required for Jina embeddings")

        self.model_name = "jina-embeddings-v3"
        self.dimension = EMBEDDING_DIMENSIONS.get(self.model_name, 1024)
        self._batch_size = 100
        logger.info(f"Jina embedding provider initialized (dim: {self.dimension})")

    async def embed_texts(
        self, texts: List[str], task: str = "document"
    ) -> List[List[float]]:
        all_embeddings = []

        for i in range(0, len(texts), self._batch_size):
            batch = texts[i : i + self._batch_size]
            embeddings = await self._embed_batch(batch, task)
            all_embeddings.extend(embeddings)

        return all_embeddings

    async def embed_query(self, query: str) -> List[float]:
        results = await self._embed_batch([query], "query")
        return results[0]

    async def _embed_batch(self, texts: List[str], task: str) -> List[List[float]]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        # Jina uses task parameter for query vs document
        payload = {
            "model": self.model_name,
            "input": texts,
            "task": "retrieval.query" if task == "query" else "retrieval.passage",
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.API_URL, json=payload, headers=headers
            ) as resp:
                if resp.status != 200:
                    error = await resp.text()
                    raise ValueError(f"Jina API error: {error}")

                data = await resp.json()
                return [item["embedding"] for item in data["data"]]


class LocalEmbeddingProvider(BaseEmbeddingProvider):
    """Embedding provider using local sentence-transformers models."""

    # Model name mapping for HuggingFace
    MODEL_MAPPING = {
        "nomic-embed-text-v1.5": "nomic-ai/nomic-embed-text-v1.5",
        "all-MiniLM-L6-v2": "sentence-transformers/all-MiniLM-L6-v2",
        "bge-small-en-v1.5": "BAAI/bge-small-en-v1.5",
    }

    # Models that support task prefixes
    TASK_PREFIX_MODELS = {"nomic-embed-text-v1.5", "bge-small-en-v1.5"}

    def __init__(self, model_name: str):
        self.model_name = model_name
        self.dimension = EMBEDDING_DIMENSIONS.get(model_name, 384)
        self._model = None
        self._hf_model_name = self.MODEL_MAPPING.get(model_name, model_name)
        logger.info(
            f"Local embedding provider created for {model_name} (dim: {self.dimension}, lazy load)"
        )

    def _load_model(self):
        """Lazy load the model on first use."""
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            logger.info(f"Loading local model: {self._hf_model_name}")
            self._model = SentenceTransformer(
                self._hf_model_name,
                device=settings.embedding_device,
                trust_remote_code=True,  # Required for nomic
            )
            logger.info(f"Model {self.model_name} loaded successfully")

    async def embed_texts(
        self, texts: List[str], task: str = "document"
    ) -> List[List[float]]:
        loop = asyncio.get_event_loop()

        def _encode():
            self._load_model()

            # Add task prefix for supported models
            if self.model_name in self.TASK_PREFIX_MODELS:
                prefix = "search_query: " if task == "query" else "search_document: "
                texts_with_prefix = [prefix + t for t in texts]
            else:
                texts_with_prefix = texts

            embeddings = self._model.encode(
                texts_with_prefix,
                convert_to_numpy=True,
                show_progress_bar=False,
            )
            return embeddings.tolist()

        return await loop.run_in_executor(None, _encode)

    async def embed_query(self, query: str) -> List[float]:
        results = await self.embed_texts([query], task="query")
        return results[0]


class EmbeddingService:
    """Unified embedding service supporting multiple providers."""

    def __init__(self):
        self._providers: Dict[str, BaseEmbeddingProvider] = {}
        self._initialize_providers()
        logger.info(
            f"Embedding service initialized with providers: {list(self._providers.keys())}"
        )

    def _initialize_providers(self):
        """Initialize all configured embedding providers."""
        # API providers
        for model in settings.embedding_models:
            try:
                if model == "gemini-embedding-001":
                    if settings.gemini_api_key:
                        self._providers[model] = GeminiEmbeddingProvider()
                    else:
                        logger.warning(f"Skipping {model}: GEMINI_API_KEY not set")

                elif model == "jina-embeddings-v3":
                    if settings.jina_api_key:
                        self._providers[model] = JinaEmbeddingProvider()
                    else:
                        logger.warning(f"Skipping {model}: JINA_API_KEY not set")

            except Exception as e:
                logger.error(f"Failed to initialize {model}: {e}")

        # Local providers (lazy loaded)
        for model in settings.local_embedding_models:
            try:
                if model in LocalEmbeddingProvider.MODEL_MAPPING:
                    self._providers[model] = LocalEmbeddingProvider(model)
                else:
                    logger.warning(f"Unknown local model: {model}")
            except Exception as e:
                logger.error(f"Failed to initialize local model {model}: {e}")

    def get_dimension(self, model_name: Optional[str] = None) -> int:
        """Get embedding dimension for a model."""
        if model_name and model_name in self._providers:
            return self._providers[model_name].dimension
        return EMBEDDING_DIMENSIONS.get(settings.default_embedding_model, 768)

    def get_all_dimensions(self) -> Dict[str, int]:
        """Get dimensions for all active providers."""
        return {name: p.dimension for name, p in self._providers.items()}

    def get_active_models(self) -> List[str]:
        """Get list of active model names."""
        return list(self._providers.keys())

    async def embed_text(
        self, text: str, model_name: Optional[str] = None
    ) -> List[float]:
        """Embed a single text with specified or default model."""
        model = model_name or settings.default_embedding_model
        if model not in self._providers:
            raise ValueError(
                f"Model {model} not available. Active: {list(self._providers.keys())}"
            )
        return (await self._providers[model].embed_texts([text], "document"))[0]

    async def embed_query(
        self, query: str, model_name: Optional[str] = None
    ) -> List[float]:
        """Embed a query with specified or default model."""
        model = model_name or settings.default_embedding_model
        if model not in self._providers:
            raise ValueError(
                f"Model {model} not available. Active: {list(self._providers.keys())}"
            )
        try:
            from services.cache_service import get_cache_service

            cache = get_cache_service()
            cache_key = hashlib.sha256(
                f"q:{model}:{query.strip()}".encode()
            ).hexdigest()[:40]
            cached = await cache.get_embedding(cache_key)
            if cached is not None:
                return cached
            result = await self._providers[model].embed_query(query)
            await cache.set_embedding(cache_key, result)
            return result
        except Exception:
            pass
        return await self._providers[model].embed_query(query)

    async def embed_documents(
        self,
        texts: List[str],
        model_name: Optional[str] = None,
        batch_size: int = 100,
    ) -> List[List[float]]:
        """Embed multiple documents with specified model."""
        model = model_name or settings.default_embedding_model
        if model not in self._providers:
            raise ValueError(f"Model {model} not available")
        try:
            from services.cache_service import get_cache_service

            cache = get_cache_service()
            cache_keys = [
                hashlib.sha256(f"d:{model}:{t[:500].strip()}".encode()).hexdigest()[:40]
                for t in texts
            ]
            # Parallel cache lookups
            cached_results = await asyncio.gather(
                *[cache.get_embedding(k) for k in cache_keys],
                return_exceptions=True,
            )
            results: List[Optional[List[float]]] = [
                r if isinstance(r, list) else None for r in cached_results
            ]
            miss_indices = [i for i, r in enumerate(results) if r is None]
            if miss_indices:
                embeddings = await self._providers[model].embed_texts(
                    [texts[i] for i in miss_indices], "document"
                )
                await asyncio.gather(
                    *[
                        cache.set_embedding(cache_keys[miss_indices[j]], emb)
                        for j, emb in enumerate(embeddings)
                    ],
                    return_exceptions=True,
                )
                for i, emb in zip(miss_indices, embeddings):
                    results[i] = emb
            return results
        except Exception:
            pass
        return await self._providers[model].embed_texts(texts, "document")

    async def embed_with_all_models(self, text: str) -> Dict[str, List[float]]:
        """Embed text with all active models in parallel."""
        if not self._providers:
            raise ValueError("No embedding providers available")

        async def _embed(name: str, provider: BaseEmbeddingProvider):
            try:
                emb = await provider.embed_texts([text], "document")
                return name, emb[0]
            except Exception as e:
                logger.error(f"Error embedding with {name}: {e}")
                return name, None

        tasks = [_embed(name, p) for name, p in self._providers.items()]
        results = await asyncio.gather(*tasks)

        return {name: emb for name, emb in results if emb is not None}

    async def embed_query_with_all_models(self, query: str) -> Dict[str, List[float]]:
        """Embed query with all active models in parallel."""
        if not self._providers:
            raise ValueError("No embedding providers available")

        async def _embed(name: str, provider: BaseEmbeddingProvider):
            try:
                emb = await provider.embed_query(query)
                return name, emb
            except Exception as e:
                logger.error(f"Error embedding query with {name}: {e}")
                return name, None

        tasks = [_embed(name, p) for name, p in self._providers.items()]
        results = await asyncio.gather(*tasks)

        return {name: emb for name, emb in results if emb is not None}

    async def embed_documents_with_all_models(
        self,
        texts: List[str],
    ) -> Dict[str, List[List[float]]]:
        """Embed documents with all active models in parallel."""
        if not self._providers:
            raise ValueError("No embedding providers available")

        async def _embed(name: str, provider: BaseEmbeddingProvider):
            try:
                logger.info(f"Embedding {len(texts)} texts with {name}")
                embs = await provider.embed_texts(texts, "document")
                return name, embs
            except Exception as e:
                logger.error(f"Error embedding documents with {name}: {e}")
                return name, None

        tasks = [_embed(name, p) for name, p in self._providers.items()]
        results = await asyncio.gather(*tasks)

        return {name: embs for name, embs in results if embs is not None}

    async def warmup(self) -> None:
        """Force-load local embedding models so the first real query doesn't pay the load cost."""
        for name, provider in self._providers.items():
            if not isinstance(provider, LocalEmbeddingProvider):
                continue
            try:
                await provider.embed_query("warmup")
                logger.info(f"Warmed up local embedding model: {name}")
            except Exception as e:
                logger.warning(f"Warmup failed for {name}: {e}")

    def pad_embedding(self, embedding: List[float], target_dim: int) -> List[float]:
        """Pad or truncate embedding to target dimension."""
        current_dim = len(embedding)
        if current_dim == target_dim:
            return embedding
        elif current_dim < target_dim:
            return embedding + [0.0] * (target_dim - current_dim)
        else:
            return embedding[:target_dim]


_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    """Get or create the global embedding service."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
