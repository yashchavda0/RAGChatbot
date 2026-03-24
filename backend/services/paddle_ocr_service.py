"""
PaddleOCR service for text extraction from images and scanned documents.
"""
import os
from typing import List, Dict, Any, Optional, Tuple
from paddleocr import PaddleOCR
from PIL import Image
import io
import numpy as np
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


class PaddleOCRService:
    """Service for OCR text extraction using PaddleOCR."""

    def __init__(self):
        """Initialize the PaddleOCR service."""
        self.lang = settings.ocr_lang
        self.use_gpu = settings.ocr_use_gpu
        self.ocr: Optional[PaddleOCR] = None

        self._load_model()

        logger.info(
            f"PaddleOCR service initialized (lang: {self.lang}, gpu: {self.use_gpu})"
        )

    def _load_model(self) -> None:
        """Load the PaddleOCR model."""
        try:
            logger.info("Loading PaddleOCR model...")

            self.ocr = PaddleOCR(
                use_angle_cls=True,
                lang=self.lang[0] if self.lang else 'en',
                use_gpu=self.use_gpu,
                show_log=False,
            )

            logger.info("PaddleOCR model loaded successfully")

        except Exception as e:
            logger.error(f"Error loading PaddleOCR: {e}")
            raise

    async def extract_text(
        self,
        image_data: bytes,
        file_name: str = "",
    ) -> Dict[str, Any]:
        """
        Extract text from image data.

        Args:
            image_data: Image bytes
            file_name: Optional file name for logging

        Returns:
            Dictionary with extracted text and metadata
        """
        try:
            logger.info(f"Extracting text from image: {file_name}")

            # Convert bytes to numpy array
            image = Image.open(io.BytesIO(image_data))

            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')

            image_np = np.array(image)

            # Run OCR
            result = self.ocr.ocr(image_np, cls=True)

            # Extract text
            texts = []
            confidences = []
            boxes = []

            if result and result[0]:
                for line in result[0]:
                    if line:
                        box = line[0]
                        text_info = line[1]

                        if text_info:
                            text = text_info[0]
                            confidence = text_info[1]

                            texts.append(text)
                            confidences.append(confidence)
                            boxes.append(box)

            # Combine all text
            full_text = '\n'.join(texts)

            # Calculate average confidence
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

            result_dict = {
                "text": full_text,
                "confidence": avg_confidence,
                "line_count": len(texts),
                "lines": texts,
                "confidences": confidences,
                "boxes": boxes,
            }

            logger.info(
                f"OCR complete: {len(texts)} lines extracted "
                f"(confidence: {avg_confidence:.2f})"
            )

            return result_dict

        except Exception as e:
            logger.error(f"Error in OCR extraction: {e}")
            return {
                "text": "",
                "confidence": 0.0,
                "line_count": 0,
                "lines": [],
                "confidences": [],
                "boxes": [],
                "error": str(e),
            }

    async def extract_text_from_file(
        self,
        file_path: str,
    ) -> Dict[str, Any]:
        """
        Extract text from an image file.

        Args:
            file_path: Path to image file

        Returns:
            Dictionary with extracted text and metadata
        """
        try:
            with open(file_path, 'rb') as f:
                image_data = f.read()

            return await self.extract_text(image_data, os.path.basename(file_path))

        except Exception as e:
            logger.error(f"Error processing file {file_path}: {e}")
            return {
                "text": "",
                "confidence": 0.0,
                "error": str(e),
            }

    async def batch_extract(
        self,
        images: List[Tuple[bytes, str]],
    ) -> List[Dict[str, Any]]:
        """
        Extract text from multiple images.

        Args:
            images: List of (image_data, file_name) tuples

        Returns:
            List of extraction results
        """
        results = []

        for image_data, file_name in images:
            result = await self.extract_text(image_data, file_name)
            results.append(result)

        return results
