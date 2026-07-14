"""
BM25 service for keyword-based search.
Provides hybrid search capability when combined with vector embeddings.
"""
import re
from typing import List, Dict, Tuple, Optional
from rank_bm25 import BM25Okapi
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


class BM25Service:
    """
    In-memory BM25 index for keyword matching.
    Maintains separate indexes per chatbot for multi-tenancy.
    """

    def __init__(self):
        self._indexes: Dict[str, BM25Okapi] = {}
        self._corpus: Dict[str, List[str]] = {}
        self._chunk_ids: Dict[str, List[str]] = {}
        logger.info("BM25 service initialized")

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        """Simple tokenization: lowercase, split on non-alphanumeric."""
        text = text.lower()
        tokens = re.findall(r'\b\w+\b', text)
        return tokens

    def build_index(
        self,
        chatbot_id: str,
        chunks: List[str],
        chunk_ids: Optional[List[str]] = None,
    ) -> None:
        """
        Build BM25 index for a chatbot's documents.

        Args:
            chatbot_id: Chatbot identifier
            chunks: List of text chunks
            chunk_ids: Optional list of chunk IDs (for result mapping)
        """
        if not chunks:
            logger.warning(f"No chunks provided for BM25 index: {chatbot_id}")
            return

        tokenized = [self._tokenize(chunk) for chunk in chunks]
        self._indexes[chatbot_id] = BM25Okapi(tokenized)
        self._corpus[chatbot_id] = chunks
        self._chunk_ids[chatbot_id] = chunk_ids or [str(i) for i in range(len(chunks))]

        logger.info(f"Built BM25 index for chatbot {chatbot_id}: {len(chunks)} chunks")

    def add_documents(
        self,
        chatbot_id: str,
        chunks: List[str],
        chunk_ids: Optional[List[str]] = None,
    ) -> None:
        """
        Add documents to existing index (rebuilds index).

        Args:
            chatbot_id: Chatbot identifier
            chunks: New chunks to add
            chunk_ids: Optional chunk IDs
        """
        existing_chunks = self._corpus.get(chatbot_id, [])
        existing_ids = self._chunk_ids.get(chatbot_id, [])

        new_ids = chunk_ids or [f"new_{i}" for i in range(len(chunks))]

        all_chunks = existing_chunks + chunks
        all_ids = existing_ids + new_ids

        self.build_index(chatbot_id, all_chunks, all_ids)

    def search(
        self,
        chatbot_id: str,
        query: str,
        top_k: int = 20,
    ) -> List[Dict[str, any]]:
        """
        Search using BM25.

        Args:
            chatbot_id: Chatbot to search
            query: Search query
            top_k: Number of results

        Returns:
            List of dicts with chunk_id, content, and bm25_score
        """
        if chatbot_id not in self._indexes:
            logger.debug(f"No BM25 index for chatbot {chatbot_id}")
            return []

        tokenized_query = self._tokenize(query)
        if not tokenized_query:
            return []

        bm25 = self._indexes[chatbot_id]
        scores = bm25.get_scores(tokenized_query)

        # Get top-k indices
        indexed_scores = list(enumerate(scores))
        indexed_scores.sort(key=lambda x: x[1], reverse=True)
        top_results = indexed_scores[:top_k]

        results = []
        corpus = self._corpus[chatbot_id]
        chunk_ids = self._chunk_ids[chatbot_id]

        for idx, score in top_results:
            if score > 0:  # Only include non-zero scores
                results.append({
                    "chunk_id": chunk_ids[idx],
                    "content": corpus[idx],
                    "bm25_score": float(score),
                    "index": idx,
                })

        logger.debug(f"BM25 search for '{query[:30]}...' returned {len(results)} results")
        return results

    def has_index(self, chatbot_id: str) -> bool:
        """Check if chatbot has a BM25 index."""
        return chatbot_id in self._indexes

    def delete_index(self, chatbot_id: str) -> None:
        """Delete BM25 index for a chatbot."""
        self._indexes.pop(chatbot_id, None)
        self._corpus.pop(chatbot_id, None)
        self._chunk_ids.pop(chatbot_id, None)
        logger.info(f"Deleted BM25 index for chatbot {chatbot_id}")

    def get_stats(self, chatbot_id: Optional[str] = None) -> Dict[str, any]:
        """Get BM25 index statistics."""
        if chatbot_id:
            if chatbot_id in self._corpus:
                return {
                    "chatbot_id": chatbot_id,
                    "chunk_count": len(self._corpus[chatbot_id]),
                    "has_index": True,
                }
            return {"chatbot_id": chatbot_id, "has_index": False}

        return {
            "total_indexes": len(self._indexes),
            "chatbot_ids": list(self._indexes.keys()),
            "total_chunks": sum(len(c) for c in self._corpus.values()),
        }


def fuse_results(
    vector_results: List[Dict[str, any]],
    bm25_results: List[Dict[str, any]],
    bm25_weight: float = 0.3,
    method: str = "rrf",
    rrf_k: int = 60,
) -> List[Dict[str, any]]:
    """
    Fuse vector search and BM25 results.

    Args:
        vector_results: Results from vector search
        bm25_results: Results from BM25 search
        bm25_weight: Weight for BM25 (1-bm25_weight for vector)
        method: Fusion method ('rrf' or 'weighted')
        rrf_k: RRF constant (default 60)

    Returns:
        Fused and re-ranked results
    """
    if method == "rrf":
        return _rrf_fusion(vector_results, bm25_results, rrf_k)
    else:
        return _weighted_fusion(vector_results, bm25_results, bm25_weight)


def _rrf_fusion(
    vector_results: List[Dict[str, any]],
    bm25_results: List[Dict[str, any]],
    k: int = 60,
) -> List[Dict[str, any]]:
    """
    Reciprocal Rank Fusion.
    RRF score = sum(1 / (k + rank)) across all result lists.
    """
    scores: Dict[str, float] = {}
    items: Dict[str, Dict] = {}

    # Process vector results
    for rank, item in enumerate(vector_results):
        chunk_id = item.get("chunk_id") or item.get("id")
        if chunk_id:
            scores[chunk_id] = scores.get(chunk_id, 0) + 1 / (k + rank + 1)
            items[chunk_id] = item

    # Process BM25 results
    for rank, item in enumerate(bm25_results):
        chunk_id = item.get("chunk_id")
        if chunk_id:
            scores[chunk_id] = scores.get(chunk_id, 0) + 1 / (k + rank + 1)
            if chunk_id not in items:
                items[chunk_id] = item

    # Sort by RRF score
    sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

    results = []
    for chunk_id in sorted_ids:
        item = items[chunk_id].copy()
        item["fusion_score"] = scores[chunk_id]
        results.append(item)

    return results


def _weighted_fusion(
    vector_results: List[Dict[str, any]],
    bm25_results: List[Dict[str, any]],
    bm25_weight: float = 0.3,
) -> List[Dict[str, any]]:
    """
    Weighted score fusion.
    Combined score = (1 - bm25_weight) * vector_score + bm25_weight * normalized_bm25_score
    """
    scores: Dict[str, float] = {}
    items: Dict[str, Dict] = {}
    vector_weight = 1 - bm25_weight

    # Normalize BM25 scores to 0-1 range
    bm25_max = max((r.get("bm25_score", 0) for r in bm25_results), default=1) or 1

    # Process vector results
    for item in vector_results:
        chunk_id = item.get("chunk_id") or item.get("id")
        if chunk_id:
            vector_score = item.get("score", 0)
            scores[chunk_id] = vector_weight * vector_score
            items[chunk_id] = item

    # Process BM25 results
    for item in bm25_results:
        chunk_id = item.get("chunk_id")
        if chunk_id:
            normalized_bm25 = item.get("bm25_score", 0) / bm25_max
            scores[chunk_id] = scores.get(chunk_id, 0) + bm25_weight * normalized_bm25
            if chunk_id not in items:
                items[chunk_id] = item

    # Sort by combined score
    sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

    results = []
    for chunk_id in sorted_ids:
        item = items[chunk_id].copy()
        item["fusion_score"] = scores[chunk_id]
        results.append(item)

    return results


_bm25_service: Optional[BM25Service] = None


def get_bm25_service() -> BM25Service:
    """Get or create the global BM25 service."""
    global _bm25_service
    if _bm25_service is None:
        _bm25_service = BM25Service()
    return _bm25_service
