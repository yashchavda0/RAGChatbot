"""
Document processing tasks for Celery.
Handles async document upload, processing, and indexing.
"""
import base64
import asyncio
from typing import Dict, Any, List
from celery_app import celery_app
from tasks.base import CallbackTask
from config.logging_config import get_logger

logger = get_logger(__name__)


@celery_app.task(
    base=CallbackTask,
    bind=True,
    name='tasks.process_document',
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def process_document_async(
    self,
    chatbot_id: str,
    document_id: str,
    filename: str,
    content_base64: str,
) -> Dict[str, Any]:
    """
    Process a document asynchronously.
    
    Args:
        chatbot_id: ID of the chatbot
        document_id: Unique document identifier
        filename: Original filename
        content_base64: Base64-encoded file content
    
    Returns:
        Processing result with document_id, chunks_created, etc.
    """
    from services.document_processor import DocumentProcessorService
    from services.chunking_service import ChunkingService
    from services.embedding_service import get_embedding_service
    from services.milvus_service import get_milvus_service
    from services.bm25_service import get_bm25_service
    from services.minio_service import get_minio_service
    from services.chatbot_service import get_chatbot_service
    from services.postgres_service import get_postgres_service
    from services.models import ChatbotDocument
    from config.settings import settings
    
    logger.info(f"Starting document processing: {filename} for chatbot {chatbot_id}")
    
    try:
        # Decode content
        self.update_progress(5, "Decoding document...")
        content = base64.b64decode(content_base64)
        
        # Create PostgreSQL entry
        self.update_progress(10, "Creating database entry...")
        postgres_service = get_postgres_service()
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
        
        # Update chatbot status
        chatbot_service = get_chatbot_service()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(
            chatbot_service.update_status(chatbot_id, "training", training_progress=15)
        )
        
        # Upload to MinIO
        self.update_progress(20, "Uploading to object storage...")
        minio_service = get_minio_service()
        content_type = "application/pdf" if filename.endswith(".pdf") else "application/octet-stream"
        loop.run_until_complete(
            minio_service.upload_document(
                document_id=document_id,
                file_content=content,
                filename=filename,
                content_type=content_type,
                metadata={"chatbot_id": chatbot_id, "filename": filename},
            )
        )
        
        # Process document (extract text)
        self.update_progress(30, "Extracting text from document...")
        processor = DocumentProcessorService()
        result = loop.run_until_complete(
            processor.process_document(
                file_content=content,
                filename=filename,
                extract_images=True,
            )
        )
        
        text = result.get("text", "")
        if not text:
            raise ValueError("No text extracted from document")
        
        # Store OCR content if available
        if result.get("ocr_text"):
            self.update_progress(40, "Storing OCR content...")
            loop.run_until_complete(
                minio_service.upload_ocr_content(
                    document_id=document_id,
                    ocr_text=result["ocr_text"],
                )
            )
        
        # Chunk text
        self.update_progress(50, "Chunking document...")
        chatbot = loop.run_until_complete(chatbot_service.get(chatbot_id))
        chunk_size = chatbot.chunk_size if chatbot else 512
        chunk_overlap = chatbot.chunk_overlap if chatbot else 50
        
        chunker = ChunkingService(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        chunk_result = chunker.split_text(text)
        chunks = [c["content"] for c in chunk_result]
        
        logger.info(f"Document split into {len(chunks)} chunks")
        
        # Generate embeddings
        self.update_progress(60, f"Generating embeddings for {len(chunks)} chunks...")
        embedding_service = get_embedding_service()
        all_embeddings = loop.run_until_complete(
            embedding_service.embed_documents_with_all_models(chunks)
        )
        models_used = list(all_embeddings.keys())
        logger.info(f"Generated embeddings with models: {models_used}")
        
        # Insert into Milvus
        self.update_progress(75, "Indexing vectors...")
        milvus_service = get_milvus_service()
        inserted_ids = loop.run_until_complete(
            milvus_service.insert_embeddings(
                embeddings=all_embeddings,
                chatbot_id=chatbot_id,
                document_id=document_id,
                chunks=chunks,
                metadata=[
                    {
                        "filename": filename,
                        "source_type": "upload",
                        "document_name": filename,
                    }
                ] * len(chunks),
            )
        )
        
        # Update BM25 index
        if settings.bm25_enabled:
            self.update_progress(85, "Updating BM25 index...")
            bm25_service = get_bm25_service()
            bm25_service.add_documents(
                chatbot_id=chatbot_id,
                chunks=chunks,
                chunk_ids=[f"{document_id}_{i}" for i in range(len(chunks))],
            )
        
        # Update document status
        self.update_progress(95, "Finalizing...")
        session = postgres_service.session_factory()
        doc = session.query(ChatbotDocument).filter_by(id=document_id).first()
        if doc:
            doc.status = "completed"
            doc.chunks_count = len(chunks)
            doc.embedding_models = models_used
            session.commit()
        session.close()
        
        # Update chatbot status
        loop.run_until_complete(
            chatbot_service.update_status(chatbot_id, "active", training_progress=100)
        )
        
        loop.close()
        
        logger.info(f"Document processed successfully: {filename} ({len(chunks)} chunks)")
        
        return {
            "document_id": document_id,
            "filename": filename,
            "chunks_created": len(chunks),
            "embedding_models": models_used,
            "status": "completed",
        }
        
    except Exception as e:
        logger.error(f"Error processing document {filename}: {e}")
        
        # Update document status to failed
        try:
            postgres_service = get_postgres_service()
            session = postgres_service.session_factory()
            doc = session.query(ChatbotDocument).filter_by(id=document_id).first()
            if doc:
                doc.status = "failed"
                doc.error_message = str(e)
                session.commit()
            session.close()
        except:
            pass
        
        raise


@celery_app.task(
    base=CallbackTask,
    bind=True,
    name='tasks.process_batch_documents',
)
def process_batch_documents_async(
    self,
    chatbot_id: str,
    documents: List[Dict[str, str]],
) -> Dict[str, Any]:
    """
    Process multiple documents in batch.
    
    Args:
        chatbot_id: ID of the chatbot
        documents: List of dicts with document_id, filename, content_base64
    
    Returns:
        Batch processing results
    """
    total = len(documents)
    results = []
    
    for idx, doc_data in enumerate(documents):
        progress = int((idx / total) * 100)
        self.update_progress(
            progress,
            f"Processing document {idx + 1}/{total}: {doc_data['filename']}"
        )
        
        # Process each document
        result = process_document_async.apply(
            args=(
                chatbot_id,
                doc_data['document_id'],
                doc_data['filename'],
                doc_data['content_base64'],
            )
        )
        results.append(result.get())
    
    return {
        "total": total,
        "succeeded": sum(1 for r in results if r.get("status") == "completed"),
        "failed": sum(1 for r in results if r.get("status") != "completed"),
        "results": results,
    }
