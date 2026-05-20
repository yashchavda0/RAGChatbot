"""
URL Processing Agent - Execution

Fetches and processes content from URLs provided by users.
Extracts text and metadata from web pages for indexing.
"""
import re
import aiohttp
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config.logging_config import get_logger

logger = get_logger(__name__)

# URL regex pattern
URL_PATTERN = re.compile(
    r'https?://'  # http:// or https://
    r'(?:\S+(?::\S*)?@)?'  # optional user:pass@
    r'(?:'
    r'(?P<ip>(?:\d{1,3}\.){3}\d{1,3})|'  # IP
    r'(?P<domain>(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})'  # domain
    r')'
    r'(?::\d{2,5})?'  # optional port
    r'(?:/[^\s<>"{}|\\^`\[\]]*)?'  # path
    r'(?:\?[^\s<>"{}|\\^`\[\]]*)?'  # query string
    r'(?:#[^\s<>"{}|\\^`\[\]]*)?',  # fragment
    re.IGNORECASE
)

# Headers to avoid being blocked
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
}


def extract_urls(text: str) -> List[str]:
    """Extract all HTTP/HTTPS URLs from text."""
    urls = URL_PATTERN.findall(text)
    # Return full URL strings
    return [match[0] if isinstance(match, tuple) else match for match in urls]


def is_valid_url(url: str) -> bool:
    """Check if URL is valid and safe to fetch."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        if not parsed.netloc:
            return False
        # Block local/private addresses for security (RFC 1918 + special-use)
        import ipaddress
        import socket
        hostname = parsed.hostname or ""
        blocked_hostnames = [
            "localhost",
            "0.0.0.0",
            "::1",
        ]
        for pattern in blocked_hostnames:
            if hostname == pattern:
                return False
        # Resolve hostname and check IP ranges
        try:
            resolved_ips = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
            for _, _, _, _, addr in resolved_ips:
                ip = ipaddress.ip_address(addr[0])
                if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                    return False
                # Block cloud metadata endpoint
                if str(ip) == "169.254.169.254":
                    return False
        except (socket.gaierror, ValueError):
            return False
        return True
    except Exception:
        return False


@register_agent(
    agent_id="url_processing",
    name="URL Processing",
    capabilities=["url", "web", "scraping", "content_extraction"],
    description="Processes URL content and extracts text"
)
class URLProcessingAgent(BaseAgent):
    """Process URL content."""

    def __init__(self):
        super().__init__()
        self.timeout = aiohttp.ClientTimeout(total=30)
        self.max_content_length = 10 * 1024 * 1024  # 10 MB

    async def execute(self, state: RAGState) -> RAGState:
        """Process URL content."""
        logger.info("Processing URL...")

        state = update_agent_execution(
            state,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status="running",
            input_data={"query": state["query"][:100]},
        )

        try:
            query = state.get("query", "")
            metadata = state.get("metadata", {})

            # Get URLs from query and metadata
            urls = extract_urls(query)

            # Add URLs from metadata (if pre-processed)
            metadata_urls = metadata.get("urls", [])
            urls.extend(metadata_urls)

            # Filter valid URLs
            valid_urls = [url for url in urls if is_valid_url(url)]

            if not valid_urls:
                logger.info("No valid URLs found to process")
                state["url_results"] = []
                state = update_agent_execution(
                    state,
                    agent_id=self.agent_id,
                    agent_name=self.agent_name,
                    status="completed",
                    output_data={"results_count": 0, "message": "No valid URLs found"},
                )
                return state

            # Remove duplicates while preserving order
            seen = set()
            unique_urls = []
            for url in valid_urls:
                if url not in seen:
                    seen.add(url)
                    unique_urls.append(url)

            logger.info(f"Processing {len(unique_urls)} unique URLs")

            url_results: List[Dict[str, Any]] = []

            # Process each URL
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                for url in unique_urls:
                    try:
                        result = await self._fetch_and_parse(session, url)
                        if result:
                            url_results.append(result)
                    except Exception as e:
                        logger.error(f"Error processing URL {url}: {e}")
                        url_results.append({
                            "url": url,
                            "error": str(e),
                            "text": "",
                        })

            # Update state with results
            state["url_results"] = url_results

            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="completed",
                output_data={
                    "results_count": len(url_results),
                    "total_text_length": sum(len(r.get("text", "")) for r in url_results),
                },
            )

            logger.info(f"URL processing completed: {len(url_results)} URLs processed")

        except Exception as e:
            logger.error(f"URL processing agent error: {e}")
            state["url_results"] = []
            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="failed",
                output_data={},
                error_message=str(e),
            )

        return state

    async def _fetch_and_parse(
        self,
        session: aiohttp.ClientSession,
        url: str,
    ) -> Optional[Dict[str, Any]]:
        """Fetch URL content and extract text."""
        try:
            async with session.get(
                url,
                headers=DEFAULT_HEADERS,
                allow_redirects=True,
                max_redirects=5,
            ) as response:
                if response.status != 200:
                    return {
                        "url": url,
                        "error": f"HTTP {response.status}",
                        "text": "",
                        "status_code": response.status,
                    }

                # Check content type
                content_type = response.headers.get("Content-Type", "")
                if not content_type.startswith(("text/html", "text/plain", "application/xhtml")):
                    return {
                        "url": url,
                        "error": f"Unsupported content type: {content_type}",
                        "text": "",
                        "content_type": content_type,
                    }

                # Check content length
                content_length = response.content_length
                if content_length and content_length > self.max_content_length:
                    return {
                        "url": url,
                        "error": f"Content too large: {content_length} bytes",
                        "text": "",
                    }

                # Read content
                html_content = await response.text()

                # Parse with BeautifulSoup
                soup = BeautifulSoup(html_content, "lxml")

                # Remove script and style elements
                for element in soup(["script", "style", "nav", "header", "footer", "aside"]):
                    element.decompose()

                # Extract title
                title = ""
                if soup.title:
                    title = soup.title.get_text(strip=True)

                # Extract meta description
                description = ""
                meta_desc = soup.find("meta", attrs={"name": "description"})
                if meta_desc and meta_desc.get("content"):
                    description = meta_desc["content"]

                # Extract main content
                # Try common content containers
                main_content = None
                for selector in ["article", "main", "[role='main']", ".content", "#content", ".post", ".article"]:
                    main_content = soup.select_one(selector)
                    if main_content:
                        break

                if not main_content:
                    main_content = soup.body if soup.body else soup

                # Get text
                text = main_content.get_text(separator="\n", strip=True)

                # Clean up whitespace
                lines = [line.strip() for line in text.split("\n") if line.strip()]
                clean_text = "\n".join(lines)

                # Extract links (optional)
                links = []
                for link in soup.find_all("a", href=True):
                    href = link["href"]
                    link_text = link.get_text(strip=True)
                    if href and link_text and not href.startswith(("#", "javascript:")):
                        links.append({"url": href, "text": link_text})

                result = {
                    "url": url,
                    "title": title,
                    "description": description,
                    "text": clean_text[:50000],  # Limit text length
                    "text_length": len(clean_text),
                    "links": links[:50],  # Limit links
                    "content_type": content_type,
                    "status_code": response.status,
                }

                logger.info(f"Successfully processed URL: {url} ({len(clean_text)} chars)")

                return result

        except aiohttp.ClientError as e:
            logger.error(f"HTTP error fetching {url}: {e}")
            return {
                "url": url,
                "error": f"HTTP error: {str(e)}",
                "text": "",
            }
        except Exception as e:
            logger.error(f"Error parsing {url}: {e}")
            return {
                "url": url,
                "error": str(e),
                "text": "",
            }
