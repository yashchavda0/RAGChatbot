"""
Azure Document Intelligence OCR service - lightweight cloud-based OCR.
Uses Azure Prebuilt Layout model for document text extraction.
"""
import asyncio
from typing import List, Dict, Any, Optional
from io import BytesIO
import os
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
from config.logging_config import get_logger

logger = get_logger(__name__)


class AzureOCRService:
    """
    Service for extracting text from documents using Azure Document Intelligence.
    Lightweight alternative to PaddleOCR - no local models required.

    Features:
    - Prebuilt Layout model for accurate text extraction
    - Supports PDF, images (PNG, JPG, JPEG, BMP, TIFF)
    - No GPU/local memory required
    - Better accuracy than open-source OCR
    """

    def __init__(
        self,
        endpoint: Optional[str] = None,
        api_key: Optional[str] = None,
    ):
        """
        Initialize Azure OCR service.

        Args:
            endpoint: Azure Document Intelligence endpoint
            api_key: Azure Document Intelligence API key
        """
        self.endpoint = endpoint or os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
        self.api_key = api_key or os.getenv("AZURE_DOCUMENT_INTELLIGENCE_KEY")

        if not self.endpoint or not self.api_key:
            logger.warning(
                "Azure Document Intelligence credentials not set. "
                "Set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and "
                "AZURE_DOCUMENT_INTELLIGENCE_KEY environment variables."
            )
            self.client = None
        else:
            self.client = DocumentAnalysisClient(
                endpoint=self.endpoint,
                credential=AzureKeyCredential(self.api_key),
            )
            logger.info("Azure OCR service initialized")

    def is_configured(self) -> bool:
        """Check if the service is properly configured."""
        return self.client is not None

    async def extract_text_from_image(
        self,
        image_data: bytes,
        language: str = "en",
    ) -> Dict[str, Any]:
        """
        Extract text from an image.

        Args:
            image_data: Image bytes
            language: Language code (not used by Azure, kept for compatibility)

        Returns:
            Dictionary with extracted text and metadata
        """
        if not self.client:
            raise ValueError("Azure OCR service not configured. Set credentials.")

        try:
            loop = asyncio.get_event_loop()

            def _analyze():
                # Use prebuilt-layout model
                poller = self.client.begin_analyze_document(
                    "prebuilt-layout",
                    image_data,
                )
                result = poller.result()
                return result

            result = await loop.run_in_executor(None, _analyze)

            # Extract text from all pages
            extracted_text = []
            pages_info = []

            for page in result.pages:
                page_text = []
                for line in page.lines:
                    page_text.append(line.content)

                extracted_text.append("\n".join(page_text))
                pages_info.append({
                    "page_number": page.page_number,
                    "width": page.width,
                    "height": page.height,
                    "lines_count": len(page.lines),
                })

            full_text = "\n\n".join(extracted_text)

            return {
                "text": full_text,
                "pages": pages_info,
                "total_pages": len(result.pages),
                "confidence": 1.0,  # Azure doesn't provide overall confidence
                "language": language,
            }

        except Exception as e:
            logger.error(f"Error extracting text from image: {e}")
            raise

    async def extract_text_from_pdf(
        self,
        pdf_data: bytes,
        language: str = "en",
    ) -> Dict[str, Any]:
        """
        Extract text from a PDF document.

        Args:
            pdf_data: PDF bytes
            language: Language code

        Returns:
            Dictionary with extracted text and metadata
        """
        # Azure handles PDF the same way as images
        return await self.extract_text_from_image(pdf_data, language)

    async def extract_text_from_file(
        self,
        file_path: str,
        language: str = "en",
    ) -> Dict[str, Any]:
        """
        Extract text from a file (PDF or image).

        Args:
            file_path: Path to the file
            language: Language code

        Returns:
            Dictionary with extracted text and metadata
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        with open(file_path, "rb") as f:
            file_data = f.read()

        return await self.extract_text_from_image(file_data, language)

    async def extract_text_from_multiple_files(
        self,
        file_paths: List[str],
        language: str = "en",
    ) -> List[Dict[str, Any]]:
        """
        Extract text from multiple files.

        Args:
            file_paths: List of file paths
            language: Language code

        Returns:
            List of extraction results
        """
        tasks = [self.extract_text_from_file(fp, language) for fp in file_paths]
        return await asyncio.gather(*tasks)

    async def extract_with_structure(
        self,
        document_data: bytes,
    ) -> Dict[str, Any]:
        """
        Extract text with document structure (tables, paragraphs, etc.).

        Args:
            document_data: Document bytes

        Returns:
            Dictionary with structured content
        """
        if not self.client:
            raise ValueError("Azure OCR service not configured. Set credentials.")

        try:
            loop = asyncio.get_event_loop()

            def _analyze():
                poller = self.client.begin_analyze_document(
                    "prebuilt-layout",
                    document_data,
                )
                return poller.result()

            result = await loop.run_in_executor(None, _analyze)

            # Extract structured content
            structured_content = {
                "text": "",
                "pages": [],
                "tables": [],
                "paragraphs": [],
            }

            # Extract pages and text
            for page in result.pages:
                page_text = "\n".join([line.content for line in page.lines])
                structured_content["text"] += page_text + "\n\n"
                structured_content["pages"].append({
                    "page_number": page.page_number,
                    "text": page_text,
                    "width": page.width,
                    "height": page.height,
                })

            # Extract tables
            for table in result.tables:
                table_data = []
                for cell in table.cells:
                    table_data.append({
                        "row_index": cell.row_index,
                        "column_index": cell.column_index,
                        "content": cell.content,
                        "row_span": cell.row_span,
                        "column_span": cell.column_span,
                    })
                structured_content["tables"].append({
                    "row_count": table.row_count,
                    "column_count": table.column_count,
                    "cells": table_data,
                })

            # Extract paragraphs (if available)
            if hasattr(result, "paragraphs") and result.paragraphs:
                for para in result.paragraphs:
                    structured_content["paragraphs"].append({
                        "content": para.content,
                        "role": para.role if hasattr(para, "role") else None,
                    })

            return structured_content

        except Exception as e:
            logger.error(f"Error extracting structured content: {e}")
            raise


# Global Azure OCR service instance
_azure_ocr_service: Optional[AzureOCRService] = None


def get_azure_ocr_service() -> AzureOCRService:
    """Get or create the global Azure OCR service instance."""
    global _azure_ocr_service
    if _azure_ocr_service is None:
        _azure_ocr_service = AzureOCRService()
    return _azure_ocr_service
