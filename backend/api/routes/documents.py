"""Document routes for uploading and managing documents."""
import uuid
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from config import settings
from config.logging_config import get_logger
from services.document_processor import DocumentProcessorService
from services.chunking_service import ChunkingService
from services.embedding_service import get_embedding_service
from services.milvus_service import get_milvus_service
from services.bm25_service import get_bm25_service
from api.schemas.chat import DocumentUploadResponse, DocumentListResponse

router = APIRouter(prefix="/documents", tags=["documents"])
logger = get_logger(__name__)

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md", ".markdown", ".png", ".jpg", ".jpeg", ".tiff", ".bmp"}


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    chatbot_id: str = Query(..., description="Chatbot ID to associate the document with"),
    file: UploadFile = File(...),
):
    """
    Upload and process a document with multi-embedding ensemble.

    Supports: PDF, DOCX, TXT, MD, PNG, JPG, TIFF, BMP
    """
    document_id = str(uuid.uuid4())
    logger.info(f"Uploading document: {file.filename}")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    file_ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    try:
        content = await file.read()

        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"File too large. Max: {MAX_FILE_SIZE // (1024 * 1024)} MB")

        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty file not allowed")

        # Process document
        processor = DocumentProcessorService()
        result = await processor.process_document(file_content=content, filename=file.filename)

        # Split into chunks
        chunker = ChunkingService()
        chunk_result = chunker.split_text(result.get("text", ""))
        chunks = [c["content"] for c in chunk_result]
        logger.info(f"Document split into {len(chunks)} chunks")

        # Generate embeddings with all active models
        embedding_service = get_embedding_service()
        milvus_service = get_milvus_service()

        all_embeddings = await embedding_service.embed_documents_with_all_models(chunks)
        models_used = list(all_embeddings.keys())
        logger.info(f"Generated embeddings with models: {models_used}")

        # Insert with multi-model embeddings
        inserted_ids = await milvus_service.insert_embeddings(
            embeddings=all_embeddings,
            chatbot_id=chatbot_id,
            document_id=document_id,
            chunks=chunks,
            metadata=[{"filename": file.filename, "source_type": "upload"}] * len(chunks),
        )

        # Update BM25 index
        if settings.bm25_enabled:
            bm25_service = get_bm25_service()
            bm25_service.add_documents(
                chatbot_id=chatbot_id,
                chunks=chunks,
                chunk_ids=[f"{document_id}_{i}" for i in range(len(chunks))],
            )
            logger.info(f"Updated BM25 index for chatbot {chatbot_id}")

        logger.info(f"Document uploaded: {file.filename} ({len(inserted_ids)} chunks, {len(models_used)} models)")

        return DocumentUploadResponse(
            message="Document processed successfully",
            document_id=document_id,
            chunks_created=len(chunks),
            embedding_models=models_used,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail="Failed to process document")


@router.get("", response_model=DocumentListResponse)
async def list_documents():
    """List all documents from Milvus."""
    try:
        milvus_service = get_milvus_service()
        stats = await milvus_service.get_stats()

        return DocumentListResponse(
            documents=[{
                "total_vectors": stats.get("count", 0),
                "dimension": stats.get("dimension", 0),
            }]
        )

    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail="Failed to list documents")


@router.delete("/{document_id}")
async def delete_document(document_id: str):
    """Delete a document and its embeddings."""
    try:
        milvus_service = get_milvus_service()
        count = await milvus_service.delete_document(document_id)
        logger.info(f"Document deleted: {document_id} ({count} embeddings)")
        return {"message": "Document deleted", "embeddings_removed": count}

    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document")


@router.post("/url")
async def upload_url(
    chatbot_id: str = Query(..., description="Chatbot ID to associate the URL with"),
    url: str = Query(..., description="URL to process"),
):
    """Process a URL and index its content."""
    import asyncio
    import aiohttp
    from bs4 import BeautifulSoup
    from urllib.parse import urlparse

    document_id = str(uuid.uuid4())
    logger.info(f"Processing URL: {url}")

    # Validate URL
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            raise HTTPException(status_code=400, detail="URL must use http or https")
        if not parsed.netloc:
            raise HTTPException(status_code=400, detail="Invalid URL: missing domain")
        # SSRF protection - block private/internal addresses
        import ipaddress
        import socket
        hostname = parsed.hostname or ""
        try:
            resolved_ips = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
            for _, _, _, _, addr in resolved_ips:
                ip = ipaddress.ip_address(addr[0])
                if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                    raise HTTPException(status_code=400, detail="URL resolves to a private/internal address")
                if str(ip) == "169.254.169.254":
                    raise HTTPException(status_code=400, detail="Cloud metadata endpoint is not allowed")
        except socket.gaierror:
            raise HTTPException(status_code=400, detail="Could not resolve URL hostname")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid URL: {e}")

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/pdf,*/*",
        }
        timeout = aiohttp.ClientTimeout(total=30)

        async with aiohttp.ClientSession(timeout=timeout) as client:
            async with client.get(url, headers=headers, allow_redirects=True) as response:
                if response.status != 200:
                    raise HTTPException(status_code=400, detail=f"Failed to fetch: HTTP {response.status}")

                # Check content type to determine how to process
                content_type = response.headers.get("Content-Type", "").lower()

                # Handle PDF files
                if "application/pdf" in content_type or url.lower().endswith(".pdf"):
                    logger.info(f"Detected PDF content, processing as document")
                    content = await response.read()

                    # Extract filename from URL
                    filename = url.split("/")[-1] if "/" in url else "document.pdf"
                    if not filename.lower().endswith(".pdf"):
                        filename += ".pdf"

                    # Process PDF using DocumentProcessor
                    processor = DocumentProcessorService()
                    result = await processor.process_document(file_content=content, filename=filename)
                    clean_text = result.get("text", "")
                    title = filename

                # Handle HTML/text content
                else:
                    html = await response.text()

                    # Parse HTML
                    soup = BeautifulSoup(html, "lxml")
                    for element in soup(["script", "style", "nav", "header", "footer"]):
                        element.decompose()

                    title = soup.title.get_text(strip=True) if soup.title else url
                    text = soup.body.get_text(separator="\n", strip=True) if soup.body else ""

                    lines = [line.strip() for line in text.split("\n") if line.strip()]
                    clean_text = "\n".join(lines)

        if len(clean_text) < 100:
            raise HTTPException(status_code=400, detail="Insufficient content from URL")

        # Split and embed
        chunker = ChunkingService()
        chunk_result = chunker.split_text(clean_text)
        chunks = [c["content"] for c in chunk_result]

        embedding_service = get_embedding_service()
        milvus_service = get_milvus_service()
        all_embeddings = await embedding_service.embed_documents_with_all_models(chunks)
        models_used = list(all_embeddings.keys())

        # Insert with multi-model embeddings
        inserted_ids = await milvus_service.insert_embeddings(
            embeddings=all_embeddings,
            chatbot_id=chatbot_id,
            document_id=document_id,
            chunks=chunks,
            metadata=[{"filename": title, "source_url": url, "source_type": "url"}] * len(chunks),
        )

        # Update BM25 index
        if settings.bm25_enabled:
            bm25_service = get_bm25_service()
            bm25_service.add_documents(
                chatbot_id=chatbot_id,
                chunks=chunks,
                chunk_ids=[f"{document_id}_{i}" for i in range(len(chunks))],
            )

        logger.info(f"URL processed: {url} ({len(inserted_ids)} chunks, {len(models_used)} models)")

        return DocumentUploadResponse(
            message="URL processed successfully",
            document_id=document_id,
            chunks_created=len(chunks),
            embedding_models=models_used,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to process URL")
