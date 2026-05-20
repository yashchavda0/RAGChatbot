"""
Azure Document Intelligence OCR service - cloud-based OCR with high accuracy.
Default OCR provider for the RAG chatbot system.
"""
import asyncio
from typing import List, Dict, Any, Optional
from io import BytesIO
import os
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


class AzureOCRService:
    """
    Service for extracting text from documents using Azure Document Intelligence.

    Features:
    - Prebuilt Layout model for accurate text extraction
    - Supports PDF, images (PNG, JPG, JPEG, BMP, TIFF)
    - No GPU/local memory required
    - Better accuracy than open-source OCR
    - Handles tables and structured content
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
        self.endpoint = endpoint or settings.azure_doc_intelligence_endpoint
        self.api_key = api_key or settings.azure_doc_intelligence_key

        if not self.endpoint or not self.api_key:
            logger.warning(
                "Azure Document Intelligence credentials not configured. "
                "Set AZURE_DOC_INTELLIGENCE_ENDPOINT and AZURE_DOC_INTELLIGENCE_KEY."
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

    async def extract_text(
        self,
        image_data: bytes,
        file_name: str = "",
    ) -> Dict[str, Any]:
        """
        Extract text from image/PDF data.

        Args:
            image_data: Image or PDF bytes
            file_name: Optional file name for logging

        Returns:
            Dictionary with extracted text and metadata
        """
        if not self.client:
            raise ValueError("Azure OCR service not configured. Set credentials.")

        try:
            logger.info(f"Extracting text with Azure OCR: {file_name}")

            loop = asyncio.get_event_loop()

            def _analyze():
                poller = self.client.begin_analyze_document(
                    "prebuilt-layout",
                    image_data,
                )
                return poller.result()

            result = await loop.run_in_executor(None, _analyze)

            # Extract text from all pages
            texts = []
            confidences = []
            pages_info = []

            for page in result.pages:
                page_text = []
                for line in page.lines:
                    page_text.append(line.content)

                texts.extend(page_text)
                pages_info.append({
                    "page_number": page.page_number,
                    "width": page.width,
                    "height": page.height,
                    "lines_count": len(page.lines),
                })

            full_text = "\n".join(texts)

            # Azure doesn't provide per-line confidence, use 1.0 for success
            avg_confidence = 1.0

            result_dict = {
                "text": full_text,
                "confidence": avg_confidence,
                "line_count": len(texts),
                "lines": texts,
                "confidences": [1.0] * len(texts),
                "pages": pages_info,
                "provider": "azure",
            }

            logger.info(f"Azure OCR complete: {len(texts)} lines from {len(pages_info)} pages")

            return result_dict

        except Exception as e:
            logger.error(f"Error in Azure OCR extraction: {e}")
            return {
                "text": "",
                "confidence": 0.0,
                "line_count": 0,
                "lines": [],
                "confidences": [],
                "error": str(e),
                "provider": "azure",
            }

    async def extract_text_from_file(
        self,
        file_path: str,
    ) -> Dict[str, Any]:
        """
        Extract text from a file.

        Args:
            file_path: Path to file

        Returns:
            Dictionary with extracted text and metadata
        """
        try:
            with open(file_path, "rb") as f:
                file_data = f.read()

            return await self.extract_text(file_data, os.path.basename(file_path))

        except Exception as e:
            logger.error(f"Error processing file {file_path}: {e}")
            return {
                "text": "",
                "confidence": 0.0,
                "error": str(e),
            }

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
            raise ValueError("Azure OCR service not configured.")

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

            # Extract paragraphs
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
