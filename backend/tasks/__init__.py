"""Celery tasks for async processing."""
from .document_tasks import (
    process_document_async,
    process_batch_documents_async,
)
from .url_tasks import (
    crawl_urls_async,
    process_url_content_async,
)

__all__ = [
    'process_document_async',
    'process_batch_documents_async',
    'crawl_urls_async',
    'process_url_content_async',
]
