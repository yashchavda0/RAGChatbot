"""
OCR Agent - Execution

Processes images using Azure Document Intelligence to extract text from scanned documents,
images, and other visual content.
"""
import re
import os
import uuid
from typing import Dict, Any, List, Optional
from agents.base.base_agent import BaseAgent, register_agent
from graph.state import RAGState, update_agent_execution
from config.logging_config import get_logger

logger = get_logger(__name__)


def get_ocr_service():
    """Get the unified OCR service (lazy-loads provider based on config)."""
    from services.ocr_service import get_ocr_service as _get
    return _get()


def extract_image_references(text: str) -> List[str]:
    """
    Extract image references from text.
    Supports: file paths, data URIs, and image URLs.
    """
    patterns = [
        # File paths (relative or absolute)
        r'(?:^|\s)([a-zA-Z]:\\[^\s]+\.(?:png|jpg|jpeg|gif|bmp|tiff))',
        r'(?:^|\s)(/[^\s]+\.(?:png|jpg|jpeg|gif|bmp|tiff))',
        r'(?:^|\s)(\./[^\s]+\.(?:png|jpg|jpeg|gif|bmp|tiff))',
        # URLs
        r'(https?://[^\s]+\.(?:png|jpg|jpeg|gif|bmp|tiff)(?:\?[^\s]*)?)',
        # Data URIs
        r'(data:image/(?:png|jpeg|jpg|gif|bmp);base64,[A-Za-z0-9+/=]+)',
    ]

    refs = []
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        refs.extend(matches)

    return list(set(refs))


@register_agent(
    agent_id="ocr",
    name="OCR Agent",
    capabilities=["ocr", "azure_ocr", "image_processing", "text_extraction"],
    description="Extracts text from images using Azure Document Intelligence"
)
class OCRAgent(BaseAgent):
    """Process images using Azure Document Intelligence."""

    async def execute(self, state: RAGState) -> RAGState:
        """Process images through Azure OCR."""
        logger.info("Processing OCR...")

        state = update_agent_execution(
            state,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status="running",
            input_data={"query": state["query"][:100]},
        )

        try:
            ocr_service = get_ocr_service()
            query = state.get("query", "")
            metadata = state.get("metadata", {})

            ocr_results: List[Dict[str, Any]] = []

            # Check for images in metadata (uploaded via document endpoint)
            uploaded_images = metadata.get("images", [])

            # Extract image references from query
            image_refs = extract_image_references(query)

            # Combine all image sources
            all_images = []

            # Add uploaded images
            for img in uploaded_images:
                all_images.append({
                    "type": "uploaded",
                    "data": img.get("data"),
                    "filename": img.get("filename", "uploaded_image"),
                })

            # Add referenced images (URLs, file paths)
            for ref in image_refs:
                if ref.startswith("data:image"):
                    # Data URI - extract base64 data
                    all_images.append({
                        "type": "data_uri",
                        "data": ref,
                        "filename": "data_uri_image",
                    })
                elif ref.startswith(("http://", "https://")):
                    # URL - fetch and process
                    all_images.append({
                        "type": "url",
                        "url": ref,
                        "filename": ref.split("/")[-1] or "url_image",
                    })
                elif os.path.exists(ref):
                    # Local file path
                    all_images.append({
                        "type": "file",
                        "path": ref,
                        "filename": os.path.basename(ref),
                    })

            # Process each image
            for img_info in all_images:
                try:
                    result = await self._process_single_image(ocr_service, img_info)
                    if result:
                        ocr_results.append(result)
                except Exception as e:
                    logger.error(f"Error processing image {img_info.get('filename')}: {e}")
                    ocr_results.append({
                        "filename": img_info.get("filename", "unknown"),
                        "error": str(e),
                        "text": "",
                    })

            # Update state with results
            state["ocr_results"] = ocr_results

            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="completed",
                output_data={
                    "results_count": len(ocr_results),
                    "total_text_length": sum(len(r.get("text", "")) for r in ocr_results),
                },
            )

            logger.info(f"OCR completed: {len(ocr_results)} images processed")

        except Exception as e:
            logger.error(f"OCR agent error: {e}")
            state["ocr_results"] = []
            state = update_agent_execution(
                state,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status="failed",
                output_data={},
                error_message=str(e),
            )

        return state

    async def _process_single_image(
        self,
        ocr_service,
        img_info: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Process a single image and return results."""
        import base64
        import aiohttp

        img_type = img_info.get("type")
        filename = img_info.get("filename", "unknown")

        image_data: Optional[bytes] = None

        if img_type == "uploaded" and img_info.get("data"):
            # Base64 encoded uploaded data
            image_data = base64.b64decode(img_info["data"])

        elif img_type == "data_uri":
            # Extract base64 from data URI
            data_uri = img_info["data"]
            if ";base64," in data_uri:
                base64_data = data_uri.split(";base64,")[1]
                image_data = base64.b64decode(base64_data)

        elif img_type == "url":
            # Fetch image from URL
            url = img_info["url"]
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                    if response.status == 200:
                        image_data = await response.read()
                    else:
                        raise Exception(f"Failed to fetch image: HTTP {response.status}")

        elif img_type == "file":
            # Read from local file
            file_path = img_info["path"]
            with open(file_path, "rb") as f:
                image_data = f.read()

        if image_data:
            result = await ocr_service.extract_text(image_data, filename)
            return {
                "filename": filename,
                "text": result.get("text", ""),
                "confidence": result.get("confidence", 0.0),
                "line_count": result.get("line_count", 0),
                "lines": result.get("lines", []),
                "source": img_type,
            }

        return None
