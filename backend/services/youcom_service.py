"""
You.com web search service for real-time web and news search integration.

API docs: https://you.com/docs/api-reference/search/v1-search
"""
import asyncio
from typing import List, Dict, Any, Optional

import aiohttp

from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)

YOUCOM_API_BASE = "https://api.you.com"


class YouComService:
    """Service for web search using You.com Search API."""

    def __init__(self):
        self.api_key = settings.youcom_api_key
        if not self.api_key:
            logger.warning("YOUCOM_API_KEY not set — You.com search disabled")
        self.max_results = settings.youcom_max_results
        logger.info("You.com search service initialized")

    async def search(
        self,
        query: str,
        max_results: Optional[int] = None,
        freshness: Optional[str] = None,
        include_domains: Optional[List[str]] = None,
        exclude_domains: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Perform web search using You.com.

        Args:
            query: Search query
            max_results: Maximum number of results (up to 100)
            freshness: "day", "week", "month", "year", or "YYYY-MM-DDtoYYYY-MM-DD"
            include_domains: List of domains to include
            exclude_domains: List of domains to exclude

        Returns:
            List of search results (same format as TavilyService for compatibility)
        """
        if not self.api_key:
            logger.warning("You.com search skipped — no API key")
            return []

        try:
            count = max_results or self.max_results

            logger.info(f"You.com search: {query[:50]}... (count: {count})")

            params: Dict[str, Any] = {
                "query": query,
                "count": count,
            }
            if freshness:
                params["freshness"] = freshness
            if include_domains:
                params["include_domains"] = ",".join(include_domains)
            if exclude_domains:
                params["exclude_domains"] = ",".join(exclude_domains)

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{YOUCOM_API_BASE}/v1/search",
                    params=params,
                    headers={
                        "X-API-Key": self.api_key,
                        "Accept": "application/json",
                    },
                ) as resp:
                    resp.raise_for_status()
                    data = await resp.json()

            results = []

            # Process web results
            for hit in data.get("results", {}).get("web", []):
                snippets = hit.get("snippets", [])
                content = hit.get("description", "")
                if snippets:
                    content = snippets[0]

                results.append({
                    "title": hit.get("title", ""),
                    "url": hit.get("url", ""),
                    "content": content,
                    "snippet": content[:500],
                    "score": 0.0,
                    "published_date": hit.get("page_age"),
                    "source": "youcom_web",
                })

            # Process news results
            for hit in data.get("results", {}).get("news", []):
                results.append({
                    "title": hit.get("title", ""),
                    "url": hit.get("url", ""),
                    "content": hit.get("description", ""),
                    "snippet": hit.get("description", "")[:500],
                    "score": 0.0,
                    "published_date": hit.get("page_age"),
                    "source": "youcom_news",
                })

            logger.info(f"You.com search returned {len(results)} results")
            return results

        except Exception as e:
            logger.error(f"Error in You.com search: {e}")
            return []


# Global singleton
_youcom_service: Optional["YouComService"] = None


def get_youcom_service() -> YouComService:
    """Get or create the global You.com service instance."""
    global _youcom_service
    if _youcom_service is None:
        _youcom_service = YouComService()
    return _youcom_service
