"""
Lightweight configuration settings for CPU-only development.
Extends base settings with ChromaDB and Gemini embeddings.
"""
from typing import List
from pydantic import Field
from .settings import Settings


class LiteSettings(Settings):
    """
    Lightweight settings for CPU-only development.
    - Uses ChromaDB instead of Milvus (no Docker required for vector DB)
    - Uses Gemini API for embeddings (no local models)
    - Uses Azure Document Intelligence for OCR (no PaddlePaddle)
    """

    # Override embedding settings - use Gemini API
    embedding_models: List[str] = Field(
        default=["text-embedding-004"],
        description="Gemini embedding model only"
    )
    default_embedding_model: str = Field(
        default="text-embedding-004",
        description="Gemini embedding model"
    )
    embedding_device: str = Field(
        default="api",  # Not used, but kept for compatibility
        description="Using API, not local device"
    )

    # Override reranker - use lighter model or skip
    reranker_model: str = Field(
        default="",  # Disable local reranker
        description="Disabled in lite mode"
    )
    reranker_device: str = Field(
        default="cpu",
        description="Not used in lite mode"
    )

    # ChromaDB settings (replaces Milvus)
    chromadb_persist_dir: str = Field(
        default="./data/chromadb",
        description="ChromaDB persistence directory"
    )
    chromadb_collection_name: str = Field(
        default="document_embeddings",
        description="ChromaDB collection name"
    )

    # Azure Document Intelligence settings (replaces PaddleOCR)
    azure_document_intelligence_endpoint: str = Field(
        default="",
        description="Azure Document Intelligence endpoint"
    )
    azure_document_intelligence_key: str = Field(
        default="",
        description="Azure Document Intelligence API key"
    )

    # Lite mode flag
    lite_mode: bool = Field(
        default=True,
        description="Enable lightweight mode"
    )


# Global lite settings instance
lite_settings = LiteSettings()


def get_lite_settings() -> LiteSettings:
    """Get the global lite settings instance."""
    return lite_settings
