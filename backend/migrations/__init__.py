"""
Database migrations for the RAG chatbot system.
"""

from .add_web_search_threshold import migrate_add_web_search_threshold
from .add_chatbot_id_to_messages import migrate_add_chatbot_id_to_messages
from .add_customization_and_settings import (
    migrate_create_customization_table,
    migrate_add_settings_column,
)
from .add_parent_document_id import migrate_add_parent_document_id
from .add_customization_widget_fields import migrate_add_customization_widget_fields
from .add_customization_input_max_chars import migrate_add_customization_input_max_chars

__all__ = [
    "migrate_add_web_search_threshold",
    "migrate_add_chatbot_id_to_messages",
    "migrate_create_customization_table",
    "migrate_add_settings_column",
    "migrate_add_parent_document_id",
    "migrate_add_customization_widget_fields",
    "migrate_add_customization_input_max_chars",
    "run_all_migrations",
]


def run_all_migrations(engine):
    """Run all pending migrations."""
    from config.logging_config import get_logger

    logger = get_logger(__name__)

    logger.info("Running database migrations...")

    # Run migrations in order
    migrate_add_web_search_threshold(engine)
    migrate_add_chatbot_id_to_messages(engine)
    migrate_create_customization_table(engine)
    migrate_add_settings_column(engine)
    migrate_add_parent_document_id(engine)
    migrate_add_customization_widget_fields(engine)
    migrate_add_customization_input_max_chars(engine)

    logger.info("All migrations completed")
