"""
Configuration settings for the RAG Chatbot system.
Loads all environment variables and provides typed access.
"""
import os
import secrets
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Configuration
    api_host: str = Field(default="0.0.0.0", description="API host address")
    api_port: int = Field(default=8000, description="API port")
    cors_origins: List[str] = Field(default=["http://localhost:3000"], description="CORS allowed origins")
    integration_api_key: str = Field(default="", description="API key for integration endpoints")

    # Environment detection
    environment: str = Field(default="development", description="Environment (development/production)")

    # Security
    secret_key: str = Field(
        default="change-this-in-production-use-at-least-32-chars",
        description="Secret key for JWT signing and cryptographic operations"
    )

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str, info) -> str:
        """Validate secret key is secure in production."""
        env = info.data.get("environment", "development")
        if env == "production" and (not v or v.startswith("change-this")):
            raise ValueError("SECRET_KEY must be set to a secure value in production")
        if env == "production" and len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters in production")
        return v

    # Base URL for external access
    base_url: str = Field(
        default="http://localhost:8000",
        description="Base URL for external access (used for embed codes, webhooks, etc.)"
    )

    @field_validator("integration_api_key")
    @classmethod
    def validate_integration_api_key(cls, v: str, info) -> str:
        """Validate integration API key is secure in production."""
        # Get environment from the data being validated
        env = info.data.get("environment", "development")

        if env == "production":
            if not v or v == "change-this-in-production":
                raise ValueError("INTEGRATION_API_KEY must be set to a secure value in production")
            if len(v) < 32:
                raise ValueError("INTEGRATION_API_KEY must be at least 32 characters in production")

        # Generate a random key for development if not set
        if not v or v == "change-this-in-production":
            return secrets.token_urlsafe(32)

        return v

    # Gemini LLM
    gemini_api_key: str = Field(default="", description="Google Gemini API key")
    gemini_model: str = Field(default="gemini-1.5-pro", description="Gemini model name")
    gemini_temperature: float = Field(default=0.7, description="Default temperature for Gemini")
    gemini_max_tokens: int = Field(default=4096, description="Max tokens for Gemini responses")

    # Milvus Vector Database
    milvus_host: str = Field(default="localhost", description="Milvus host")
    milvus_port: int = Field(default=19530, description="Milvus port")
    milvus_collection_name: str = Field(default="document_embeddings", description="Milvus collection name")
    milvus_dimension: int = Field(default=768, description="Embedding dimension (must match default_embedding_model)")

    # PostgreSQL Database
    postgres_url: str = Field(default="", description="PostgreSQL connection URL (required)")

    @field_validator("postgres_url")
    @classmethod
    def validate_postgres_url(cls, v: str, info) -> str:
        """Validate PostgreSQL URL is set in production."""
        env = info.data.get("environment", "development")
        if env == "production" and not v:
            raise ValueError("POSTGRES_URL must be set in production")
        # Default for development only
        if not v:
            return "postgresql://raguser:ragpassword@localhost:5432/rag_chatbot"
        return v
    postgres_pool_size: int = Field(default=10, description="PostgreSQL connection pool size")
    postgres_max_overflow: int = Field(default=20, description="PostgreSQL max overflow")

    # Redis Cache
    redis_url: str = Field(default="redis://localhost:6379/0", description="Redis connection URL")
    redis_cache_ttl: int = Field(default=3600, description="Default cache TTL in seconds")

    # Tavily Web Search
    tavily_api_key: str = Field(default="", description="Tavily API key for web search")
    tavily_max_results: int = Field(default=10, description="Max results from Tavily")

    # Embedding Models (Gemini API — zero local memory)
    embedding_models: List[str] = Field(
        default=["gemini-text-embedding-004"],
        description="List of embedding models to use simultaneously"
    )
    default_embedding_model: str = Field(default="gemini-text-embedding-004", description="Default embedding model")
    embedding_device: str = Field(default="cpu", description="Device for embeddings (cpu/cuda)")

    # Reranker
    reranker_model: str = Field(default="gemini-reranker", description="Reranker implementation")
    reranker_device: str = Field(default="cpu", description="Device for reranker (cpu/cuda)")
    reranker_top_k: int = Field(default=10, description="Top-k results after reranking")

    # OCR Configuration (Azure Document Intelligence — prebuilt-layout)
    azure_doc_intelligence_endpoint: str = Field(

    # Azure Document Intelligence (default OCR)
    azure_doc_intelligence_endpoint: str = Field(
        default="",
        description="Azure Document Intelligence endpoint"
    )
    azure_doc_intelligence_key: str = Field(
        default="",
        description="Azure Document Intelligence API key"
    )

    # Document Processing
    chunk_size: int = Field(default=1000, description="Text chunk size")
    chunk_overlap: int = Field(default=200, description="Text chunk overlap")

    # Logging
    log_level: str = Field(default="INFO", description="Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)")
    log_format: str = Field(default="json", description="Log format (json, text)")

    # Session
    session_timeout_minutes: int = Field(default=30, description="Session timeout in minutes")

    # WebSocket
    websocket_message_queue_size: int = Field(default=100, description="WebSocket message queue size")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get the global settings instance."""
    return settings


# Model dimensions for validation
EMBEDDING_DIMENSIONS = {
    "gemini-text-embedding-004": 768,
}


def get_embedding_dimension(model_name: str) -> int:
    """Get the embedding dimension for a specific model."""
    return EMBEDDING_DIMENSIONS.get(model_name, 768)


def validate_embedding_models() -> bool:
    """Validate that all configured embedding models are supported."""
    for model in settings.embedding_models:
        if model not in EMBEDDING_DIMENSIONS:
            raise ValueError(f"Unsupported embedding model: {model}")
    return True
