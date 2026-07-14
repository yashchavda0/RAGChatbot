"""
Configuration settings for the RAG Chatbot system.
Loads all environment variables and provides typed access.
"""

import json
import os
import secrets
from typing import Annotated, List, Optional
from pydantic_settings import BaseSettings, NoDecode
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Configuration
    api_host: str = Field(default="0.0.0.0", description="API host address")
    api_port: int = Field(default=8000, description="API port")
    cors_origins: Annotated[List[str], NoDecode] = Field(
        default=["http://localhost:3000"], description="CORS allowed origins"
    )

    @field_validator("cors_origins", "embedding_models", "local_embedding_models", mode="before")
    @classmethod
    def parse_list_env(cls, v):
        """Accept comma-separated strings (as documented in .env.example) or JSON arrays."""
        if not isinstance(v, str):
            return v
        v = v.strip()
        if not v:
            return []
        if v.startswith("["):
            return json.loads(v)
        return [item.strip() for item in v.split(",") if item.strip()]
    integration_api_key: str = Field(
        default="", description="API key for integration endpoints"
    )

    # Environment detection
    environment: str = Field(
        default="development", description="Environment (development/production)"
    )

    # Security
    secret_key: str = Field(
        default="change-this-in-production-use-at-least-32-chars",
        description="Secret key for JWT signing and cryptographic operations",
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
        description="Base URL for external access (used for embed codes, webhooks, etc.)",
    )

    @field_validator("integration_api_key")
    @classmethod
    def validate_integration_api_key(cls, v: str, info) -> str:
        """Validate integration API key is secure in production."""
        # Get environment from the data being validated
        env = info.data.get("environment", "development")

        if env == "production":
            if not v or v == "change-this-in-production":
                raise ValueError(
                    "INTEGRATION_API_KEY must be set to a secure value in production"
                )
            if len(v) < 32:
                raise ValueError(
                    "INTEGRATION_API_KEY must be at least 32 characters in production"
                )

        # Generate a random key for development if not set
        if not v or v == "change-this-in-production":
            return secrets.token_urlsafe(32)

        return v

    # Gemini LLM
    gemini_api_key: str = Field(default="", description="Google Gemini API key")
    gemini_model: str = Field(default="gemini-1.5-pro", description="Gemini model name")
    gemini_temperature: float = Field(
        default=0.7, description="Default temperature for Gemini"
    )
    gemini_max_tokens: int = Field(
        default=4096, description="Max tokens for Gemini responses"
    )

    # LLM Provider (gemini, groq, or azure)
    llm_provider: str = Field(
        default="gemini", description="LLM provider: gemini, groq, or azure"
    )

    # Groq
    groq_api_key: str = Field(default="", description="Groq API key")
    groq_model: str = Field(
        default="llama-3.3-70b-versatile", description="Groq model name"
    )

    # Azure OpenAI
    azure_openai_endpoint: str = Field(
        default="", description="Azure OpenAI endpoint URL"
    )
    azure_openai_api_key: str = Field(default="", description="Azure OpenAI API key")
    azure_openai_deployment: str = Field(
        default="", description="Azure OpenAI deployment name"
    )
    azure_openai_api_version: str = Field(
        default="2024-02-15-preview", description="Azure OpenAI API version"
    )

    # Milvus Vector Database
    milvus_host: str = Field(default="localhost", description="Milvus host")
    milvus_port: int = Field(default=19530, description="Milvus port")
    milvus_collection_name: str = Field(
        default="document_embeddings", description="Milvus collection name"
    )
    milvus_dimension: int = Field(
        default=768,
        description="Embedding dimension (must match default_embedding_model)",
    )

    # MinIO Object Storage
    minio_endpoint: str = Field(
        default="minio:9000", description="MinIO endpoint (use 'minio:9000' in Docker)"
    )
    minio_access_key: str = Field(default="minioadmin", description="MinIO access key")
    minio_secret_key: str = Field(default="minioadmin", description="MinIO secret key")
    minio_secure: bool = Field(default=False, description="Use HTTPS for MinIO")
    minio_bucket: str = Field(
        default="chatbot-documents", description="MinIO bucket name for documents"
    )

    # PostgreSQL Database
    postgres_url: str = Field(
        default="", description="PostgreSQL connection URL (required)"
    )

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

    postgres_pool_size: int = Field(
        default=10, description="PostgreSQL connection pool size"
    )
    postgres_max_overflow: int = Field(
        default=20, description="PostgreSQL max overflow"
    )

    # Redis Cache
    redis_url: str = Field(
        default="redis://localhost:6379/0", description="Redis connection URL"
    )
    redis_cache_ttl: int = Field(
        default=3600, description="Default cache TTL in seconds"
    )

    # Tavily Web Search
    tavily_api_key: str = Field(default="", description="Tavily API key for web search")
    tavily_max_results: int = Field(default=10, description="Max results from Tavily")

    # You.com Web Search
    youcom_api_key: str = Field(
        default="", description="You.com API key for web search"
    )
    youcom_max_results: int = Field(default=10, description="Max results from You.com")

    # Embedding Models
    embedding_models: Annotated[List[str], NoDecode] = Field(
        default=["gemini-embedding-001"],
        description="List of API embedding models to use: gemini-embedding-001, jina-embeddings-v3",
    )
    default_embedding_model: str = Field(
        default="gemini-embedding-001", description="Default embedding model"
    )
    embedding_device: str = Field(
        default="cpu", description="Device for local embeddings (cpu/cuda)"
    )

    # Jina AI Embeddings (free tier: 1M tokens/month)
    jina_api_key: str = Field(default="", description="Jina AI API key for embeddings")

    # Local Embedding Models (sentence-transformers, loaded on-demand)
    local_embedding_models: Annotated[List[str], NoDecode] = Field(
        default=[],
        description="Local models: nomic-embed-text-v1.5, all-MiniLM-L6-v2, bge-small-en-v1.5",
    )

    # Startup warmup (embeddings only)
    warmup_on_start: bool = Field(
        default=True, description="Run background warmup tasks after API startup"
    )
    warmup_embeddings: bool = Field(
        default=True, description="Warm embedding providers after startup"
    )
    warmup_local_embedding_models: bool = Field(
        default=True,
        description="Warm local embedding models during startup warmup (can be disabled in resource-constrained environments)",
    )
    warmup_delay_seconds: int = Field(
        default=8, description="Delay before background warmup starts"
    )

    # BM25 Hybrid Search
    bm25_enabled: bool = Field(
        default=True, description="Enable BM25 keyword matching in hybrid search"
    )
    bm25_weight: float = Field(
        default=0.3, description="BM25 weight in score fusion (0.0-1.0)"
    )

    # Relevance threshold for deciding if KB results are sufficient (0.0-1.0)
    relevance_threshold: float = Field(
        default=0.6,
        description="Default relevance threshold for KB results before falling back to web search",
    )

    # Ensemble Score Fusion
    ensemble_fusion_method: str = Field(
        default="rrf",
        description="Score fusion method: 'rrf' (Reciprocal Rank Fusion) or 'weighted'",
    )

    # Reranker (Gemini API for reranking)
    reranker_top_k: int = Field(
        default=10, description="Top-k results after reranking (legacy)"
    )

    # --- V2 Pipeline settings ---

    # Retrieval
    retrieval_top_k: int = Field(
        default=30,
        description="Number of candidate results to retrieve before reranking",
    )
    reranker_top_n: int = Field(
        default=5, description="Number of results to keep after reranking"
    )
    confidence_threshold: float = Field(
        default=0.6,
        description="Reranker score threshold for document confidence; below this triggers web fallback",
    )
    default_reasoning_mode: str = Field(
        default="fast_rag",
        description="Default reasoning mode: fast_rag | multi_step | research | expert_review",
    )
    query_rewrite_enabled: bool = Field(
        default=False,
        description="Enable LLM query rewriting for multi-turn pronoun resolution (off by default — keeps the query in the user's original language)",
    )
    context_compression_enabled: bool = Field(
        default=True, description="Enable context compression before generation"
    )

    # Groundedness gate (fast_rag): cheap embedding-based answer-vs-source check
    groundedness_check_enabled: bool = Field(
        default=True,
        description="Enable the post-synthesis groundedness check and bounded retry (fast_rag only)",
    )
    groundedness_threshold: float = Field(
        default=0.6,
        description="Min cosine(answer, source) for fast_rag groundedness; below this triggers a retry",
    )
    groundedness_max_retries: int = Field(
        default=1,
        description="Max response_synthesis retries when groundedness score is below threshold",
    )

    # Cache TTLs (seconds)
    embedding_cache_ttl: int = Field(
        default=86400, description="Embedding cache TTL (24h)"
    )
    retrieval_cache_ttl: int = Field(
        default=3600, description="Retrieval results cache TTL (1h)"
    )
    response_cache_ttl: int = Field(
        default=1800, description="Final response cache TTL (30min)"
    )
    session_cache_ttl: int = Field(
        default=3600, description="Session context cache TTL (1h)"
    )

    # Conversation memory
    conversation_history_limit: int = Field(
        default=6,
        description="Max prior messages loaded as conversation history (~3 exchanges)",
    )
    conversation_history_char_limit: int = Field(
        default=500,
        description="Max chars kept per prior message when building history",
    )

    # LangSmith Observability
    langsmith_api_key: Optional[str] = Field(
        default=None, description="LangSmith API key for tracing"
    )
    langsmith_project: str = Field(
        default="rag-chatbot", description="LangSmith project name"
    )
    langsmith_tracing_enabled: bool = Field(
        default=False, description="Enable LangSmith tracing"
    )

    # Azure Document Intelligence (default OCR)
    azure_doc_intelligence_endpoint: str = Field(
        default="", description="Azure Document Intelligence endpoint"
    )
    azure_doc_intelligence_key: str = Field(
        default="", description="Azure Document Intelligence API key"
    )

    # OCR Fallback Settings
    ocr_fallback_enabled: bool = Field(
        default=True,
        description="Enable OCR fallback for scanned PDFs when text extraction yields low results",
    )
    ocr_min_chars_per_page: int = Field(
        default=100,
        description="Minimum characters per page threshold to skip OCR fallback",
    )

    # Document Processing
    chunk_size: int = Field(default=1000, description="Text chunk size")
    chunk_overlap: int = Field(default=200, description="Text chunk overlap")

    # Logging
    log_level: str = Field(
        default="INFO", description="Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)"
    )
    log_format: str = Field(default="json", description="Log format (json, text)")
    log_task_only: bool = Field(
        default=True,
        description="Only emit task-completion/result INFO logs; keep warnings and errors",
    )
    # Enable queue-based asynchronous logging (offloads logging IO to background thread)
    log_async: bool = Field(
        default=False,
        description="If true, use a QueueHandler/QueueListener for non-blocking logging",
    )

    # Session
    session_timeout_minutes: int = Field(
        default=30, description="Session timeout in minutes"
    )

    # WebSocket
    websocket_message_queue_size: int = Field(
        default=100, description="WebSocket message queue size"
    )

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
    # API models
    "gemini-embedding-001": 768,
    "jina-embeddings-v3": 1024,
    # Local models (sentence-transformers)
    "nomic-embed-text-v1.5": 768,
    "all-MiniLM-L6-v2": 384,
    "bge-small-en-v1.5": 384,
}


def get_embedding_dimension(model_name: str) -> int:
    """Get the embedding dimension for a specific model."""
    return EMBEDDING_DIMENSIONS.get(model_name, 768)


def validate_embedding_models() -> bool:
    """Validate that all configured embedding models are supported."""
    all_models = settings.embedding_models + settings.local_embedding_models
    for model in all_models:
        if model not in EMBEDDING_DIMENSIONS:
            raise ValueError(
                f"Unsupported embedding model: {model}. Supported: {list(EMBEDDING_DIMENSIONS.keys())}"
            )
    return True
