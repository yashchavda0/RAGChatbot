"""
MinIO service for document storage.
Handles uploading, retrieving, and deleting documents in S3-compatible storage.
"""
import io
import json
from typing import Optional, Dict, Any
from minio import Minio
from minio.error import S3Error
from config.logging_config import get_logger
from config.settings import settings

logger = get_logger(__name__)


class MinIOService:
    """Service for managing documents in MinIO."""

    def __init__(self):
        """Initialize MinIO client."""
        self.client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
        self.bucket_name = settings.minio_bucket
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist."""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info(f"Created MinIO bucket: {self.bucket_name}")
            else:
                logger.debug(f"MinIO bucket already exists: {self.bucket_name}")
        except S3Error as e:
            logger.error(f"Error creating MinIO bucket: {e}")
            raise

    async def upload_document(
        self,
        document_id: str,
        file_content: bytes,
        filename: str,
        content_type: str = "application/octet-stream",
        metadata: Optional[Dict[str, str]] = None,
    ) -> str:
        """
        Upload a document to MinIO.

        Args:
            document_id: Unique document identifier
            file_content: File content as bytes
            filename: Original filename (used for extension detection)
            content_type: MIME type of the file
            metadata: Optional metadata to store with the file

        Returns:
            Object name in MinIO
        """
        try:
            # Determine file extension
            ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
            object_name = f"{document_id}.{ext}"

            # Convert bytes to BytesIO
            file_data = io.BytesIO(file_content)
            file_size = len(file_content)

            # Upload to MinIO
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                data=file_data,
                length=file_size,
                content_type=content_type,
                metadata=metadata or {},
            )

            logger.info(f"Uploaded document to MinIO: {object_name} ({file_size} bytes)")
            return object_name

        except S3Error as e:
            logger.error(f"Error uploading document to MinIO: {e}")
            raise

    async def upload_ocr_content(
        self,
        document_id: str,
        ocr_text: str,
    ) -> str:
        """
        Store OCR-extracted text as JSON in MinIO.

        Args:
            document_id: Document identifier
            ocr_text: OCR-extracted text content

        Returns:
            Object name in MinIO
        """
        try:
            object_name = f"{document_id}_ocr.json"
            ocr_data = {
                "document_id": document_id,
                "ocr_text": ocr_text,
                "extracted_at": None,  # Could add timestamp if needed
            }

            # Convert to JSON bytes
            json_content = json.dumps(ocr_data, indent=2).encode("utf-8")
            file_data = io.BytesIO(json_content)

            # Upload to MinIO
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                data=file_data,
                length=len(json_content),
                content_type="application/json",
            )

            logger.info(f"Uploaded OCR content to MinIO: {object_name}")
            return object_name

        except S3Error as e:
            logger.error(f"Error uploading OCR content to MinIO: {e}")
            raise

    async def get_document_url(
        self,
        document_id: str,
        filename: str,
        expires: int = 3600,
    ) -> str:
        """
        Generate a presigned URL for document download.

        Args:
            document_id: Document identifier
            filename: Original filename (for extension)
            expires: URL expiration time in seconds (default: 1 hour)

        Returns:
            Presigned URL for download
        """
        try:
            # Determine object name from filename extension
            ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
            object_name = f"{document_id}.{ext}"

            # Generate presigned URL
            url = self.client.presigned_get_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                expires=expires,
            )

            logger.debug(f"Generated presigned URL for: {object_name}")
            return url

        except S3Error as e:
            logger.error(f"Error generating presigned URL: {e}")
            raise

    async def delete_document(
        self,
        document_id: str,
        filename: Optional[str] = None,
    ) -> bool:
        """
        Delete a document from MinIO.

        Args:
            document_id: Document identifier
            filename: Optional filename for extension detection

        Returns:
            True if deleted successfully
        """
        try:
            # Try to delete with known extension if filename provided
            if filename and "." in filename:
                ext = filename.rsplit(".", 1)[-1]
                object_name = f"{document_id}.{ext}"
                self._remove_object_if_exists(object_name)
            else:
                # Try common extensions
                for ext in ["pdf", "docx", "doc", "txt", "md", "png", "jpg", "jpeg"]:
                    object_name = f"{document_id}.{ext}"
                    self._remove_object_if_exists(object_name)

            # Also delete OCR content if exists
            ocr_object = f"{document_id}_ocr.json"
            self._remove_object_if_exists(ocr_object)

            logger.info(f"Deleted document from MinIO: {document_id}")
            return True

        except S3Error as e:
            logger.error(f"Error deleting document from MinIO: {e}")
            raise

    def _remove_object_if_exists(self, object_name: str):
        """Remove object if it exists, no error if not found."""
        try:
            self.client.remove_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
            )
            logger.debug(f"Removed object: {object_name}")
        except S3Error as e:
            # Ignore if object doesn't exist
            if "NoSuchKey" not in str(e):
                logger.warning(f"Error removing object {object_name}: {e}")

    async def document_exists(
        self,
        document_id: str,
        filename: Optional[str] = None,
    ) -> bool:
        """
        Check if a document exists in MinIO.

        Args:
            document_id: Document identifier
            filename: Optional filename for extension detection

        Returns:
            True if document exists
        """
        try:
            if filename and "." in filename:
                ext = filename.rsplit(".", 1)[-1]
                object_name = f"{document_id}.{ext}"

                try:
                    self.client.stat_object(
                        bucket_name=self.bucket_name,
                        object_name=object_name,
                    )
                    return True
                except S3Error:
                    return False

            # Try common extensions
            for ext in ["pdf", "docx", "doc", "txt", "md", "png", "jpg", "jpeg"]:
                object_name = f"{document_id}.{ext}"
                try:
                    self.client.stat_object(
                        bucket_name=self.bucket_name,
                        object_name=object_name,
                    )
                    return True
                except S3Error:
                    continue

            return False

        except S3Error as e:
            logger.error(f"Error checking document existence: {e}")
            return False


# Singleton instance
_minio_service: Optional[MinIOService] = None


def get_minio_service() -> MinIOService:
    """Get or create the MinIO service singleton."""
    global _minio_service
    if _minio_service is None:
        _minio_service = MinIOService()
    return _minio_service
