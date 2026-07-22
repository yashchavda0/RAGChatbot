"""
URL Processing Agent - Execution

Fetches and processes content from URLs provided by users.
Extracts text and metadata from web pages for indexing.
"""

import asyncio
import re
import aiohttp
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config.logging_config import get_logger

logger = get_logger(__name__)

# URL regex pattern
URL_PATTERN = re.compile(
    r"https?://"  # http:// or https://
    r"(?:\S+(?::\S*)?@)?"  # optional user:pass@
    r"(?:"
    r"(?P<ip>(?:\d{1,3}\.){3}\d{1,3})|"  # IP
    r"(?P<domain>(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})"  # domain
    r")"
    r"(?::\d{2,5})?"  # optional port
    r'(?:/[^\s<>"{}|\\^`\[\]]*)?'  # path
    r'(?:\?[^\s<>"{}|\\^`\[\]]*)?'  # query string
    r'(?:#[^\s<>"{}|\\^`\[\]]*)?',  # fragment
    re.IGNORECASE,
)

# Headers to avoid being blocked
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
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
            resolved_ips = socket.getaddrinfo(
                hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM
            )
            for _, _, _, _, addr in resolved_ips:
                ip = ipaddress.ip_address(addr[0])
                if (
                    ip.is_private
                    or ip.is_loopback
                    or ip.is_link_local
                    or ip.is_reserved
                ):
                    return False
                # Block cloud metadata endpoint
                if str(ip) == "169.254.169.254":
                    return False
        except (socket.gaierror, ValueError):
            return False
        return True
    except Exception:
        return False


async def fetch_page_links(
    url: str,
    timeout: aiohttp.ClientTimeout = aiohttp.ClientTimeout(total=30),
) -> List[Dict[str, str]]:
    """Fetch a page and extract all links with their anchor text."""
    import ssl

    try:
        # Create permissive SSL context
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        connector = aiohttp.TCPConnector(ssl=ssl_context)

        async with aiohttp.ClientSession(
            timeout=timeout, connector=connector
        ) as session:
            async with session.get(
                url,
                headers=DEFAULT_HEADERS,
                allow_redirects=True,
                max_redirects=10,
            ) as response:
                if response.status != 200:
                    logger.warning(f"Failed to fetch {url}: HTTP {response.status}")
                    return []

                content_type = response.headers.get("Content-Type", "")
                if not content_type.startswith(("text/html", "application/xhtml")):
                    return []

                html_content = await response.text()
                soup = BeautifulSoup(html_content, "lxml")

                links = []
                for a_tag in soup.find_all("a", href=True):
                    href = a_tag["href"]
                    text = a_tag.get_text(strip=True) or href
                    if href and not href.startswith(
                        ("#", "javascript:", "mailto:", "tel:")
                    ):
                        links.append({"href": href, "text": text[:200]})

                return links
    except Exception as e:
        logger.warning(f"Error fetching links from {url}: {e}")
        return []


async def fetch_page_metadata(
    url: str,
    timeout: aiohttp.ClientTimeout = aiohttp.ClientTimeout(total=15),
) -> Dict[str, str]:
    """Fetch only title and meta description from a URL (lightweight)."""
    import ssl

    try:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        async with aiohttp.ClientSession(
            timeout=timeout, connector=connector
        ) as session:
            async with session.get(
                url, headers=DEFAULT_HEADERS, allow_redirects=True, max_redirects=5
            ) as response:
                if response.status != 200:
                    return {"url": url, "title": url, "description": ""}
                content_type = response.headers.get("Content-Type", "")
                if not content_type.startswith(("text/html", "application/xhtml")):
                    return {"url": url, "title": url, "description": ""}
                html = await response.content.read(50000)
                html_text = html.decode("utf-8", errors="ignore")
                soup = BeautifulSoup(html_text, "lxml")
                title = soup.title.get_text(strip=True) if soup.title else url
                description = ""
                meta_desc = soup.find("meta", attrs={"name": "description"})
                if meta_desc and meta_desc.get("content"):
                    description = meta_desc["content"][:300]
                return {"url": url, "title": title[:200], "description": description}
    except Exception:
        return {"url": url, "title": url, "description": ""}


async def crawl_url(
    start_url: str,
    max_depth: int = 2,
    max_links: int = 100,
    same_domain_only: bool = True,
    timeout_seconds: int = 60,
    fetch_metadata: bool = False,
) -> Dict[str, Any]:
    """
    Multi-level crawl to discover links using BFS.

    Args:
        start_url: Starting URL to crawl
        max_depth: Maximum depth to follow links (0 = only start page)
        max_links: Maximum number of links to discover
        same_domain_only: Only follow links to same domain
        timeout_seconds: Total crawl timeout
        fetch_metadata: Fetch title and description for each discovered page

    Returns:
        Dict with discovered_links, total_discovered, crawl_depth_reached
    """
    import time

    start_time = time.time()
    base_domain = urlparse(start_url).netloc
    visited = set()
    discovered = []
    queue = [(start_url, 0)]
    max_depth_reached = 0

    while queue and len(discovered) < max_links:
        if time.time() - start_time > timeout_seconds:
            logger.warning(f"Crawl timeout reached after {timeout_seconds}s")
            break

        url, depth = queue.pop(0)

        if url in visited:
            continue
        if depth > max_depth:
            continue
        if not is_valid_url(url):
            continue

        visited.add(url)
        max_depth_reached = max(max_depth_reached, depth)

        page_links = await fetch_page_links(url)

        for link in page_links:
            if len(discovered) >= max_links:
                break

            full_url = urljoin(url, link["href"])
            full_url = full_url.split("#")[0]

            if not full_url.startswith(("http://", "https://")):
                continue

            link_domain = urlparse(full_url).netloc
            if same_domain_only and link_domain != base_domain:
                continue

            if full_url not in visited and full_url not in [
                d["url"] for d in discovered
            ]:
                discovered.append(
                    {
                        "url": full_url,
                        "text": link["text"],
                        "title": "",
                        "description": "",
                    }
                )
                if depth < max_depth:
                    queue.append((full_url, depth + 1))

    logger.info(f"Crawl completed: {len(discovered)} links from {len(visited)} pages")

    # Enrich discovered links with page metadata (title, description)
    if fetch_metadata and discovered:
        semaphore = asyncio.Semaphore(10)

        async def _fetch_with_semaphore(link_url: str) -> Dict[str, str]:
            async with semaphore:
                return await fetch_page_metadata(link_url)

        metadata_results = await asyncio.gather(
            *[_fetch_with_semaphore(d["url"]) for d in discovered]
        )
        for link, meta in zip(discovered, metadata_results):
            link["title"] = meta.get("title", link["url"])
            link["description"] = meta.get("description", "")

    return {
        "source_url": start_url,
        "discovered_links": discovered,
        "total_discovered": len(discovered),
        "pages_visited": len(visited),
        "crawl_depth_reached": max_depth_reached,
    }


@register_agent(
    agent_id="url_processing",
    name="URL Processing",
    capabilities=["url", "web", "scraping", "content_extraction"],
    description="Processes URL content and extracts text",
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

            # Process each URL with permissive SSL
            import ssl

            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            connector = aiohttp.TCPConnector(ssl=ssl_context)

            async with aiohttp.ClientSession(
                timeout=self.timeout, connector=connector
            ) as session:
                for url in unique_urls:
                    try:
                        result = await self._fetch_and_parse(session, url)
                        if result:
                            url_results.append(result)
                    except Exception as e:
                        logger.error(f"Error processing URL {url}: {e}")
                        url_results.append(
                            {
                                "url": url,
                                "error": str(e),
                                "text": "",
                            }
                        )

            # Update state with results
            state["url_results"] = url_results

            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="completed",
                output_data={
                    "results_count": len(url_results),
                    "total_text_length": sum(
                        len(r.get("text", "")) for r in url_results
                    ),
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
                if not content_type.startswith(
                    ("text/html", "text/plain", "application/xhtml")
                ):
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
                for element in soup(
                    ["script", "style", "nav", "header", "footer", "aside"]
                ):
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
                for selector in [
                    "article",
                    "main",
                    "[role='main']",
                    ".content",
                    "#content",
                    ".post",
                    ".article",
                ]:
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

                logger.info(
                    f"Successfully processed URL: {url} ({len(clean_text)} chars)"
                )

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
