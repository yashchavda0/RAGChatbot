"""
Migration to add input_max_chars to chatbot_customizations.

This allows admins to configure max user message length in the widget input.
The migration is idempotent and backfills NULL values.
"""

from sqlalchemy import text
from config.logging_config import get_logger

logger = get_logger(__name__)


def _column_exists(conn, table: str, column: str) -> bool:
    result = conn.execute(
        text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = :table AND column_name = :column
    """),
        {"table": table, "column": column},
    )
    return result.fetchone() is not None


def migrate_add_customization_input_max_chars(engine):
    """Add input_max_chars column to chatbot_customizations."""
    try:
        with engine.connect() as conn:
            if not _column_exists(conn, "chatbot_customizations", "input_max_chars"):
                conn.execute(text("""
                    ALTER TABLE chatbot_customizations
                    ADD COLUMN input_max_chars INTEGER DEFAULT 2000
                """))
                logger.info("Added input_max_chars column to chatbot_customizations")
            else:
                logger.info(
                    "input_max_chars column already exists on chatbot_customizations"
                )

            conn.execute(text("""
                UPDATE chatbot_customizations
                SET input_max_chars = 2000
                WHERE input_max_chars IS NULL
            """))

            conn.execute(text("""
                UPDATE chatbot_customizations
                SET input_max_chars = 2000
                WHERE input_max_chars < 1
            """))

            conn.commit()
            logger.info(
                "Successfully ensured input_max_chars on chatbot_customizations"
            )

    except Exception as e:
        logger.error(f"Error adding input_max_chars to customization table: {e}")
        raise


if __name__ == "__main__":
    from services.postgres_service import get_postgres_service

    pg = get_postgres_service()
    migrate_add_customization_input_max_chars(pg.engine)
    print("Migration completed successfully")
