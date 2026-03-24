"""Configuration module for RAG Chatbot."""

from .settings import settings, get_settings, get_embedding_dimension, validate_embedding_models

__all__ = [
    "settings",
    "get_settings",
    "get_embedding_dimension",
    "validate_embedding_models",
]
