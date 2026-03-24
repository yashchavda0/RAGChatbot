"""
Tavily web search service for real-time web search integration.
"""
import asyncio
import os
from typing import List, Dict, Any, Optional
from tavily import TavilyClient
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


class TavilyService:
    """Service for web search using Tavily API."""

    def __init__(self):
        """Initialize the Tavily service."""
        self.api_key = settings.tavily_api_key

        if not self.api_key:
            logger.warning("TAVILY_API_KEY not set")

        self.client = TavilyClient(api_key=self.api_key)
        self.max_results = settings.tavily_max_results

        logger.info("Tavily search service initialized")

    async def search(
        self,
        query: str,
        max_results: Optional[int] = None,
        search_depth: str = "basic",
        include_domains: Optional[List[str]] = None,
        exclude_domains: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Perform web search using Tavily.

        Args:
            query: Search query
            max_results: Maximum number of results
            search_depth: "basic" or "advanced"
            include_domains: List of domains to include
            exclude_domains: List of domains to exclude

        Returns:
            List of search results
        """
        try:
            max_results = max_results or self.max_results

            logger.info(f"Tavily search: {query[:50]}... (max_results: {max_results})")

            # Execute search in thread pool to avoid blocking
            loop = asyncio.get_event_loop()

            def _search():
                return self.client.search(
                    query=query,
                    search_depth=search_depth,
                    max_results=max_results,
                    include_domains=include_domains,
                    exclude_domains=exclude_domains,
                    include_answer=False,
                    include_raw_content=False,
                    include_images=False,
                )

            response = await loop.run_in_executor(None, _search)

            # Format results
            results = []

            for result in response.get("results", []):
                results.append({
                    "title": result.get("title", ""),
                    "url": result.get("url", ""),
                    "content": result.get("content", ""),
                    "snippet": result.get("content", "")[:500],
                    "score": result.get("score", 0.0),
                    "published_date": result.get("published_date"),
                    "source": "web",
                })

            logger.info(f"Tavily search returned {len(results)} results")

            return results

        except Exception as e:
            logger.error(f"Error in Tavily search: {e}")
            return []

    async def search_with_answer(
        self,
        query: str,
        max_results: int = 10,
    ) -> Dict[str, Any]:
        """
        Perform search and get AI-generated answer.

        Args:
            query: Search query
            max_results: Maximum results

        Returns:
            Dictionary with answer and results
        """
        try:
            logger.info(f"Tavily search with answer: {query[:50]}...")

            response = self.client.search(
                query=query,
                search_depth="advanced",
                max_results=max_results,
                include_answer=True,
                include_raw_content=False,
            )

            results = []

            for result in response.get("results", []):
                results.append({
                    "title": result.get("title", ""),
                    "url": result.get("url", ""),
                    "content": result.get("content", ""),
                    "snippet": result.get("content", "")[:500],
                    "score": result.get("score", 0.0),
                })

            return {
                "answer": response.get("answer", ""),
                "results": results,
            }

        except Exception as e:
            logger.error(f"Error in Tavily search with answer: {e}")
            return {"answer": "", "results": []}
