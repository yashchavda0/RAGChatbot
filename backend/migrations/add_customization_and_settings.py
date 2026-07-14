"""
Migration to add chatbot_customizations table and settings JSON column to chatbots table.
"""
from sqlalchemy import text
from config.logging_config import get_logger

logger = get_logger(__name__)


def migrate_create_customization_table(engine):
    """Create chatbot_customizations table if it doesn't exist."""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_name = 'chatbot_customizations'
            """))

            if result.fetchone() is not None:
                logger.info("chatbot_customizations table already exists")
                return

            conn.execute(text("""
                CREATE TABLE chatbot_customizations (
                    id VARCHAR(36) PRIMARY KEY,
                    chatbot_id VARCHAR(36) NOT NULL UNIQUE,
                    primary_color VARCHAR(20) DEFAULT '#5B5EFF',
                    position VARCHAR(20) DEFAULT 'bottom-right',
                    size VARCHAR(20) DEFAULT 'default',
                    border_radius INTEGER DEFAULT 18,
                    font_family VARCHAR(50) DEFAULT 'Inter',
                    greeting VARCHAR(100) DEFAULT 'Hello!',
                    welcome_message TEXT DEFAULT 'How can I help you today? Feel free to ask any questions.',
                    placeholder VARCHAR(100) DEFAULT 'Type your message...',
                    bot_name VARCHAR(50) DEFAULT 'AI Assistant',
                    avatar_url TEXT,
                    auto_open BOOLEAN DEFAULT FALSE,
                    show_typing_indicator BOOLEAN DEFAULT TRUE,
                    collect_user_info BOOLEAN DEFAULT FALSE,
                    button_text VARCHAR(50) DEFAULT 'Chat with us',
                    show_branding BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_chatbot_customizations_chatbot_id
                ON chatbot_customizations (chatbot_id)
            """))

            conn.commit()
            logger.info("Successfully created chatbot_customizations table")

    except Exception as e:
        logger.error(f"Error creating customization table: {e}")
        raise


def migrate_add_settings_column(engine):
    """Add settings JSON column to chatbots table if it doesn't exist."""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'chatbots' AND column_name = 'settings'
            """))

            if result.fetchone() is not None:
                logger.info("settings column already exists on chatbots table")
                return

            conn.execute(text("""
                ALTER TABLE chatbots
                ADD COLUMN settings JSON DEFAULT '{}'
            """))

            conn.execute(text("""
                UPDATE chatbots
                SET settings = '{}'
                WHERE settings IS NULL
            """))

            conn.commit()
            logger.info("Successfully added settings column to chatbots table")

    except Exception as e:
        logger.error(f"Error adding settings column: {e}")
        raise


if __name__ == "__main__":
    from services.postgres_service import get_postgres_service

    pg = get_postgres_service()
    migrate_create_customization_table(pg.engine)
    migrate_add_settings_column(pg.engine)
    print("Migration completed successfully")
