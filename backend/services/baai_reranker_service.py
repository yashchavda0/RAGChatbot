"""
Reranker service using Gemini LLM for relevance scoring.
Replaces the local BAAI/FlagEmbedding reranker to eliminate torch dependency.
"""
import asyncio
import json
from typing import List, Dict, Any, Optional
from google import generativeai as genai
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


class BAARerankerService:
    """Service for reranking search results using Gemini."""

    def __init__(self):
        genai.configure(api_key=settings.gemini_api_key)
        self.model_name = settings.gemini_model
        self.top_k = settings.reranker_top_k
        logger.info(f"Gemini Reranker service initialized (model: {self.model_name})")

    async def rerank(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        top_k: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        if not documents:
            return []

        top_k = top_k or self.top_k

        try:
            logger.info(f"Reranking {len(documents)} documents with Gemini")

            scored_docs = await self._score_with_gemini(query, documents)

            scored_docs.sort(key=lambda x: x.get("reranker_score", 0), reverse=True)
            result = scored_docs[:top_k]

            if result:
                logger.info(f"Reranking complete, top score: {result[0].get('reranker_score', 0):.2f}")

            return result

        except Exception as e:
            logger.error(f"Error in Gemini reranking: {e}")
            return documents[:top_k]

    async def _score_with_gemini(
        self,
        query: str,
        documents: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Score documents using Gemini in batches."""
        batch_size = 20
        all_scored = []

        for i in range(0, len(documents), batch_size):
            batch = documents[i : i + batch_size]
            scored_batch = await self._score_batch(query, batch)
            all_scored.extend(scored_batch)

        return all_scored

    async def _score_batch(
        self,
        query: str,
        documents: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Score a batch of documents via Gemini."""
        loop = asyncio.get_event_loop()

        doc_entries = []
        for idx, doc in enumerate(documents):
            content = doc.get("content", "")[:500]
            doc_entries.append(f"[{idx}] {content}")

        docs_text = "\n".join(doc_entries)

        prompt = (
            f"Rate the relevance of each document to the query on a scale of 0 to 100.\n"
            f"Query: {query}\n\n"
            f"Documents:\n{docs_text}\n\n"
            f"Respond with ONLY a JSON object mapping document index to score. "
            f"Example: {{\"0\": 85, \"1\": 42}}\n"
            f"No explanation, just the JSON."
        )

        def _call():
            model = genai.GenerativeModel(model_name=self.model_name)
            response = model.generate_content(prompt)
            return response.parts[0].text if response.parts else ""

        try:
            raw = await loop.run_in_executor(None, _call)
            # Strip markdown code fences if present
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()

            scores = json.loads(raw)

            for idx, doc in enumerate(documents):
                score = scores.get(str(idx), 50)
                doc["reranker_score"] = float(score) / 100.0

        except (json.JSONDecodeError, Exception) as e:
            logger.warning(f"Gemini reranker parse error, using default scores: {e}")
            for doc in documents:
                doc["reranker_score"] = 0.5

        return documents

    async def rerank_with_merge(
        self,
        query: str,
        document_results: List[Dict[str, Any]],
        web_results: List[Dict[str, Any]],
        top_k: int = 10,
    ) -> List[Dict[str, Any]]:
        all_results = []
        for doc in document_results:
            all_results.append({"content": doc.get("content", ""), "source": "document", "metadata": doc})
        for web in web_results:
            all_results.append({"content": web.get("snippet", web.get("content", "")), "source": "web", "metadata": web})
        return await self.rerank(query, all_results, top_k=top_k)


_reranker_service: Optional[BAARerankerService] = None


def get_reranker_service() -> BAARerankerService:
    global _reranker_service
    if _reranker_service is None:
        _reranker_service = BAARerankerService()
    return _reranker_service
