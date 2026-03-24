"""
Multi-model embedding service using sentence-transformers.
Supports bge-small, bge-large, and stella models simultaneously.
"""
import asyncio
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
import torch
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


class EmbeddingService:
    """
    Service for generating text embeddings using multiple models.
    Each document chunk is embedded with ALL configured models.
    """

    def __init__(self):
        """Initialize the embedding service with all models."""
        self.models: Dict[str, SentenceTransformer] = {}
        self.dimensions: Dict[str, int] = {}
        self.device = settings.embedding_device

        # Load all configured models
        for model_name in settings.embedding_models:
            self._load_model(model_name)

        logger.info(
            f"Embedding service initialized with {len(self.models)} models: "
            f"{list(self.models.keys())}"
        )

    def _load_model(self, model_name: str) -> None:
        """Load a single embedding model."""
        try:
            logger.info(f"Loading embedding model: {model_name}")

            model = SentenceTransformer(
                model_name,
                device=self.device,
            )

            self.models[model_name] = model
            self.dimensions[model_name] = model.get_sentence_embedding_dimension()

            logger.info(
                f"Model {model_name} loaded (dimension: {self.dimensions[model_name]})"
            )

        except Exception as e:
            logger.error(f"Error loading model {model_name}: {e}")
            raise

    def get_dimension(self, model_name: str) -> int:
        """Get the embedding dimension for a specific model."""
        return self.dimensions.get(model_name, 1024)

    def get_all_dimensions(self) -> Dict[str, int]:
        """Get dimensions for all loaded models."""
        return self.dimensions.copy()

    async def embed_text(
        self,
        text: str,
        model_name: Optional[str] = None,
    ) -> List[float]:
        """
        Generate embedding for a single text using specified model.

        Args:
            text: Text to embed
            model_name: Model to use (defaults to first configured model)

        Returns:
            Embedding vector as list of floats
        """
        if model_name is None:
            model_name = settings.default_embedding_model

        if model_name not in self.models:
            raise ValueError(f"Model {model_name} not loaded")

        try:
            model = self.models[model_name]

            # Generate embedding
            embedding = model.encode(
                text,
                convert_to_numpy=True,
                normalize_embeddings=True,
            )

            return embedding.tolist()

        except Exception as e:
            logger.error(f"Error generating embedding with {model_name}: {e}")
            raise

    async def embed_query(
        self,
        query: str,
        model_name: Optional[str] = None,
    ) -> List[float]:
        """
        Generate embedding for a query (optimized for short text).

        Args:
            query: Query text to embed
            model_name: Model to use

        Returns:
            Embedding vector
        """
        return await self.embed_text(query, model_name)

    async def embed_documents(
        self,
        texts: List[str],
        model_name: Optional[str] = None,
        batch_size: int = 32,
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple documents.

        Args:
            texts: List of texts to embed
            model_name: Model to use
            batch_size: Batch size for processing

        Returns:
            List of embedding vectors
        """
        if model_name is None:
            model_name = settings.default_embedding_model

        if model_name not in self.models:
            raise ValueError(f"Model {model_name} not loaded")

        try:
            model = self.models[model_name]

            loop = asyncio.get_event_loop()

            def _encode():
                return model.encode(
                    texts,
                    batch_size=batch_size,
                    show_progress_bar=False,
                    convert_to_numpy=True,
                    normalize_embeddings=True,
                )

            # Run CPU-bound operation in thread pool
            embeddings = await loop.run_in_executor(None, _encode)

            return embeddings.tolist()

        except Exception as e:
            logger.error(f"Error generating document embeddings: {e}")
            raise

    async def embed_with_all_models(
        self,
        text: str,
    ) -> Dict[str, List[float]]:
        """
        Generate embeddings for text using ALL configured models.

        Args:
            text: Text to embed

        Returns:
            Dictionary mapping model names to their embeddings
        """
        results = {}

        # Generate embeddings with all models in parallel
        tasks = []
        model_names = []

        for model_name in settings.embedding_models:
            tasks.append(self.embed_text(text, model_name))
            model_names.append(model_name)

        embeddings = await asyncio.gather(*tasks)

        for model_name, embedding in zip(model_names, embeddings):
            results[model_name] = embedding

        return results

    async def embed_documents_with_all_models(
        self,
        texts: List[str],
    ) -> Dict[str, List[List[float]]]:
        """
        Generate embeddings for documents using ALL configured models.

        Args:
            texts: List of texts to embed

        Returns:
            Dictionary mapping model names to lists of embeddings
        """
        results = {}

        # Process each model
        for model_name in settings.embedding_models:
            embeddings = await self.embed_documents(texts, model_name)
            results[model_name] = embeddings

            logger.info(
                f"Generated {len(embeddings)} embeddings with {model_name}"
            )

        return results

    def pad_embedding(self, embedding: List[float], target_dim: int) -> List[float]:
        """
        Pad or truncate embedding to target dimension.

        Useful for storing different-sized embeddings in the same vector space.

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
            # Pad with zeros
            return embedding + [0.0] * (target_dim - current_dim)
        else:
            # Truncate
            return embedding[:target_dim]


# Global embedding service instance
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    """Get or create the global embedding service instance."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
