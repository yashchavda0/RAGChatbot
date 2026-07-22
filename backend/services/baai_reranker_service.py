"""
Reranker service using Gemini embeddings for reranking.
No model download required - uses Google's cloud API.
Uses cosine similarity between query and document embeddings.
"""

import asyncio
import numpy as np
from typing import List, Dict, Any, Optional
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


class BAAIRerankerService:
    """Service for reranking search results using Gemini embeddings."""

    def __init__(self):
        self.top_k = settings.reranker_top_k
        logger.info("Gemini embedding-based reranker service initialized")

    async def rerank(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        top_k: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Rerank documents using Gemini embedding cosine similarity.

        Args:
            query: User query
            documents: List of documents with 'content' field
            top_k: Number of top results to return

        Returns:
            Reranked and scored documents
        """
        if not documents:
            return []

        top_k = top_k or self.top_k

        try:
            logger.info(f"Reranking {len(documents)} documents with Gemini embeddings")

            # Score documents using embedding similarity
            scored_docs = await self._compute_cosine_similarity(query, documents)

            # Sort by score (descending) and return top_k
            scored_docs.sort(key=lambda x: x.get("reranker_score", 0), reverse=True)
            result = scored_docs[:top_k]

            if result:
                logger.info(
                    f"Reranking complete, top score: {result[0].get('reranker_score', 0):.3f}"
                )

            return result

        except Exception as e:
            logger.error(f"Error in embedding reranking: {e}")
            # Fallback: return original order with default scores
            for doc in documents:
                doc["reranker_score"] = 0.5
            return documents[:top_k]

    async def _compute_cosine_similarity(
        self,
        query: str,
        documents: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Score documents using embedding cosine similarity."""
        from services.embedding_service import get_embedding_service

        embedding_service = get_embedding_service()

        # Embed query and documents in parallel (different task types, so two calls)
        doc_contents = [doc.get("content", "")[:2000] for doc in documents]
        query_embedding, doc_embeddings = await asyncio.gather(
            embedding_service.embed_query(query),
            embedding_service.embed_documents(doc_contents),
        )

        # Calculate cosine similarity for each document
        query_vec = np.array(query_embedding)
        query_norm = np.linalg.norm(query_vec)

        for i, doc in enumerate(documents):
            doc_vec = np.array(doc_embeddings[i])
            doc_norm = np.linalg.norm(doc_vec)
            if query_norm > 0 and doc_norm > 0:
                similarity = np.dot(query_vec, doc_vec) / (query_norm * doc_norm)
            else:
                similarity = 0.0
            doc["reranker_score"] = float(similarity)

        return documents

    async def rerank_with_merge(
        self,
        query: str,
        document_results: List[Dict[str, Any]],
        web_results: List[Dict[str, Any]],
        top_k: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Merge and rerank documents and web results.

        Args:
            query: User query
            document_results: Document search results
            web_results: Web search results
            top_k: Number of top results to return

        Returns:
            Merged and reranked results
        """
        all_results = []

        for doc in document_results:
            all_results.append(
                {
                    "content": doc.get("content", ""),
                    "source": "document",
                    "metadata": doc,
                }
            )

        for web in web_results:
            all_results.append(
                {
                    "content": web.get("snippet", web.get("content", "")),
                    "source": "web",
                    "metadata": web,
                }
            )

        return await self.rerank(query, all_results, top_k=top_k)


_reranker_service: Optional[BAAIRerankerService] = None


def get_reranker_service() -> BAAIRerankerService:
    """Get or create singleton reranker service instance."""
    global _reranker_service
    if _reranker_service is None:
        _reranker_service = BAAIRerankerService()
    return _reranker_service
