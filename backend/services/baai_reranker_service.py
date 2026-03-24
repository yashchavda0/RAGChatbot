"""
BAAI Reranker service for reranking and reordering search results.
Uses FlagEmbedding for cross-encoder based reranking.
"""
from typing import List, Dict, Any, Optional
from FlagEmbedding import FlagReranker
import torch
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


class BAARerankerService:
    """
    Service for reranking search results using BAAI reranker models.
    Improves retrieval quality by scoring query-document pairs.
    """

    def __init__(self):
        """Initialize the BAAI reranker service."""
        self.model_name = settings.reranker_model
        self.device = settings.reranker_device
        self.top_k = settings.reranker_top_k
        self.model: Optional[FlagReranker] = None

        self._load_model()

        logger.info(
            f"BAAI Reranker service initialized (model: {self.model_name}, "
            f"device: {self.device})"
        )

    def _load_model(self) -> None:
        """Load the reranker model."""
        try:
            logger.info(f"Loading reranker model: {self.model_name}")

            self.model = FlagReranker(
                model_name_or_path=self.model_name,
                device=self.device,
            )

            logger.info(f"Reranker model loaded successfully")

        except Exception as e:
            logger.error(f"Error loading reranker model: {e}")
            # Continue without reranker - will return original results
            self.model = None

    async def rerank(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        top_k: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Rerank documents based on query relevance.

        Args:
            query: Search query
            documents: List of documents with 'content' field
            top_k: Number of top results to return

        Returns:
            Reranked list of documents
        """
        if not documents:
            return []

        if not self.model:
            logger.warning("Reranker model not loaded, returning original results")
            return documents[:top_k or self.top_k]

        top_k = top_k or self.top_k

        try:
            logger.info(f"Reranking {len(documents)} documents")

            # Prepare pairs for reranking
            pairs = [[query, doc.get("content", "")[:512]] for doc in documents]

            # Run reranker
            scores = self.model.compute_score(pairs)

            # Add scores to documents
            for i, doc in enumerate(documents):
                doc["reranker_score"] = float(scores[i]) if isinstance(scores, list) else float(scores)

            # Sort by score (descending)
            reranked = sorted(documents, key=lambda x: x.get("reranker_score", 0), reverse=True)

            # Return top k
            result = reranked[:top_k]

            logger.info(f"Reranking complete, top score: {result[0].get('reranker_score', 0):.4f}")

            return result

        except Exception as e:
            logger.error(f"Error in reranking: {e}")
            # Return original results on error
            return documents[:top_k]

    async def rerank_with_merge(
        self,
        query: str,
        document_results: List[Dict[str, Any]],
        web_results: List[Dict[str, Any]],
        top_k: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Merge and rerank results from multiple sources.

        Args:
            query: Search query
            document_results: Results from document search
            web_results: Results from web search
            top_k: Number of results to return

        Returns:
            Merged and reranked results
        """
        # Combine results with source tracking
        all_results = []

        for doc in document_results:
            all_results.append({
                "content": doc.get("content", ""),
                "source": "document",
                "metadata": doc,
            })

        for web in web_results:
            all_results.append({
                "content": web.get("snippet", web.get("content", "")),
                "source": "web",
                "metadata": web,
            })

        # Rerank combined results
        reranked = await self.rerank(query, all_results, top_k=top_k)

        return reranked


# Global reranker service instance
_reranker_service: Optional[BAARerankerService] = None


def get_reranker_service() -> BAARerankerService:
    """Get or create the global reranker service instance."""
    global _reranker_service
    if _reranker_service is None:
        _reranker_service = BAARerankerService()
    return _reranker_service
