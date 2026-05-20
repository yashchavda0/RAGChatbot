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


class ChatbotResponse(BaseModel):
    """Chatbot response."""
    id: str
    name: str
    description: Optional[str]
    system_prompt: str
    status: str
    embedding_model: str
    chunk_size: int
    chunk_overlap: int
    created_at: str


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
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """Upload a document to a chatbot's knowledge base."""
    try:
        # Verify chatbot exists
        service = get_chatbot_service()
        chatbot = await service.get(chatbot_id)
        if not chatbot:
            raise HTTPException(status_code=404, detail="Chatbot not found")

        document_id = str(uuid.uuid4())

        # Read file content
        content = await file.read()

        # Start background processing
        background_tasks.add_task(
            process_document_task,
            chatbot_id=chatbot_id,
            document_id=document_id,
            filename=file.filename,
            content=content,
        )

        return {
            "message": "Document upload started",
            "document_id": document_id,
            "filename": file.filename,
            "status": "processing",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
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
# BACKGROUND TASKS
# =============================================================================

async def process_document_task(
    chatbot_id: str,
    document_id: str,
    filename: str,
    content: bytes,
):
    """Background task to process a document."""
    try:
        logger.info(f"Processing document {filename} for chatbot {chatbot_id}")

        # Update status to training
        service = get_chatbot_service()
        await service.update_status(chatbot_id, "training", training_progress=10)

        # Process document
        processor = DocumentProcessorService()
        result = await processor.process_document(
            file_content=content,
            filename=filename,
            extract_images=True,
        )

        text = result.get("text", "")
        if not text:
            raise ValueError("No text extracted from document")

        # Update progress
        await service.update_status(chatbot_id, "training", training_progress=30)

        # Chunk text
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

        # Generate embeddings
        embedding_service = get_embedding_service()
        chunk_texts = [c["content"] for c in chunks]
        embeddings = await embedding_service.embed_documents(chunk_texts)

        await service.update_status(chatbot_id, "training", training_progress=70)

        # Store in Milvus
        milvus_service = get_milvus_service()
        await milvus_service.insert_embeddings(
            embeddings=embeddings,
            chatbot_id=chatbot_id,
            document_id=document_id,
            chunks=chunk_texts,
            embedding_model=chatbot.get("embedding_model", "gemini-text-embedding-004"),
            metadata=[c["metadata"] for c in chunks],
        )

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

        logger.info(f"Document {filename} processed: {len(chunks)} chunks")

    except Exception as e:
        logger.error(f"Error processing document: {e}")
        service = get_chatbot_service()
        await service.update_status(chatbot_id, "error", training_error=str(e))


async def process_url_task(chatbot_id: str, document_id: str, url: str):
    """Background task to process a URL."""
    try:
        logger.info(f"Processing URL {url} for chatbot {chatbot_id}")

        service = get_chatbot_service()
        await service.update_status(chatbot_id, "training", training_progress=10)

        # Scrape URL
        import aiohttp
        from bs4 import BeautifulSoup
        from urllib.parse import urlparse

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }

        timeout = aiohttp.ClientTimeout(total=30)
        async with aiohttp.ClientSession(timeout=timeout) as client:
            async with client.get(url, headers=headers, allow_redirects=True) as response:
                if response.status != 200:
                    raise ValueError(f"Failed to fetch URL: HTTP {response.status}")
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

        await service.update_status(chatbot_id, "training", training_progress=30)

        # Chunk text
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

        # Generate embeddings
        embedding_service = get_embedding_service()
        chunk_texts = [c["content"] for c in chunks]
        embeddings = await embedding_service.embed_documents(chunk_texts)

        await service.update_status(chatbot_id, "training", training_progress=70)

        # Store in Milvus
        milvus_service = get_milvus_service()
        await milvus_service.insert_embeddings(
            embeddings=embeddings,
            chatbot_id=chatbot_id,
            document_id=document_id,
            chunks=chunk_texts,
            embedding_model=chatbot.get("embedding_model", "gemini-text-embedding-004"),
            metadata=[c["metadata"] for c in chunks],
        )

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
        service = get_chatbot_service()
        await service.update_status(chatbot_id, "error", training_error=str(e))


async def process_text_task(
    chatbot_id: str,
    document_id: str,
    text: str,
    source_name: str,
):
    """Background task to process raw text."""
    try:
        logger.info(f"Processing text for chatbot {chatbot_id}")

        service = get_chatbot_service()
        await service.update_status(chatbot_id, "training", training_progress=10)

        # Chunk text
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

        # Generate embeddings
        embedding_service = get_embedding_service()
        chunk_texts = [c["content"] for c in chunks]
        embeddings = await embedding_service.embed_documents(chunk_texts)

        await service.update_status(chatbot_id, "training", training_progress=60)

        # Store in Milvus
        milvus_service = get_milvus_service()
        await milvus_service.insert_embeddings(
            embeddings=embeddings,
            chatbot_id=chatbot_id,
            document_id=document_id,
            chunks=chunk_texts,
            embedding_model=chatbot.get("embedding_model", "gemini-text-embedding-004"),
            metadata=[c["metadata"] for c in chunks],
        )

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
        service = get_chatbot_service()
        await service.update_status(chatbot_id, "error", training_error=str(e))
