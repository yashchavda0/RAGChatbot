"""
Unified OCR service using Azure Document Intelligence (cloud-based).
No local OCR dependencies — zero RAM overhead.
"""
from typing import Dict, Any, Optional
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


class OCRService:
    """Azure-only OCR service. Zero local memory footprint."""

    _instance = None
    _provider_instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._provider_instance is not None:
            return

        from services.azure_ocr_service import AzureOCRService
        self._provider_instance = AzureOCRService()
        self._provider_name = "azure"

        if not self._provider_instance.is_configured():
            logger.warning(
                "Azure OCR not configured. Set AZURE_DOC_INTELLIGENCE_ENDPOINT "
                "and AZURE_DOC_INTELLIGENCE_KEY to enable OCR features."
            )
            self._provider_instance = None
            self._provider_name = "none"

        logger.info(f"OCR service initialized with provider: {self._provider_name}")

    @property
    def provider(self) -> str:
        return self._provider_name

    async def extract_text(
        self,
        image_data: bytes,
        file_name: str = "",
    ) -> Dict[str, Any]:
        if self._provider_instance is None:
            raise RuntimeError("No OCR provider available. Configure Azure Document Intelligence.")
        result = await self._provider_instance.extract_text(image_data, file_name)
        result["provider"] = self._provider_name
        return result

    async def extract_text_from_file(
        self,
        file_path: str,
    ) -> Dict[str, Any]:
        if self._provider_instance is None:
            raise RuntimeError("No OCR provider available. Configure Azure Document Intelligence.")
        result = await self._provider_instance.extract_text_from_file(file_path)
        result["provider"] = self._provider_name
        return result

    async def extract_with_structure(
        self,
        document_data: bytes,
    ) -> Dict[str, Any]:
        if self._provider_name == "azure" and hasattr(self._provider_instance, 'extract_with_structure'):
            return await self._provider_instance.extract_with_structure(document_data)
        else:
            result = await self.extract_text(document_data)
            return {
                "text": result.get("text", ""),
                "pages": [{"page_number": 1, "text": result.get("text", "")}],
                "tables": [],
                "paragraphs": [],
            }


_ocr_service: Optional[OCRService] = None


def get_ocr_service() -> OCRService:
    global _ocr_service
    if _ocr_service is None:
        _ocr_service = OCRService()
    return _ocr_service
