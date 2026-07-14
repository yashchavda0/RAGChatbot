"""
Migration to add chatbot_id column to conversation_messages table.
Run this migration if you're upgrading from a version without chatbot_id in conversation_messages.
"""
from sqlalchemy import text
from config.logging_config import get_logger

logger = get_logger(__name__)


def migrate_add_chatbot_id_to_messages(engine):
    """Add chatbot_id column to conversation_messages table if it doesn't exist."""
    try:
        with engine.connect() as conn:
            # Check if column already exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='conversation_messages' AND column_name='chatbot_id'
            """))
            
            if result.fetchone() is None:
                # Column doesn't exist, add it
                conn.execute(text("""
                    ALTER TABLE conversation_messages 
                    ADD COLUMN chatbot_id VARCHAR(36)
                """))
                
                # Create index on chatbot_id
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS ix_conversation_messages_chatbot_id 
                    ON conversation_messages(chatbot_id)
                """))
                
                conn.commit()
                logger.info("Successfully added chatbot_id column to conversation_messages table")
            else:
                logger.info("chatbot_id column already exists in conversation_messages, skipping migration")
                
    except Exception as e:
        logger.error(f"Error during migration: {e}")
        raise


if __name__ == "__main__":
    from services.postgres_service import get_postgres_service
    
    pg = get_postgres_service()
    migrate_add_chatbot_id_to_messages(pg.engine)
    print("Migration completed successfully")
