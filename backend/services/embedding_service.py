"""
Embedding service using Google Gemini's text-embedding-004 API.
Zero local memory footprint — all computation happens on Google's servers.
"""
import asyncio
from typing import List, Dict, Any, Optional
from google import generativeai as genai
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)

GEMINI_EMBEDDING_MODEL = "models/text-embedding-004"
GEMINI_EMBEDDING_DIM = 768
# Task types for better embedding quality
TASK_QUERY = "RETRIEVAL_QUERY"
TASK_DOCUMENT = "RETRIEVAL_DOCUMENT"


class EmbeddingService:
    """Service for generating text embeddings using Gemini API."""

    def __init__(self):
        genai.configure(api_key=settings.gemini_api_key)
        self.model_name = f"gemini-{GEMINI_EMBEDDING_MODEL}"
        self.dimension = GEMINI_EMBEDDING_DIM
        self._batch_size = 100  # Gemini supports up to 100 per request
        logger.info(f"Embedding service initialized (model: {GEMINI_EMBEDDING_MODEL}, dim: {self.dimension})")

    def get_dimension(self, model_name: Optional[str] = None) -> int:
        return self.dimension

    def get_all_dimensions(self) -> Dict[str, int]:
        return {self.model_name: self.dimension}

    async def _embed_batch(
        self,
        texts: List[str],
        task_type: str = TASK_DOCUMENT,
    ) -> List[List[float]]:
        """Embed a batch of texts via Gemini API."""
        loop = asyncio.get_event_loop()

        def _call():
            result = genai.embed_content(
                model=GEMINI_EMBEDDING_MODEL,
                content=texts,
                task_type=task_type,
            )
            return result["embedding"]

        return await loop.run_in_executor(None, _call)

    async def embed_text(
        self,
        text: str,
        model_name: Optional[str] = None,
    ) -> List[float]:
        results = await self._embed_batch([text], TASK_DOCUMENT)
        return results[0]

    async def embed_query(
        self,
        query: str,
        model_name: Optional[str] = None,
    ) -> List[float]:
        results = await self._embed_batch([query], TASK_QUERY)
        return results[0]

    async def embed_documents(
        self,
        texts: List[str],
        model_name: Optional[str] = None,
        batch_size: int = 100,
    ) -> List[List[float]]:
        all_embeddings = []
        for i in range(0, len(texts), self._batch_size):
            batch = texts[i : i + self._batch_size]
            embeddings = await self._embed_batch(batch, TASK_DOCUMENT)
            all_embeddings.extend(embeddings)
            logger.info(f"Embedded batch {i // self._batch_size + 1}: {len(batch)} texts")
        return all_embeddings

    async def embed_with_all_models(
        self,
        text: str,
    ) -> Dict[str, List[float]]:
        embedding = await self.embed_text(text)
        return {self.model_name: embedding}

    async def embed_documents_with_all_models(
        self,
        texts: List[str],
    ) -> Dict[str, List[List[float]]]:
        embeddings = await self.embed_documents(texts)
        return {self.model_name: embeddings}

    def pad_embedding(self, embedding: List[float], target_dim: int) -> List[float]:
        current_dim = len(embedding)
        if current_dim == target_dim:
            return embedding
        elif current_dim < target_dim:
            return embedding + [0.0] * (target_dim - current_dim)
        else:
            return embedding[:target_dim]


_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
