"""
Migration to add parent_document_id column to chatbot_documents table.
Used to group scraped child pages under a parent "website" document.
"""
from sqlalchemy import text
from config.logging_config import get_logger

logger = get_logger(__name__)


def migrate_add_parent_document_id(engine):
    """Add parent_document_id column to chatbot_documents table if it doesn't exist."""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='chatbot_documents' AND column_name='parent_document_id'
            """))

            if result.fetchone() is None:
                conn.execute(text("""
                    ALTER TABLE chatbot_documents
                    ADD COLUMN parent_document_id VARCHAR(36)
                """))
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS ix_chatbot_documents_parent_document_id
                    ON chatbot_documents (parent_document_id)
                """))
                conn.commit()
                logger.info("Successfully added parent_document_id column to chatbot_documents table")
            else:
                logger.info("parent_document_id column already exists")

    except Exception as e:
        logger.error(f"Error during migration: {e}")
        raise


if __name__ == "__main__":
    from services.postgres_service import get_postgres_service

    pg = get_postgres_service()
    migrate_add_parent_document_id(pg.engine)
    print("Migration completed successfully")
