"""
Document routes for uploading and managing documents.
"""
import uuid
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from config.logging_config import get_logger
from services.document_processor import DocumentProcessorService
from services.text_splitter import TextSplitterService
from services.embedding_service import get_embedding_service
from services.milvus_service import MilvusService
from services.session_manager import get_session_manager
from api.schemas.chat import DocumentUploadResponse, DocumentListResponse

router = APIRouter(prefix="/documents", tags=["documents"])
logger = get_logger(__name__)


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    session_id: str = "default",
):
    """
    Upload and process a document.

    Supports: PDF, DOCX, TXT, MD
    The document is:
    1. Parsed for text
    2. Split into chunks
    3. Embedded with ALL 3 models (bge-small, bge-large, stella)
    4. Stored in Milvus for retrieval
    """
    document_id = str(uuid.uuid4())

    logger.info(f"Uploading document: {file.filename} (session: {session_id})")

    try:
        # Read file content
        content = await file.read()

        # Check file type
        processor = DocumentProcessorService()
        if not processor.is_supported(file.filename):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Supported: {processor.supported_formats}"
            )

        # Process document
        result = await processor.process_document(
            file_content=content,
            filename=file.filename,
            extract_images=True,
        )

        # Split into chunks
        splitter = TextSplitterService()
        chunks = splitter.split_text(result.get("text", ""))

        logger.info(f"Document split into {len(chunks)} chunks")

        # Generate embeddings with all models
        embedding_service = get_embedding_service()
        milvus_service = MilvusService()

        # Embed with all models and store in Milvus
        all_embeddings = await embedding_service.embed_documents_with_all_models(chunks)

        total_inserted = 0

        for model_name, embeddings in all_embeddings.items():
            # Insert embeddings for this model
            inserted = await milvus_service.insert_embeddings(
                embeddings=embeddings,
                document_id=document_id,
                chunks=chunks,
                embedding_model=model_name,
                metadata=[{"filename": file.filename}] * len(chunks),
            )

            total_inserted += len(inserted)

        # Save document metadata to database
        session_manager = get_session_manager()
        # Note: Would need to add document to database in production

        logger.info(
            f"Document uploaded successfully: {file.filename} "
            f"({total_inserted} embeddings across {len(all_embeddings)} models)"
        )

        return DocumentUploadResponse(
            message="Document processed successfully",
            document_id=document_id,
            chunks_created=len(chunks),
            embedding_models=list(all_embeddings.keys()),
        )

    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=DocumentListResponse)
async def list_documents(session_id: str = "default"):
    """List all documents for a session."""
    try:
        # TODO: Implement document listing from database
        return DocumentListResponse(documents=[])
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{document_id}")
async def delete_document(document_id: str):
    """Delete a document and its embeddings from Milvus."""
    try:
        from services.milvus_service import MilvusService

        milvus_service = MilvusService()

        # Delete from Milvus
        count = await milvus_service.delete_document(document_id)

        # TODO: Delete from database

        logger.info(f"Document deleted: {document_id} ({count} embeddings removed)")

        return {"message": "Document deleted successfully", "embeddings_removed": count}

    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/url")
async def upload_url(url: str, session_id: str = "default"):
    """Process a URL and index its content."""
    document_id = str(uuid.uuid4())

    logger.info(f"Processing URL: {url}")

    try:
        # TODO: Implement URL fetching and processing
        # For now, return a placeholder response

        return DocumentUploadResponse(
            message="URL processing not yet implemented",
            document_id=document_id,
            chunks_created=0,
            embedding_models=[],
        )

    except Exception as e:
        logger.error(f"Error processing URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))
