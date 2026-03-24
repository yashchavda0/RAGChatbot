"""
Gemini API embedding service - lightweight alternative to local embedding models.
Uses Google's text-embedding-004 model via API (no local GPU/memory required).
"""
import asyncio
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


class GeminiEmbeddingService:
    """
    Service for generating text embeddings using Gemini API.
    Drop-in replacement for EmbeddingService using Google's embedding API.

    Model: text-embedding-004 (768 dimensions)
    - No local memory required
    - No GPU required
    - High quality embeddings
    """

    # Gemini embedding model
    EMBEDDING_MODEL = "text-embedding-004"
    EMBEDDING_DIMENSION = 768

    # Task types for better embeddings
    TASK_TYPES = {
        "document": "RETRIEVAL_DOCUMENT",
        "query": "RETRIEVAL_QUERY",
    }

    def __init__(self):
        """Initialize the Gemini embedding service."""
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY must be set for Gemini embeddings")

        genai.configure(api_key=settings.gemini_api_key)
        self.model_name = self.EMBEDDING_MODEL
        self.dimension = self.EMBEDDING_DIMENSION

        logger.info(
            f"Gemini embedding service initialized (model: {self.model_name}, "
            f"dimension: {self.dimension})"
        )

    def get_dimension(self, model_name: Optional[str] = None) -> int:
        """Get the embedding dimension."""
        return self.dimension

    def get_all_dimensions(self) -> Dict[str, int]:
        """Get dimensions for all 'models' (single model in this case)."""
        return {self.model_name: self.dimension}

    async def embed_text(
        self,
        text: str,
        model_name: Optional[str] = None,
        task_type: str = "document",
    ) -> List[float]:
        """
        Generate embedding for a single text.

        Args:
            text: Text to embed
            model_name: Ignored (uses Gemini model)
            task_type: "document" or "query" for optimized embeddings

        Returns:
            Embedding vector as list of floats
        """
        try:
            task = self.TASK_TYPES.get(task_type, "RETRIEVAL_DOCUMENT")

            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()

            def _embed():
                result = genai.embed_content(
                    model=self.model_name,
                    content=text,
                    task_type=task,
                )
                return result["embedding"]

            embedding = await loop.run_in_executor(None, _embed)

            return embedding

        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise

    async def embed_query(
        self,
        query: str,
        model_name: Optional[str] = None,
    ) -> List[float]:
        """
        Generate embedding for a query (optimized for search).

        Args:
            query: Query text to embed
            model_name: Ignored

        Returns:
            Embedding vector
        """
        return await self.embed_text(query, task_type="query")

    async def embed_documents(
        self,
        texts: List[str],
        model_name: Optional[str] = None,
        batch_size: int = 100,
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple documents.

        Args:
            texts: List of texts to embed
            model_name: Ignored
            batch_size: Batch size for API calls (Gemini limit is 100)

        Returns:
            List of embedding vectors
        """
        try:
            all_embeddings = []

            # Process in batches
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]

                # Create tasks for batch
                tasks = [self.embed_text(text, task_type="document") for text in batch]
                batch_embeddings = await asyncio.gather(*tasks)
                all_embeddings.extend(batch_embeddings)

                logger.info(f"Embedded {len(all_embeddings)}/{len(texts)} documents")

            return all_embeddings

        except Exception as e:
            logger.error(f"Error generating document embeddings: {e}")
            raise

    async def embed_with_all_models(
        self,
        text: str,
    ) -> Dict[str, List[float]]:
        """
        Generate embeddings for text (single model, but returns dict for compatibility).

        Args:
            text: Text to embed

        Returns:
            Dictionary with single model embedding
        """
        embedding = await self.embed_text(text)
        return {self.model_name: embedding}

    async def embed_documents_with_all_models(
        self,
        texts: List[str],
    ) -> Dict[str, List[List[float]]]:
        """
        Generate embeddings for documents (single model).

        Args:
            texts: List of texts to embed

        Returns:
            Dictionary with single model embeddings
        """
        embeddings = await self.embed_documents(texts)
        return {self.model_name: embeddings}

    def pad_embedding(self, embedding: List[float], target_dim: int) -> List[float]:
        """
        Pad or truncate embedding to target dimension.

        Args:
            embedding: Original embedding
            target_dim: Target dimension

        Returns:
            Padded or truncated embedding
        """
        current_dim = len(embedding)

        if current_dim == target_dim:
            return embedding
        elif current_dim < target_dim:
            return embedding + [0.0] * (target_dim - current_dim)
        else:
            return embedding[:target_dim]


# Global embedding service instance
_gemini_embedding_service: Optional[GeminiEmbeddingService] = None


def get_gemini_embedding_service() -> GeminiEmbeddingService:
    """Get or create the global Gemini embedding service instance."""
    global _gemini_embedding_service
    if _gemini_embedding_service is None:
        _gemini_embedding_service = GeminiEmbeddingService()
    return _gemini_embedding_service
