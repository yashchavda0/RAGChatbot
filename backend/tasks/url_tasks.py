"""
URL processing tasks for Celery.
Handles async URL crawling and content extraction.
"""
import asyncio
from typing import Dict, Any, List
from celery_app import celery_app
from tasks.base import CallbackTask
from config.logging_config import get_logger

logger = get_logger(__name__)


@celery_app.task(
    base=CallbackTask,
    bind=True,
    name='tasks.crawl_urls',
    max_retries=2,
    default_retry_delay=30,
)
def crawl_urls_async(
    self,
    urls: List[str],
    chatbot_id: str,
    max_depth: int = 2,
    max_links_per_url: int = 100,
) -> Dict[str, Any]:
    """
    Crawl multiple URLs asynchronously.
    
    Args:
        urls: List of starting URLs to crawl
        chatbot_id: ID of the chatbot
        max_depth: Maximum crawl depth
        max_links_per_url: Maximum links to discover per URL
    
    Returns:
        Crawl results with discovered links
    """
    from agents.execution.url_processing import crawl_url
    
    logger.info(f"Starting URL crawl for {len(urls)} URLs")
    
    total_urls = len(urls)
    all_results = []
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        for idx, url in enumerate(urls):
            progress = int((idx / total_urls) * 90)  # Reserve 90% for crawling
            self.update_progress(
                progress,
                f"Crawling URL {idx + 1}/{total_urls}: {url[:50]}..."
            )
            
            # Crawl the URL
            result = loop.run_until_complete(
                crawl_url(
                    start_url=url,
                    max_depth=max_depth,
                    max_links=max_links_per_url,
                    same_domain_only=True,
                    timeout_seconds=120,
                )
            )
            
            all_results.append({
                "url": url,
                "discovered_links": result.get("discovered_links", []),
                "total_discovered": result.get("total_discovered", 0),
                "pages_visited": result.get("pages_visited", 0),
                "crawl_depth": result.get("crawl_depth_reached", 0),
            })
        
        self.update_progress(100, "Crawl completed")
        
        total_links = sum(r["total_discovered"] for r in all_results)
        logger.info(f"Crawl completed: {total_links} total links discovered")
        
        return {
            "urls_crawled": len(urls),
            "total_links_discovered": total_links,
            "results": all_results,
            "status": "completed",
        }
        
    except Exception as e:
        logger.error(f"Error during URL crawl: {e}")
        raise
    finally:
        loop.close()


@celery_app.task(
    base=CallbackTask,
    bind=True,
    name='tasks.process_url_content',
    max_retries=2,
)
def process_url_content_async(
    self,
    url: str,
    chatbot_id: str,
    document_id: str,
) -> Dict[str, Any]:
    """
    Fetch and process content from a single URL.
    
    Args:
        url: URL to process
        chatbot_id: ID of the chatbot
        document_id: Document ID for storage
    
    Returns:
        Processing result
    """
    import aiohttp
    from bs4 import BeautifulSoup
    from services.chunking_service import ChunkingService
    from services.embedding_service import get_embedding_service
    from services.milvus_service import get_milvus_service
    
    logger.info(f"Processing URL content: {url}")
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        # Fetch URL content
        self.update_progress(20, "Fetching URL content...")
        
        async def fetch_content():
            timeout = aiohttp.ClientTimeout(total=30)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(url) as response:
                    if response.status != 200:
                        raise ValueError(f"HTTP {response.status}")
                    return await response.text()
        
        html_content = loop.run_until_complete(fetch_content())
        
        # Extract text
        self.update_progress(40, "Extracting text...")
        soup = BeautifulSoup(html_content, "lxml")
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        text = soup.get_text(separator="\n", strip=True)
        
        if not text:
            raise ValueError("No text extracted from URL")
        
        # Chunk text
        self.update_progress(60, "Chunking content...")
        chunker = ChunkingService()
        chunk_result = chunker.split_text(text)
        chunks = [c["content"] for c in chunk_result]
        
        # Generate embeddings
        self.update_progress(75, "Generating embeddings...")
        embedding_service = get_embedding_service()
        all_embeddings = loop.run_until_complete(
            embedding_service.embed_documents_with_all_models(chunks)
        )
        
        # Insert into Milvus
        self.update_progress(90, "Indexing vectors...")
        milvus_service = get_milvus_service()
        loop.run_until_complete(
            milvus_service.insert_embeddings(
                embeddings=all_embeddings,
                chatbot_id=chatbot_id,
                document_id=document_id,
                chunks=chunks,
                metadata=[
                    {
                        "url": url,
                        "source_type": "url",
                        "document_name": url,
                    }
                ] * len(chunks),
            )
        )
        
        logger.info(f"URL processed successfully: {url} ({len(chunks)} chunks)")
        
        return {
            "url": url,
            "document_id": document_id,
            "chunks_created": len(chunks),
            "status": "completed",
        }
        
    except Exception as e:
        logger.error(f"Error processing URL {url}: {e}")
        raise
    finally:
        loop.close()
