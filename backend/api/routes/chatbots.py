"""
Chatbot management API routes.
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel, Field

from config.logging_config import get_logger
from services.chatbot_service import get_chatbot_service
from services.milvus_service import get_milvus_service
from services.chunking_service import get_chunking_service
from services.embedding_service import get_embedding_service
from services.document_processor import DocumentProcessorService
from services.ocr_service import get_ocr_service
from api.websocket import manager

logger = get_logger(__name__)
router = APIRouter(prefix="/chatbots", tags=["chatbots"])


# =============================================================================
# SCHEMAS
# =============================================================================

class ChatbotCreate(BaseModel):
    """Request to create a new chatbot."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    system_prompt: Optional[str] = Field(
        default="You are a helpful assistant. Answer based only on the provided context from the knowledge base. If the context doesn't contain relevant information, say so."
    )


class ChatbotUpdate(BaseModel):
    """Request to update a chatbot."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    settings: Optional[dict] = None


class ChatbotResponse(BaseModel):
    """Chatbot response."""
    id: str
    name: str
    description: Optional[str] = None
    system_prompt: str = "You are a helpful assistant."
    status: str = "draft"
    embedding_model: str = "gemini-embedding-001"
    chunk_size: int = 1024
    chunk_overlap: int = 50
    web_search_threshold: Optional[float] = 0.6
    settings: Optional[dict] = None
    created_at: Optional[str] = None


class ChatbotListResponse(BaseModel):
    """List of chatbots."""
    chatbots: List[ChatbotResponse]
    total: int


class ChatbotStatusResponse(BaseModel):
    """Chatbot training status."""
    chatbot_id: str
    name: str
    status: str
    total_chunks: int
    total_documents: int
    training_progress: int
    last_trained_at: Optional[str]
    training_error: Optional[str]


class AddURLRequest(BaseModel):
    """Request to add URL to knowledge base."""
    url: str


class AddTextRequest(BaseModel):
    """Request to add text to knowledge base."""
    text: str
    source_name: Optional[str] = None


class CrawlURLRequest(BaseModel):
    """Request to crawl a URL and discover links."""
    url: str
    max_depth: int = Field(default=2, ge=0, le=5)
    max_links: int = Field(default=100, ge=1, le=500)
    same_domain_only: bool = True
    fetch_metadata: bool = True


class CrawlURLResponse(BaseModel):
    """Response from URL crawling."""
    source_url: str
    discovered_links: List[dict]
    total_discovered: int
    pages_visited: int
    crawl_depth_reached: int


class ScrapeURLsRequest(BaseModel):
    """Request to scrape selected URLs into knowledge base."""
    urls: List[str] = Field(..., min_length=1, max_length=50)
    source_url: Optional[str] = None


# =============================================================================
# ROUTES
# =============================================================================

@router.post("", response_model=ChatbotResponse)
async def create_chatbot(request: ChatbotCreate):
    """Create a new chatbot."""
    try:
        service = get_chatbot_service()
        chatbot = await service.create(
            name=request.name,
            description=request.description,
            system_prompt=request.system_prompt,
        )
        return ChatbotResponse(**chatbot)
    except Exception as e:
        logger.error(f"Error creating chatbot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=ChatbotListResponse)
async def list_chatbots(status: Optional[str] = None, limit: int = 50):
    """List all chatbots."""
    try:
        service = get_chatbot_service()
        chatbots = await service.list(status=status, limit=limit)
        return ChatbotListResponse(
            chatbots=[ChatbotResponse(**c) for c in chatbots],
            total=len(chatbots),
        )
    except Exception as e:
        logger.error(f"Error listing chatbots: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{chatbot_id}", response_model=ChatbotResponse)
async def get_chatbot(chatbot_id: str):
    """Get a chatbot by ID."""
    try:
        service = get_chatbot_service()
        chatbot = await service.get(chatbot_id)
        if not chatbot:
            raise HTTPException(status_code=404, detail="Chatbot not found")
        return ChatbotResponse(**chatbot)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting chatbot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{chatbot_id}", response_model=ChatbotResponse)
async def update_chatbot(chatbot_id: str, request: ChatbotUpdate):
    """Update a chatbot."""
    try:
        service = get_chatbot_service()
        chatbot = await service.update(
            chatbot_id=chatbot_id,
            name=request.name,
            description=request.description,
            system_prompt=request.system_prompt,
            settings=request.settings,
        )
        if not chatbot:
            raise HTTPException(status_code=404, detail="Chatbot not found")
        return ChatbotResponse(**chatbot)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating chatbot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{chatbot_id}")
async def delete_chatbot(chatbot_id: str):
    """Delete a chatbot and all its knowledge base."""
    try:
        # Delete from Milvus
        milvus_service = get_milvus_service()
        await milvus_service.delete_chatbot(chatbot_id)

        # Delete from database
        service = get_chatbot_service()
        deleted = await service.delete(chatbot_id)

        if not deleted:
            raise HTTPException(status_code=404, detail="Chatbot not found")

        return {"message": "Chatbot deleted successfully", "chatbot_id": chatbot_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting chatbot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{chatbot_id}/activate")
async def activate_chatbot(chatbot_id: str):
    """Activate a chatbot so it can accept chat messages."""
    try:
        service = get_chatbot_service()
        chatbot = await service.get(chatbot_id)
        if not chatbot:
            raise HTTPException(status_code=404, detail="Chatbot not found")

        if chatbot["status"] == "active":
            return {"message": "Chatbot is already active", "chatbot_id": chatbot_id}

        if chatbot["status"] == "training":
            raise HTTPException(status_code=400, detail="Chatbot is currently training, please wait")

        updated = await service.update(chatbot_id, status="active")
        return ChatbotResponse(**updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating chatbot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{chatbot_id}/status", response_model=ChatbotStatusResponse)
async def get_chatbot_status(chatbot_id: str):
    """Get chatbot training status."""
    try:
        service = get_chatbot_service()
        status = await service.get_status(chatbot_id)
        if not status:
            raise HTTPException(status_code=404, detail="Chatbot not found")

        # Get actual chunk count from Milvus
        milvus_service = get_milvus_service()
        chunk_count = await milvus_service.get_chatbot_chunk_count(chatbot_id)
        status["total_chunks"] = chunk_count

        return ChatbotStatusResponse(**status)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting chatbot status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# KNOWLEDGE BASE ROUTES
# =============================================================================

@router.post("/{chatbot_id}/documents")
async def upload_document(
    chatbot_id: str,
    file: UploadFile = File(...),
):
    """Upload a document to a chatbot's knowledge base (async with Celery)."""
    import base64
    from tasks.document_tasks import process_document_async
    from services.task_manager import TaskManager
    
    try:
        # Verify chatbot exists
        service = get_chatbot_service()
        chatbot = await service.get(chatbot_id)
        if not chatbot:
            raise HTTPException(status_code=404, detail="Chatbot not found")

        document_id = str(uuid.uuid4())

        # Read file content
        content = await file.read()
        
        # Encode content to base64 for Celery serialization
        content_base64 = base64.b64encode(content).decode('utf-8')

        # Queue Celery task
        task = process_document_async.delay(
            chatbot_id=chatbot_id,
            document_id=document_id,
            filename=file.filename,
            content_base64=content_base64,
        )
        
        # Create task record in database
        task_manager = TaskManager()
        task_manager.create_task(
            task_id=task.id,
            chatbot_id=chatbot_id,
            task_type='document_processing',
            metadata={
                'filename': file.filename,
                'document_id': document_id,
                'file_size': len(content),
            }
        )

        return {
            "message": "Document processing queued",
            "task_id": task.id,
            "document_id": document_id,
            "filename": file.filename,
            "status": "queued",
            "poll_url": f"/tasks/{task.id}/status",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error queuing document upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{chatbot_id}/urls")
async def add_url(
    chatbot_id: str,
    background_tasks: BackgroundTasks,
    request: AddURLRequest,
):
    """Add a URL to a chatbot's knowledge base."""
    try:
        # Verify chatbot exists
        service = get_chatbot_service()
        chatbot = await service.get(chatbot_id)
        if not chatbot:
            raise HTTPException(status_code=404, detail="Chatbot not found")

        document_id = str(uuid.uuid4())

        # Start background processing
        background_tasks.add_task(
            process_url_task,
            chatbot_id=chatbot_id,
            document_id=document_id,
            url=request.url,
        )

        return {
            "message": "URL processing started",
            "document_id": document_id,
            "url": request.url,
            "status": "processing",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{chatbot_id}/urls/crawl", response_model=CrawlURLResponse)
async def crawl_url_endpoint(
    chatbot_id: str,
    request: CrawlURLRequest,
):
    """Crawl a URL and discover links for selection."""
    try:
        service = get_chatbot_service()
        chatbot = await service.get(chatbot_id)
        if not chatbot:
            raise HTTPException(status_code=404, detail="Chatbot not found")

        from agents.execution.url_processing import crawl_url, is_valid_url

        if not is_valid_url(request.url):
            raise HTTPException(status_code=400, detail="Invalid or unsafe URL")

        result = await crawl_url(
            start_url=request.url,
            max_depth=request.max_depth,
            max_links=request.max_links,
            same_domain_only=request.same_domain_only,
            fetch_metadata=request.fetch_metadata,
        )

        return CrawlURLResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error crawling URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{chatbot_id}/urls/scrape")
async def scrape_urls(
    chatbot_id: str,
    background_tasks: BackgroundTasks,
    request: ScrapeURLsRequest,
):
    """Scrape selected URLs into knowledge base."""
    try:
        service = get_chatbot_service()
        chatbot = await service.get(chatbot_id)
        if not chatbot:
            raise HTTPException(status_code=404, detail="Chatbot not found")

        from agents.execution.url_processing import is_valid_url

        valid_urls = [url for url in request.urls if is_valid_url(url)]
        if not valid_urls:
            raise HTTPException(status_code=400, detail="No valid URLs provided")

        # Create parent document for grouping if source_url is provided
        parent_document_id = None
        if request.source_url:
            from services.postgres_service import get_postgres_service
            from services.models import ChatbotDocument as _Doc

            parent_document_id = str(uuid.uuid4())
            pg = get_postgres_service()
            session = pg.session_factory()
            try:
                parent_doc = _Doc(
                    id=parent_document_id,
                    chatbot_id=chatbot_id,
                    filename=request.source_url,
                    source_type="website",
                    source_url=request.source_url,
                    file_size=0,
                    status="processing",
                )
                session.add(parent_doc)
                session.commit()
            finally:
                session.close()

        document_ids = []
        for url in valid_urls:
            document_id = str(uuid.uuid4())
            document_ids.append({"document_id": document_id, "url": url})
            background_tasks.add_task(
                process_url_task,
                chatbot_id=chatbot_id,
                document_id=document_id,
                url=url,
                parent_document_id=parent_document_id,
            )

        return {
            "message": f"Processing {len(valid_urls)} URLs",
            "parent_document_id": parent_document_id,
            "documents": document_ids,
            "status": "processing",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error scraping URLs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{chatbot_id}/text")
async def add_text(
    chatbot_id: str,
    background_tasks: BackgroundTasks,
    request: AddTextRequest,
):
    """Add text directly to a chatbot's knowledge base."""
    try:
        # Verify chatbot exists
        service = get_chatbot_service()
        chatbot = await service.get(chatbot_id)
        if not chatbot:
            raise HTTPException(status_code=404, detail="Chatbot not found")

        document_id = str(uuid.uuid4())

        # Start background processing
        background_tasks.add_task(
            process_text_task,
            chatbot_id=chatbot_id,
            document_id=document_id,
            text=request.text,
            source_name=request.source_name or "text_input",
        )

        return {
            "message": "Text processing started",
            "document_id": document_id,
            "status": "processing",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding text: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# DOCUMENT MANAGEMENT ENDPOINTS
# =============================================================================

@router.get("/{chatbot_id}/documents")
async def list_chatbot_documents(chatbot_id: str):
    """List all documents for a chatbot."""
    from services.postgres_service import get_postgres_service
    from services.models import ChatbotDocument
    from sqlalchemy import select

    try:
        # Verify chatbot exists
        service = get_chatbot_service()
        chatbot = await service.get(chatbot_id)
        if not chatbot:
            raise HTTPException(status_code=404, detail="Chatbot not found")

        # Get documents from PostgreSQL
        postgres_service = get_postgres_service()
        session = postgres_service.session_factory()
        try:
            result = session.execute(
                select(ChatbotDocument)
                .where(ChatbotDocument.chatbot_id == chatbot_id)
                .order_by(ChatbotDocument.created_at.desc())
            )
            documents = result.scalars().all()

            # Separate parent and child documents
            parent_ids = {doc.id for doc in documents if doc.source_type == "website"}

            return {
                "documents": [
                    {
                        "id": doc.id,
                        "chatbot_id": doc.chatbot_id,
                        "filename": doc.filename,
                        "source_type": doc.source_type,
                        "source_url": doc.source_url,
                        "file_size": doc.file_size,
                        "status": doc.status,
                        "chunks_count": doc.chunks_count,
                        "error_message": doc.error_message,
                        "parent_document_id": doc.parent_document_id,
                        "created_at": doc.created_at.isoformat() if doc.created_at else None,
                        "processed_at": doc.processed_at.isoformat() if doc.processed_at else None,
                    }
                    for doc in documents
                    # Hide child documents (crawled pages) from the main list
                    if doc.parent_document_id is None or doc.id not in parent_ids
                ],
                "total": len(documents),
            }
        finally:
            session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{chatbot_id}/documents/{document_id}")
async def get_document(chatbot_id: str, document_id: str):
    """Get document details and download URL."""
    from services.postgres_service import get_postgres_service
    from services.models import ChatbotDocument
    from services.minio_service import get_minio_service
    from sqlalchemy import select

    try:
        # Get document from PostgreSQL
        postgres_service = get_postgres_service()
        session = postgres_service.session_factory()
        try:
            result = session.execute(
                select(ChatbotDocument).where(
                    ChatbotDocument.id == document_id,
                    ChatbotDocument.chatbot_id == chatbot_id,
                )
            )
            doc = result.scalar_one_or_none()

            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")

            # Generate presigned URL for download
            minio_service = get_minio_service()
            download_url = await minio_service.get_document_url(
                document_id=document_id,
                filename=doc.filename,
                expires=3600,  # 1 hour
            )

            return {
                "id": doc.id,
                "filename": doc.filename,
                "download_url": download_url,
                "file_size": doc.file_size,
                "status": doc.status,
                "source_type": doc.source_type,
                "source_url": doc.source_url,
                "chunks_count": doc.chunks_count,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
                "processed_at": doc.processed_at.isoformat() if doc.processed_at else None,
            }
        finally:
            session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{chatbot_id}/documents/{document_id}")
async def delete_chatbot_document(chatbot_id: str, document_id: str):
    """Delete a document from chatbot knowledge base."""
    from services.postgres_service import get_postgres_service
    from services.models import ChatbotDocument
    from services.minio_service import get_minio_service
    from sqlalchemy import select, delete as sql_delete

    try:
        # Get document from PostgreSQL
        postgres_service = get_postgres_service()
        session = postgres_service.session_factory()
        try:
            result = session.execute(
                select(ChatbotDocument).where(
                    ChatbotDocument.id == document_id,
                    ChatbotDocument.chatbot_id == chatbot_id,
                )
            )
            doc = result.scalar_one_or_none()

            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")

            filename = doc.filename

            # 1. Delete from Milvus
            milvus_service = get_milvus_service()
            await milvus_service.delete_document(document_id)
            logger.info(f"Deleted document from Milvus: {document_id}")

            # 2. Delete from MinIO
            minio_service = get_minio_service()
            await minio_service.delete_document(document_id, filename)
            logger.info(f"Deleted document from MinIO: {document_id}")

            # 3. Delete from PostgreSQL
            session.execute(
                sql_delete(ChatbotDocument).where(
                    ChatbotDocument.id == document_id,
                    ChatbotDocument.chatbot_id == chatbot_id,
                )
            )
            session.commit()
            logger.info(f"Deleted document from PostgreSQL: {document_id}")

            return {
                "message": "Document deleted successfully",
                "document_id": document_id,
            }
        finally:
            session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# BACKGROUND TASKS
# =============================================================================

async def process_document_task(
    chatbot_id: str,
    document_id: str,
    filename: str,
    content: bytes,
):
    """Background task to process a document."""
    from services.postgres_service import get_postgres_service
    from services.models import ChatbotDocument
    from services.minio_service import get_minio_service
    from sqlalchemy import update
    from sqlalchemy.sql import func

    postgres_service = get_postgres_service()
    session = None

    try:
        logger.info(f"Processing document {filename} for chatbot {chatbot_id}")

        # 1. Create ChatbotDocument entry in PostgreSQL
        session = postgres_service.session_factory()
        doc = ChatbotDocument(
            id=document_id,
            chatbot_id=chatbot_id,
            filename=filename,
            source_type="upload",
            file_size=len(content),
            status="processing",
        )
        session.add(doc)
        session.commit()
        session.close()
        session = None

        # Update chatbot status to training
        service = get_chatbot_service()
        await service.update_status(chatbot_id, "training", training_progress=10)

        # 2. Upload original file to MinIO
        minio_service = get_minio_service()
        content_type = "application/pdf" if filename.endswith(".pdf") else "application/octet-stream"
        await minio_service.upload_document(
            document_id=document_id,
            file_content=content,
            filename=filename,
            content_type=content_type,
            metadata={"chatbot_id": chatbot_id, "filename": filename},
        )
        logger.info(f"Uploaded document to MinIO: {document_id}")

        # 3. Process document (extract text)
        processor = DocumentProcessorService()
        result = await processor.process_document(
            file_content=content,
            filename=filename,
            extract_images=True,
        )

        text = result.get("text", "")
        if not text:
            raise ValueError("No text extracted from document")

        # 4. Store OCR content if available
        if result.get("ocr_text"):
            await minio_service.upload_ocr_content(
                document_id=document_id,
                ocr_text=result["ocr_text"],
            )
            logger.info(f"Uploaded OCR content to MinIO: {document_id}")

        # Update progress
        await service.update_status(chatbot_id, "training", training_progress=30)

        # 5. Chunk text
        chatbot = await service.get(chatbot_id)
        chunking_service = get_chunking_service(
            chunk_size=chatbot.get("chunk_size", 1024),
            chunk_overlap=chatbot.get("chunk_overlap", 50),
        )
        chunks = chunking_service.split_text(
            text=text,
            metadata={
                "chatbot_id": chatbot_id,
                "document_id": document_id,
                "source_type": "document",
                "source_name": filename,
            },
        )

        await service.update_status(chatbot_id, "training", training_progress=50)

        # 6. Generate embeddings with all models
        embedding_service = get_embedding_service()
        chunk_texts = [c["content"] for c in chunks]
        all_embeddings = await embedding_service.embed_documents_with_all_models(chunk_texts)

        await service.update_status(chatbot_id, "training", training_progress=70)

        # 7. Store in Milvus
        milvus_service_obj = get_milvus_service()
        await milvus_service_obj.insert_embeddings(
            embeddings=all_embeddings,
            chatbot_id=chatbot_id,
            document_id=document_id,
            chunks=chunk_texts,
            metadata=[c["metadata"] for c in chunks],
        )

        # 8. Update ChatbotDocument status to completed
        session = postgres_service.session_factory()
        session.execute(
            update(ChatbotDocument)
            .where(ChatbotDocument.id == document_id)
            .values(
                status="completed",
                chunks_count=len(chunks),
                processed_at=func.now(),
            )
        )
        session.commit()
        session.close()
        session = None

        # Mark chatbot as active
        await service.update_status(chatbot_id, "active", training_progress=100)

        # Notify via WebSocket
        await manager.broadcast_to_session(
            {
                "type": "training_complete",
                "chatbot_id": chatbot_id,
                "document_id": document_id,
                "chunks_created": len(chunks),
            },
            chatbot_id,
        )

        logger.info(f"Document {filename} processed: {len(chunks)} chunks")

    except Exception as e:
        logger.error(f"Error processing document: {e}")

        # Update ChatbotDocument status to error
        try:
            if session is None:
                session = postgres_service.session_factory()
            session.execute(
                update(ChatbotDocument)
                .where(ChatbotDocument.id == document_id)
                .values(status="error", error_message=str(e))
            )
            session.commit()
        except Exception as db_error:
            logger.error(f"Error updating document status: {db_error}")
        finally:
            if session:
                session.close()

        # Update chatbot status
        service = get_chatbot_service()
        await service.update_status(chatbot_id, "error", training_error=str(e))


async def process_url_task(
    chatbot_id: str,
    document_id: str,
    url: str,
    parent_document_id: Optional[str] = None,
):
    """Background task to process a URL."""
    from services.postgres_service import get_postgres_service
    from services.models import ChatbotDocument
    from services.minio_service import get_minio_service
    from sqlalchemy import update
    from sqlalchemy.sql import func

    postgres_service = get_postgres_service()
    session = None

    try:
        logger.info(f"Processing URL {url} for chatbot {chatbot_id}")

        # 1. Create ChatbotDocument entry in PostgreSQL
        session = postgres_service.session_factory()
        doc = ChatbotDocument(
            id=document_id,
            chatbot_id=chatbot_id,
            filename=url,
            source_type="crawled_page" if parent_document_id else "url",
            source_url=url,
            file_size=0,  # Will update after fetching
            status="processing",
            parent_document_id=parent_document_id,
        )
        session.add(doc)
        session.commit()
        session.close()
        session = None

        service = get_chatbot_service()
        await service.update_status(chatbot_id, "training", training_progress=10)

        # 2. Scrape URL
        import aiohttp
        import ssl
        from bs4 import BeautifulSoup
        from urllib.parse import urlparse

        # Comprehensive headers to avoid bot detection
        headers = {
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

        timeout = aiohttp.ClientTimeout(total=30)

        # Create SSL context that's more permissive
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        connector = aiohttp.TCPConnector(ssl=ssl_context)

        async with aiohttp.ClientSession(timeout=timeout, connector=connector) as client:
            async with client.get(url, headers=headers, allow_redirects=True, max_redirects=10) as response:
                if response.status == 403:
                    # Retry with different User-Agent
                    headers["User-Agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
                    async with client.get(url, headers=headers, allow_redirects=True) as retry_response:
                        if retry_response.status != 200:
                            raise ValueError(f"Failed to fetch URL: HTTP {retry_response.status}")
                        html = await retry_response.text()
                elif response.status != 200:
                    raise ValueError(f"Failed to fetch URL: HTTP {response.status}")
                else:
                    html = await response.text()

        # Parse HTML
        soup = BeautifulSoup(html, "lxml")
        for element in soup(["script", "style", "nav", "header", "footer"]):
            element.decompose()

        text = soup.body.get_text(separator="\n", strip=True) if soup.body else ""
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        clean_text = "\n".join(lines)

        if len(clean_text) < 100:
            raise ValueError("Insufficient content from URL")

        # 3. Save text content to MinIO as .txt file
        minio_service = get_minio_service()
        text_bytes = clean_text.encode("utf-8")
        await minio_service.upload_document(
            document_id=document_id,
            file_content=text_bytes,
            filename=f"{document_id}.txt",
            content_type="text/plain",
            metadata={"chatbot_id": chatbot_id, "source_url": url},
        )
        logger.info(f"Uploaded URL content to MinIO: {document_id}")

        # Update file size in DB
        session = postgres_service.session_factory()
        session.execute(
            update(ChatbotDocument)
            .where(ChatbotDocument.id == document_id)
            .values(file_size=len(text_bytes))
        )
        session.commit()
        session.close()
        session = None

        await service.update_status(chatbot_id, "training", training_progress=30)

        # 4. Chunk text
        chatbot = await service.get(chatbot_id)
        chunking_service = get_chunking_service(
            chunk_size=chatbot.get("chunk_size", 1024),
            chunk_overlap=chatbot.get("chunk_overlap", 50),
        )
        chunks = chunking_service.split_text(
            text=clean_text,
            metadata={
                "chatbot_id": chatbot_id,
                "document_id": document_id,
                "source_type": "url",
                "source_name": url,
                "source_url": url,
            },
        )

        await service.update_status(chatbot_id, "training", training_progress=50)

        # 5. Generate embeddings with all models
        embedding_service = get_embedding_service()
        chunk_texts = [c["content"] for c in chunks]
        all_embeddings = await embedding_service.embed_documents_with_all_models(chunk_texts)

        await service.update_status(chatbot_id, "training", training_progress=70)

        # 6. Store in Milvus
        milvus_service_obj = get_milvus_service()
        await milvus_service_obj.insert_embeddings(
            embeddings=all_embeddings,
            chatbot_id=chatbot_id,
            document_id=document_id,
            chunks=chunk_texts,
            metadata=[c["metadata"] for c in chunks],
        )

        # 7. Update ChatbotDocument status to completed
        session = postgres_service.session_factory()
        session.execute(
            update(ChatbotDocument)
            .where(ChatbotDocument.id == document_id)
            .values(
                status="completed",
                chunks_count=len(chunks),
                processed_at=func.now(),
            )
        )

        # Update parent document if all children are completed
        if parent_document_id:
            from sqlalchemy import select as sql_select
            parent_result = session.execute(
                sql_select(ChatbotDocument).where(ChatbotDocument.id == parent_document_id)
            )
            parent_doc = parent_result.scalar_one_or_none()
            if parent_doc:
                children_result = session.execute(
                    sql_select(ChatbotDocument)
                    .where(ChatbotDocument.parent_document_id == parent_document_id)
                )
                children = children_result.scalars().all()
                all_done = all(c.status == "completed" for c in children)
                total_chunks = sum(c.chunks_count or 0 for c in children)
                if all_done:
                    session.execute(
                        update(ChatbotDocument)
                        .where(ChatbotDocument.id == parent_document_id)
                        .values(
                            status="completed",
                            chunks_count=total_chunks,
                            processed_at=func.now(),
                        )
                    )

        session.commit()
        session.close()
        session = None

        # Mark as active
        await service.update_status(chatbot_id, "active", training_progress=100)

        # Notify via WebSocket
        await manager.broadcast_to_session(
            {
                "type": "training_complete",
                "chatbot_id": chatbot_id,
                "document_id": document_id,
                "chunks_created": len(chunks),
            },
            chatbot_id,
        )

        logger.info(f"URL {url} processed: {len(chunks)} chunks")

    except Exception as e:
        logger.error(f"Error processing URL: {e}")

        # Update ChatbotDocument status to error
        try:
            if session is None:
                session = postgres_service.session_factory()
            session.execute(
                update(ChatbotDocument)
                .where(ChatbotDocument.id == document_id)
                .values(status="error", error_message=str(e))
            )
            session.commit()
        except Exception as db_error:
            logger.error(f"Error updating document status: {db_error}")
        finally:
            if session:
                session.close()

        service = get_chatbot_service()
        await service.update_status(chatbot_id, "error", training_error=str(e))


async def process_text_task(
    chatbot_id: str,
    document_id: str,
    text: str,
    source_name: str,
):
    """Background task to process raw text."""
    from services.postgres_service import get_postgres_service
    from services.models import ChatbotDocument
    from services.minio_service import get_minio_service
    from sqlalchemy import update
    from sqlalchemy.sql import func

    postgres_service = get_postgres_service()
    session = None

    try:
        logger.info(f"Processing text for chatbot {chatbot_id}")

        # 1. Create ChatbotDocument entry in PostgreSQL
        text_bytes = text.encode("utf-8")
        session = postgres_service.session_factory()
        doc = ChatbotDocument(
            id=document_id,
            chatbot_id=chatbot_id,
            filename=f"{source_name}.txt",
            source_type="text",
            file_size=len(text_bytes),
            status="processing",
        )
        session.add(doc)
        session.commit()
        session.close()
        session = None

        service = get_chatbot_service()
        await service.update_status(chatbot_id, "training", training_progress=10)

        # 2. Save text to MinIO as .txt file
        minio_service = get_minio_service()
        await minio_service.upload_document(
            document_id=document_id,
            file_content=text_bytes,
            filename=f"{source_name}.txt",
            content_type="text/plain",
            metadata={"chatbot_id": chatbot_id, "source_name": source_name},
        )
        logger.info(f"Uploaded text content to MinIO: {document_id}")

        # 3. Chunk text
        chatbot = await service.get(chatbot_id)
        chunking_service = get_chunking_service(
            chunk_size=chatbot.get("chunk_size", 1024),
            chunk_overlap=chatbot.get("chunk_overlap", 50),
        )
        chunks = chunking_service.split_text(
            text=text,
            metadata={
                "chatbot_id": chatbot_id,
                "document_id": document_id,
                "source_type": "text",
                "source_name": source_name,
            },
        )

        await service.update_status(chatbot_id, "training", training_progress=30)

        # 4. Generate embeddings with all models
        embedding_service = get_embedding_service()
        chunk_texts = [c["content"] for c in chunks]
        all_embeddings = await embedding_service.embed_documents_with_all_models(chunk_texts)

        await service.update_status(chatbot_id, "training", training_progress=60)

        # 5. Store in Milvus
        milvus_service_obj = get_milvus_service()
        await milvus_service_obj.insert_embeddings(
            embeddings=all_embeddings,
            chatbot_id=chatbot_id,
            document_id=document_id,
            chunks=chunk_texts,
            metadata=[c["metadata"] for c in chunks],
        )

        # 6. Update ChatbotDocument status to completed
        session = postgres_service.session_factory()
        session.execute(
            update(ChatbotDocument)
            .where(ChatbotDocument.id == document_id)
            .values(
                status="completed",
                chunks_count=len(chunks),
                processed_at=func.now(),
            )
        )
        session.commit()
        session.close()
        session = None

        # Mark as active
        await service.update_status(chatbot_id, "active", training_progress=100)

        # Notify via WebSocket
        await manager.broadcast_to_session(
            {
                "type": "training_complete",
                "chatbot_id": chatbot_id,
                "document_id": document_id,
                "chunks_created": len(chunks),
            },
            chatbot_id,
        )

        logger.info(f"Text processed: {len(chunks)} chunks")

    except Exception as e:
        logger.error(f"Error processing text: {e}")

        # Update ChatbotDocument status to error
        try:
            if session is None:
                session = postgres_service.session_factory()
            session.execute(
                update(ChatbotDocument)
                .where(ChatbotDocument.id == document_id)
                .values(status="error", error_message=str(e))
            )
            session.commit()
        except Exception as db_error:
            logger.error(f"Error updating document status: {db_error}")
        finally:
            if session:
                session.close()

        service = get_chatbot_service()
        await service.update_status(chatbot_id, "error", training_error=str(e))


# =============================================================================
# CUSTOMIZATION ROUTES
# =============================================================================

class CustomizationResponse(BaseModel):
    """Chatbot customization response."""
    id: str
    chatbot_id: str
    primary_color: str = "#5B5EFF"
    position: str = "bottom-right"
    size: str = "default"
    border_radius: int = 18
    font_family: str = "Inter"
    greeting: str = "Hello!"
    welcome_message: str = "How can I help you today?"
    placeholder: str = "Type your message..."
    bot_name: str = "AI Assistant"
    avatar_url: Optional[str] = None
    auto_open: bool = False
    show_typing_indicator: bool = True
    collect_user_info: bool = False
    input_max_chars: int = 2000
    button_text: str = "Chat with us"
    show_branding: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CustomizationUpdate(BaseModel):
    """Request to update customization settings."""
    primary_color: Optional[str] = None
    position: Optional[str] = None
    size: Optional[str] = None
    border_radius: Optional[int] = None
    font_family: Optional[str] = None
    greeting: Optional[str] = None
    welcome_message: Optional[str] = None
    placeholder: Optional[str] = None
    bot_name: Optional[str] = None
    avatar_url: Optional[str] = None
    auto_open: Optional[bool] = None
    show_typing_indicator: Optional[bool] = None
    collect_user_info: Optional[bool] = None
    input_max_chars: Optional[int] = None
    button_text: Optional[str] = None
    show_branding: Optional[bool] = None


@router.get("/{chatbot_id}/customization", response_model=CustomizationResponse)
async def get_customization(chatbot_id: str):
    """Get widget customization settings for a chatbot."""
    from services.postgres_service import get_postgres_service
    from services.models import ChatbotCustomization
    from sqlalchemy import select

    try:
        # Verify chatbot exists
        service = get_chatbot_service()
        chatbot = await service.get(chatbot_id)
        if not chatbot:
            raise HTTPException(status_code=404, detail="Chatbot not found")

        # Get customization settings
        postgres_service = get_postgres_service()
        session = postgres_service.session_factory()
        try:
            result = session.execute(
                select(ChatbotCustomization)
                .where(ChatbotCustomization.chatbot_id == chatbot_id)
            )
            customization = result.scalar_one_or_none()

            if not customization:
                # Return default settings if none exist
                return CustomizationResponse(
                    id="",
                    chatbot_id=chatbot_id,
                )

            return CustomizationResponse(
                id=customization.id,
                chatbot_id=customization.chatbot_id,
                primary_color=customization.primary_color,
                position=customization.position,
                size=customization.size,
                border_radius=customization.border_radius,
                font_family=customization.font_family,
                greeting=customization.greeting,
                welcome_message=customization.welcome_message,
                placeholder=customization.placeholder,
                bot_name=customization.bot_name,
                avatar_url=customization.avatar_url,
                auto_open=customization.auto_open,
                show_typing_indicator=customization.show_typing_indicator,
                collect_user_info=customization.collect_user_info,
                input_max_chars=customization.input_max_chars,
                button_text=customization.button_text,
                show_branding=customization.show_branding,
                created_at=customization.created_at.isoformat() if customization.created_at else None,
                updated_at=customization.updated_at.isoformat() if customization.updated_at else None,
            )
        finally:
            session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting customization: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{chatbot_id}/customization", response_model=CustomizationResponse)
async def update_customization(chatbot_id: str, request: CustomizationUpdate):
    """Update widget customization settings for a chatbot (upsert)."""
    from services.postgres_service import get_postgres_service
    from services.models import ChatbotCustomization
    from sqlalchemy import select
    from sqlalchemy.sql import func

    try:
        # Verify chatbot exists
        service = get_chatbot_service()
        chatbot = await service.get(chatbot_id)
        if not chatbot:
            raise HTTPException(status_code=404, detail="Chatbot not found")

        postgres_service = get_postgres_service()
        session = postgres_service.session_factory()
        try:
            # Check if customization exists
            result = session.execute(
                select(ChatbotCustomization)
                .where(ChatbotCustomization.chatbot_id == chatbot_id)
            )
            customization = result.scalar_one_or_none()

            if customization:
                # Update existing customization
                update_data = request.model_dump(exclude_unset=True)
                for key, value in update_data.items():
                    setattr(customization, key, value)
                customization.updated_at = func.now()
            else:
                # Create new customization
                customization = ChatbotCustomization(
                    chatbot_id=chatbot_id,
                    **request.model_dump(exclude_unset=True)
                )
                session.add(customization)

            session.commit()
            session.refresh(customization)

            return CustomizationResponse(
                id=customization.id,
                chatbot_id=customization.chatbot_id,
                primary_color=customization.primary_color,
                position=customization.position,
                size=customization.size,
                border_radius=customization.border_radius,
                font_family=customization.font_family,
                greeting=customization.greeting,
                welcome_message=customization.welcome_message,
                placeholder=customization.placeholder,
                bot_name=customization.bot_name,
                avatar_url=customization.avatar_url,
                auto_open=customization.auto_open,
                show_typing_indicator=customization.show_typing_indicator,
                collect_user_info=customization.collect_user_info,
                input_max_chars=customization.input_max_chars,
                button_text=customization.button_text,
                show_branding=customization.show_branding,
                created_at=customization.created_at.isoformat() if customization.created_at else None,
                updated_at=customization.updated_at.isoformat() if customization.updated_at else None,
            )
        finally:
            session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating customization: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# CONVERSATIONS ROUTES
# =============================================================================

class ConversationSummary(BaseModel):
    """Summary of a conversation session."""
    session_id: str
    chatbot_id: str
    first_message: str
    last_message: str
    message_count: int
    user_messages: int
    assistant_messages: int
    started_at: str
    last_activity: str
    duration_seconds: int


class ConversationsListResponse(BaseModel):
    """List of conversations with pagination."""
    conversations: List[ConversationSummary]
    pagination: dict


class MessageResponse(BaseModel):
    """Single message in a conversation."""
    message_id: str
    role: str
    content: str
    sources: Optional[List[dict]] = None
    agent_executions: Optional[List[dict]] = None
    timestamp: str


class ConversationDetailResponse(BaseModel):
    """Full conversation transcript."""
    session_id: str
    chatbot_id: str
    messages: List[MessageResponse]
    started_at: str
    last_activity: str
    message_count: int


@router.get("/{chatbot_id}/conversations", response_model=ConversationsListResponse)
async def list_conversations(
    chatbot_id: str,
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
):
    """List all conversation sessions for a chatbot."""
    from services.postgres_service import get_postgres_service
    from services.models import ConversationMessage
    from sqlalchemy import select, func, case, and_

    try:
        # Verify chatbot exists
        service = get_chatbot_service()
        chatbot = await service.get(chatbot_id)
        if not chatbot:
            raise HTTPException(status_code=404, detail="Chatbot not found")

        postgres_service = get_postgres_service()
        session = postgres_service.session_factory()
        try:
            # Get unique session_ids with aggregated data
            sessions_query = (
                select(
                    ConversationMessage.session_id,
                    func.min(ConversationMessage.timestamp).label('started_at'),
                    func.max(ConversationMessage.timestamp).label('last_activity'),
                    func.count(ConversationMessage.message_id).label('message_count'),
                    func.sum(
                        case((ConversationMessage.role == 'user', 1), else_=0)
                    ).label('user_messages'),
                    func.sum(
                        case((ConversationMessage.role == 'assistant', 1), else_=0)
                    ).label('assistant_messages'),
                )
                .where(ConversationMessage.chatbot_id == chatbot_id)
                .group_by(ConversationMessage.session_id)
                .order_by(func.max(ConversationMessage.timestamp).desc())
            )

            # Get total count
            count_subquery = sessions_query.subquery()
            total = session.execute(select(func.count()).select_from(count_subquery)).scalar()

            # Apply pagination
            offset = (page - 1) * limit
            sessions_query = sessions_query.offset(offset).limit(limit)

            # Execute query
            results = session.execute(sessions_query).all()

            # For each session, get first and last messages
            conversations = []
            for row in results:
                # Get first message
                first_msg_result = session.execute(
                    select(ConversationMessage.content, ConversationMessage.role)
                    .where(ConversationMessage.session_id == row.session_id)
                    .order_by(ConversationMessage.timestamp.asc())
                    .limit(1)
                )
                first_msg_data = first_msg_result.first()
                first_msg = first_msg_data.content[:100] if first_msg_data else ""

                # Get last message
                last_msg_result = session.execute(
                    select(ConversationMessage.content, ConversationMessage.role)
                    .where(ConversationMessage.session_id == row.session_id)
                    .order_by(ConversationMessage.timestamp.desc())
                    .limit(1)
                )
                last_msg_data = last_msg_result.first()
                last_msg = last_msg_data.content[:100] if last_msg_data else ""

                conversations.append(ConversationSummary(
                    session_id=row.session_id,
                    chatbot_id=chatbot_id,
                    first_message=first_msg,
                    last_message=last_msg,
                    message_count=row.message_count,
                    user_messages=row.user_messages or 0,
                    assistant_messages=row.assistant_messages or 0,
                    started_at=row.started_at.isoformat(),
                    last_activity=row.last_activity.isoformat(),
                    duration_seconds=int((row.last_activity - row.started_at).total_seconds()),
                ))

            return ConversationsListResponse(
                conversations=conversations,
                pagination={
                    "total": total,
                    "page": page,
                    "limit": limit,
                    "pages": (total + limit - 1) // limit if total > 0 else 0,
                }
            )
        finally:
            session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{chatbot_id}/conversations/{session_id}", response_model=ConversationDetailResponse)
async def get_conversation(chatbot_id: str, session_id: str):
    """Get full conversation transcript for a session."""
    from services.postgres_service import get_postgres_service
    from services.models import ConversationMessage
    from sqlalchemy import select, func

    try:
        # Verify chatbot exists
        service = get_chatbot_service()
        chatbot = await service.get(chatbot_id)
        if not chatbot:
            raise HTTPException(status_code=404, detail="Chatbot not found")

        postgres_service = get_postgres_service()
        session = postgres_service.session_factory()
        try:
            # Get all messages for this session
            result = session.execute(
                select(ConversationMessage)
                .where(ConversationMessage.session_id == session_id)
                .order_by(ConversationMessage.timestamp.asc())
            )
            messages = result.scalars().all()

            if not messages:
                raise HTTPException(status_code=404, detail="Conversation not found")

            # Convert to response format
            message_responses = []
            for msg in messages:
                message_responses.append(MessageResponse(
                    message_id=msg.message_id,
                    role=msg.role,
                    content=msg.content,
                    sources=msg.sources,
                    agent_executions=msg.agent_executions,
                    timestamp=msg.timestamp.isoformat(),
                ))

            started_at = messages[0].timestamp
            last_activity = messages[-1].timestamp

            return ConversationDetailResponse(
                session_id=session_id,
                chatbot_id=chatbot_id,
                messages=message_responses,
                started_at=started_at.isoformat(),
                last_activity=last_activity.isoformat(),
                message_count=len(messages),
            )
        finally:
            session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))
