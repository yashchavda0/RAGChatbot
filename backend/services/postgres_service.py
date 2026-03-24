"""
PostgreSQL database service for connection and session management.
"""
from typing import Optional, List, Dict, Any
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


class PostgreSQLService:
    """Service for PostgreSQL database operations."""

    def __init__(self):
        """Initialize the PostgreSQL service."""
        self.url = settings.postgres_url
        self.pool_size = settings.postgres_pool_size
        self.max_overflow = settings.postgres_max_overflow
        self.engine = None
        self.session_factory = None

        self._connect()

        logger.info("PostgreSQL service initialized")

    def _connect(self) -> None:
        """Establish connection to PostgreSQL."""
        try:
            self.engine = create_engine(
                self.url,
                poolclass=QueuePool,
                pool_size=self.pool_size,
                max_overflow=self.max_overflow,
                pool_pre_ping=True,  # Verify connections before using
                echo=False,
            )

            self.session_factory = sessionmaker(
                bind=self.engine,
                autocommit=False,
                autoflush=False,
            )

            # Test connection
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))

            logger.info(f"Connected to PostgreSQL: {self.url[:20]}...")

        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            raise

    @contextmanager
    def get_session(self) -> Session:
        """Get a database session context manager."""
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    async def execute_query(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Execute a SQL query and return results.

        Args:
            query: SQL query
            params: Query parameters

        Returns:
            List of result dictionaries
        """
        try:
            with self.get_session() as session:
                result = session.execute(text(query), params or {})
                columns = result.keys()
                rows = result.fetchall()

                return [dict(zip(columns, row)) for row in rows]

        except Exception as e:
            logger.error(f"Error executing query: {e}")
            raise

    async def execute_command(
        self,
        command: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> int:
        """
        Execute a SQL command (INSERT, UPDATE, DELETE).

        Args:
            command: SQL command
            params: Command parameters

        Returns:
            Number of rows affected
        """
        try:
            with self.get_session() as session:
                result = session.execute(text(command), params or {})
                session.commit()
                return result.rowcount

        except Exception as e:
            logger.error(f"Error executing command: {e}")
            raise

    async def health_check(self) -> bool:
        """Check database health."""
        try:
            with self.get_session() as session:
                session.execute(text("SELECT 1"))
                return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False

    async def get_table_info(self, table_name: str) -> List[Dict[str, Any]]:
        """Get information about a table."""
        query = """
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = :table_name
            ORDER BY ordinal_position;
        """

        return await self.execute_query(query, {"table_name": table_name})

    # Whitelist of allowed tables for statistics queries
    ALLOWED_TABLES = frozenset([
        "agents", "agent_executions", "sessions", "conversation_messages",
        "documents", "document_chunks", "workflows", "workflow_executions",
        "plans", "plan_executions", "sources", "agent_logs"
    ])

    async def get_stats(self) -> Dict[str, Any]:
        """Get database statistics."""
        stats = {}

        try:
            # Get table row counts using parameterized table validation
            for table in self.ALLOWED_TABLES:
                # Use quote_identifier pattern to prevent SQL injection
                result = await self.execute_query(
                    f'SELECT COUNT(*) as count FROM "{table}"'
                )
                stats[table] = result[0]["count"] if result else 0

        except Exception as e:
            logger.error(f"Error getting stats: {e}")

        return stats


# Global PostgreSQL service instance
_postgres_service: Optional[PostgreSQLService] = None


def get_postgres_service() -> PostgreSQLService:
    """Get or create the global PostgreSQL service instance."""
    global _postgres_service
    if _postgres_service is None:
        _postgres_service = PostgreSQLService()
    return _postgres_service
