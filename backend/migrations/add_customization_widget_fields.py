"""
Migration to add widget-only fields (button_text, show_branding) to the
chatbot_customizations table.

These were previously local-only on the Embed tab; they are now part of the
single persisted chatbot configuration. This migration is idempotent and only
adds columns that do not yet exist (existing rows are backfilled with defaults).
"""
from sqlalchemy import text
from config.logging_config import get_logger

logger = get_logger(__name__)


def _column_exists(conn, table: str, column: str) -> bool:
    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = :table AND column_name = :column
    """), {"table": table, "column": column})
    return result.fetchone() is not None


def migrate_add_customization_widget_fields(engine):
    """Add button_text and show_branding columns to chatbot_customizations."""
    try:
        with engine.connect() as conn:
            if not _column_exists(conn, "chatbot_customizations", "button_text"):
                conn.execute(text("""
                    ALTER TABLE chatbot_customizations
                    ADD COLUMN button_text VARCHAR(50) DEFAULT 'Chat with us'
                """))
                logger.info("Added button_text column to chatbot_customizations")
            else:
                logger.info("button_text column already exists on chatbot_customizations")

            if not _column_exists(conn, "chatbot_customizations", "show_branding"):
                conn.execute(text("""
                    ALTER TABLE chatbot_customizations
                    ADD COLUMN show_branding BOOLEAN DEFAULT TRUE
                """))
                logger.info("Added show_branding column to chatbot_customizations")
            else:
                logger.info("show_branding column already exists on chatbot_customizations")

            # Backfill any NULLs on pre-existing rows
            conn.execute(text("""
                UPDATE chatbot_customizations
                SET button_text = 'Chat with us'
                WHERE button_text IS NULL
            """))
            conn.execute(text("""
                UPDATE chatbot_customizations
                SET show_branding = TRUE
                WHERE show_branding IS NULL
            """))

            conn.commit()
            logger.info("Successfully ensured widget fields on chatbot_customizations")

    except Exception as e:
        logger.error(f"Error adding widget fields to customization table: {e}")
        raise


if __name__ == "__main__":
    from services.postgres_service import get_postgres_service

    pg = get_postgres_service()
    migrate_add_customization_widget_fields(pg.engine)
    print("Migration completed successfully")
