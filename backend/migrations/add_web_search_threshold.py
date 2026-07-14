"""
Migration to add web_search_threshold column to chatbots table.
Run this migration if you're upgrading from a version without web_search_threshold.
"""
from sqlalchemy import text
from config.logging_config import get_logger

logger = get_logger(__name__)


def migrate_add_web_search_threshold(engine):
    """Add web_search_threshold column to chatbots table if it doesn't exist."""
    try:
        with engine.connect() as conn:
            # Check if column already exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='chatbots' AND column_name='web_search_threshold'
            """))
            
            if result.fetchone() is None:
                # Column doesn't exist, add it
                conn.execute(text("""
                    ALTER TABLE chatbots 
                    ADD COLUMN web_search_threshold DOUBLE PRECISION DEFAULT 0.6
                """))
                logger.info("Successfully added web_search_threshold column to chatbots table")
            else:
                logger.info("web_search_threshold column already exists")
            
            # Backfill NULL values with default 0.6
            conn.execute(text("""
                UPDATE chatbots 
                SET web_search_threshold = 0.6 
                WHERE web_search_threshold IS NULL
            """))
            
            # Set column to NOT NULL after backfilling
            conn.execute(text("""
                ALTER TABLE chatbots 
                ALTER COLUMN web_search_threshold SET NOT NULL
            """))
            
            conn.commit()
            logger.info("Backfilled NULL web_search_threshold values and set column to NOT NULL")
                
    except Exception as e:
        logger.error(f"Error during migration: {e}")
        raise


if __name__ == "__main__":
    from services.postgres_service import get_postgres_service
    
    pg = get_postgres_service()
    migrate_add_web_search_threshold(pg.engine)
    print("Migration completed successfully")
