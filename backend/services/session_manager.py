"""
Session manager service for managing user sessions and conversation history.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from config import settings
from config.logging_config import get_logger
from services.postgres_service import get_postgres_service
from services.models import Session as DBSession, ConversationMessage

logger = get_logger(__name__)


class SessionManagerService:
    """Service for managing user sessions."""

    def __init__(self):
        """Initialize the session manager."""
        self.timeout_minutes = settings.session_timeout_minutes
        self.postgres = get_postgres_service()

        logger.info("Session manager service initialized")

    async def create_session(
        self,
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Create a new session.

        Args:
            user_id: Optional user identifier
            metadata: Optional session metadata

        Returns:
            Session ID
        """
        session_id = str(uuid.uuid4())

        try:
            with self.postgres.get_session() as db:
                db_session = DBSession(
                    session_id=session_id,
                    user_id=user_id,
                    meta_data=metadata or {},
                )

                db.add(db_session)
                db.commit()

                logger.info(f"Created session: {session_id}")

                return session_id

        except Exception as e:
            logger.error(f"Error creating session: {e}")
            raise

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session information.

        Args:
            session_id: Session identifier

        Returns:
            Session data or None
        """
        try:
            with self.postgres.get_session() as db:
                session = db.query(DBSession).filter(
                    DBSession.session_id == session_id
                ).first()

                if session:
                    return {
                        "session_id": session.session_id,
                        "user_id": session.user_id,
                        "created_at": session.created_at.isoformat(),
                        "last_activity": session.last_activity.isoformat(),
                        "metadata": session.meta_data,
                        "is_active": session.is_active,
                    }

                return None

        except Exception as e:
            logger.error(f"Error getting session: {e}")
            return None

    async def update_activity(self, session_id: str) -> bool:
        """Update session last activity timestamp."""
        try:
            with self.postgres.get_session() as db:
                session = db.query(DBSession).filter(
                    DBSession.session_id == session_id
                ).first()

                if session:
                    session.last_activity = datetime.now(timezone.utc)
                    db.commit()
                    return True

                return False

        except Exception as e:
            logger.error(f"Error updating session activity: {e}")
            return False

    async def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        sources: Optional[List[Dict[str, Any]]] = None,
        agent_executions: Optional[List[Dict[str, Any]]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Add a message to conversation history.

        Args:
            session_id: Session identifier
            role: Message role (user, assistant, system)
            content: Message content
            sources: Optional source citations
            agent_executions: Optional agent execution tracking
            metadata: Optional message metadata

        Returns:
            Message ID
        """
        message_id = str(uuid.uuid4())

        try:
            with self.postgres.get_session() as db:
                # Verify session exists
                session = db.query(DBSession).filter(
                    DBSession.session_id == session_id
                ).first()

                if not session:
                    raise ValueError(f"Session {session_id} not found")

                # Add message
                message = ConversationMessage(
                    message_id=message_id,
                    session_id=session_id,
                    role=role,
                    content=content,
                    sources=sources,
                    agent_executions=agent_executions,
                    meta_data=metadata or {},
                )

                db.add(message)
                db.commit()

                logger.info(f"Added message to session {session_id}")

                return message_id

        except Exception as e:
            logger.error(f"Error adding message: {e}")
            raise

    async def get_conversation_history(
        self,
        session_id: str,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Get conversation history for a session.

        Args:
            session_id: Session identifier
            limit: Maximum number of messages

        Returns:
            List of messages
        """
        try:
            with self.postgres.get_session() as db:
                messages = db.query(ConversationMessage).filter(
                    ConversationMessage.session_id == session_id
                ).order_by(ConversationMessage.timestamp.asc()).limit(limit).all()

                return [
                    {
                        "message_id": msg.message_id,
                        "role": msg.role,
                        "content": msg.content,
                        "sources": msg.sources,
                        "timestamp": msg.timestamp.isoformat(),
                    }
                    for msg in messages
                ]

        except Exception as e:
            logger.error(f"Error getting conversation history: {e}")
            return []

    async def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions based on timeout."""
        try:
            expiry_time = datetime.now(timezone.utc) - timedelta(minutes=self.timeout_minutes)

            with self.postgres.get_session() as db:
                expired = db.query(DBSession).filter(
                    DBSession.last_activity < expiry_time,
                    DBSession.is_active == True
                ).all()

                count = len(expired)

                for session in expired:
                    session.is_active = False

                db.commit()

                if count > 0:
                    logger.info(f"Marked {count} sessions as inactive")

                return count

        except Exception as e:
            logger.error(f"Error cleaning up sessions: {e}")
            return 0


# Global session manager service instance
_session_manager: Optional[SessionManagerService] = None


def get_session_manager() -> SessionManagerService:
    """Get or create the global session manager instance."""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManagerService()
    return _session_manager
