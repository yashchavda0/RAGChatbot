"""
Chatbot service for CRUD operations and training management.
"""

import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import select, update, delete, func, case
from config.logging_config import get_logger
from services.postgres_service import get_postgres_service
from services.models import (
    Chatbot,
    ChatbotDocument,
    ChatbotMetadata,
    ConversationMessage,
)

logger = get_logger(__name__)


class ChatbotService:
    """Service for managing chatbots."""

    def __init__(self):
        """Initialize the chatbot service."""
        self._postgres = get_postgres_service()

    def _get_session(self):
        """Get a database session from the shared engine."""
        return self._postgres.session_factory()

    async def create(
        self,
        name: str,
        description: Optional[str] = None,
        system_prompt: Optional[str] = None,
        web_search_threshold: Optional[float] = None,
        embedding_model: str = "gemini-embedding-001",
        chunk_size: int = 1024,
        chunk_overlap: int = 50,
        settings: Optional[Dict[str, Any]] = None,
        icon: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a new chatbot.

        Args:
            name: Chatbot name
            description: Optional description
            system_prompt: System prompt for the LLM
            embedding_model: Embedding model to use
            chunk_size: Text chunk size
            chunk_overlap: Chunk overlap
            settings: Initial settings dict
            icon: Icon key to store in settings

        Returns:
            Created chatbot data
        """
        chatbot_id = str(uuid.uuid4())
        resolved_settings = dict(settings or {})
        if icon is not None:
            resolved_settings["icon"] = icon

        session = self._get_session()
        try:
            chatbot = Chatbot(
                id=chatbot_id,
                name=name,
                description=description,
                system_prompt=system_prompt
                or "You are a helpful assistant. Answer based only on the provided context from the knowledge base.",
                web_search_threshold=web_search_threshold,
                embedding_model=embedding_model,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                status="draft",
                settings=resolved_settings,
            )

            session.add(chatbot)

            # Create metadata entry
            metadata = ChatbotMetadata(
                chatbot_id=chatbot_id,
                total_chunks=0,
                total_documents=0,
                training_progress=0,
            )
            session.add(metadata)

            session.commit()

            logger.info(f"Created chatbot: {chatbot_id} - {name}")

            return {
                "id": chatbot_id,
                "name": name,
                "description": description,
                "system_prompt": chatbot.system_prompt,
                "web_search_threshold": chatbot.web_search_threshold,
                "status": "draft",
                "embedding_model": embedding_model,
                "chunk_size": chunk_size,
                "chunk_overlap": chunk_overlap,
                "created_at": chatbot.created_at.isoformat(),
                "settings": resolved_settings,
            }

        except Exception as e:
            session.rollback()
            logger.error(f"Error creating chatbot: {e}")
            raise
        finally:
            session.close()

    async def get(self, chatbot_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a chatbot by ID.

        Args:
            chatbot_id: Chatbot identifier

        Returns:
            Chatbot data or None
        """
        session = self._get_session()
        try:
            stmt = select(Chatbot).where(Chatbot.id == chatbot_id)
            result = session.execute(stmt).scalar_one_or_none()

            if not result:
                return None

            return {
                "id": result.id,
                "name": result.name,
                "description": result.description,
                "system_prompt": result.system_prompt,
                "web_search_threshold": result.web_search_threshold,
                "status": result.status,
                "embedding_model": result.embedding_model,
                "chunk_size": result.chunk_size,
                "chunk_overlap": result.chunk_overlap,
                "settings": result.settings or {},
                "created_at": (
                    result.created_at.isoformat() if result.created_at else None
                ),
                "updated_at": (
                    result.updated_at.isoformat() if result.updated_at else None
                ),
            }

        finally:
            session.close()

    def _get_chatbot_stats(
        self, chatbot_ids: List[str], session
    ) -> Dict[str, Dict[str, Any]]:
        """
        Compute conversation/message/document aggregate stats for a set of chatbots
        in two grouped queries (no N+1).

        Args:
            chatbot_ids: Chatbot ids to compute stats for
            session: An already-open SQLAlchemy session

        Returns:
            Dict keyed by chatbot_id, each value containing conversation_count,
            message_count, last_active_at (ISO string or None), document_count,
            messages_this_week, messages_prior_week.
        """
        if not chatbot_ids:
            return {}

        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)
        two_weeks_ago = now - timedelta(days=14)

        stats: Dict[str, Dict[str, Any]] = {
            cid: {
                "conversation_count": 0,
                "message_count": 0,
                "last_active_at": None,
                "document_count": 0,
                "messages_this_week": 0,
                "messages_prior_week": 0,
            }
            for cid in chatbot_ids
        }

        message_stmt = (
            select(
                ConversationMessage.chatbot_id,
                func.count(func.distinct(ConversationMessage.session_id)).label(
                    "conversation_count"
                ),
                func.count(ConversationMessage.message_id).label("message_count"),
                func.max(ConversationMessage.timestamp).label("last_active_at"),
                func.sum(
                    case((ConversationMessage.timestamp >= week_ago, 1), else_=0)
                ).label("messages_this_week"),
                func.sum(
                    case(
                        (
                            (ConversationMessage.timestamp >= two_weeks_ago)
                            & (ConversationMessage.timestamp < week_ago),
                            1,
                        ),
                        else_=0,
                    )
                ).label("messages_prior_week"),
            )
            .where(ConversationMessage.chatbot_id.in_(chatbot_ids))
            .group_by(ConversationMessage.chatbot_id)
        )

        for row in session.execute(message_stmt):
            if row.chatbot_id in stats:
                stats[row.chatbot_id].update(
                    {
                        "conversation_count": row.conversation_count or 0,
                        "message_count": row.message_count or 0,
                        "last_active_at": (
                            row.last_active_at.isoformat()
                            if row.last_active_at
                            else None
                        ),
                        "messages_this_week": int(row.messages_this_week or 0),
                        "messages_prior_week": int(row.messages_prior_week or 0),
                    }
                )

        document_stmt = (
            select(
                ChatbotDocument.chatbot_id,
                func.count(ChatbotDocument.id).label("document_count"),
            )
            .where(ChatbotDocument.chatbot_id.in_(chatbot_ids))
            .group_by(ChatbotDocument.chatbot_id)
        )

        for row in session.execute(document_stmt):
            if row.chatbot_id in stats:
                stats[row.chatbot_id]["document_count"] = row.document_count or 0

        return stats

    async def list(
        self,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        List all chatbots.

        Args:
            status: Filter by status
            limit: Max results
            offset: Offset for pagination

        Returns:
            List of chatbots
        """
        session = self._get_session()
        try:
            stmt = select(Chatbot).order_by(Chatbot.created_at.desc())

            if status:
                stmt = stmt.where(Chatbot.status == status)

            stmt = stmt.limit(limit).offset(offset)

            results = session.execute(stmt).scalars().all()

            chatbots = []
            for r in results:
                chatbots.append(
                    {
                        "id": r.id,
                        "name": r.name,
                        "description": r.description,
                        "system_prompt": r.system_prompt,
                        "web_search_threshold": r.web_search_threshold,
                        "status": r.status,
                        "embedding_model": r.embedding_model,
                        "chunk_size": r.chunk_size,
                        "chunk_overlap": r.chunk_overlap,
                        "settings": r.settings or {},
                        "created_at": (
                            r.created_at.isoformat() if r.created_at else None
                        ),
                    }
                )

            stats_by_id = self._get_chatbot_stats([c["id"] for c in chatbots], session)
            for c in chatbots:
                c.update(stats_by_id.get(c["id"], {}))

            return chatbots

        finally:
            session.close()

    async def update(
        self,
        chatbot_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        system_prompt: Optional[str] = None,
        web_search_threshold: Optional[float] = None,
        status: Optional[str] = None,
        settings: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Update a chatbot.

        Args:
            chatbot_id: Chatbot identifier
            name: New name
            description: New description
            system_prompt: New system prompt
            status: New status
            settings: Settings dict to merge into existing settings

        Returns:
            Updated chatbot data or None
        """
        session = self._get_session()
        try:
            stmt = select(Chatbot).where(Chatbot.id == chatbot_id)
            chatbot = session.execute(stmt).scalar_one_or_none()

            if not chatbot:
                return None

            if name is not None:
                chatbot.name = name
            if description is not None:
                chatbot.description = description
            if system_prompt is not None:
                chatbot.system_prompt = system_prompt
            if web_search_threshold is not None:
                chatbot.web_search_threshold = web_search_threshold
            if status is not None:
                chatbot.status = status
            if settings is not None:
                existing_settings = chatbot.settings or {}
                existing_settings.update(settings)
                chatbot.settings = existing_settings

            session.commit()

            logger.info(f"Updated chatbot: {chatbot_id}")

            return await self.get(chatbot_id)

        except Exception as e:
            session.rollback()
            logger.error(f"Error updating chatbot: {e}")
            raise
        finally:
            session.close()

    async def delete(self, chatbot_id: str) -> bool:
        """
        Delete a chatbot and all associated data.

        Args:
            chatbot_id: Chatbot identifier

        Returns:
            True if deleted
        """
        session = self._get_session()
        try:
            # Delete associated documents
            session.execute(
                delete(ChatbotDocument).where(ChatbotDocument.chatbot_id == chatbot_id)
            )

            # Delete metadata
            session.execute(
                delete(ChatbotMetadata).where(ChatbotMetadata.chatbot_id == chatbot_id)
            )

            # Delete chatbot
            result = session.execute(delete(Chatbot).where(Chatbot.id == chatbot_id))

            session.commit()

            deleted = result.rowcount > 0

            if deleted:
                logger.info(f"Deleted chatbot: {chatbot_id}")

            return deleted

        except Exception as e:
            session.rollback()
            logger.error(f"Error deleting chatbot: {e}")
            raise
        finally:
            session.close()

    async def duplicate(self, chatbot_id: str) -> Optional[Dict[str, Any]]:
        """
        Create a new chatbot copying another's configuration. Does not copy
        documents/knowledge base — the duplicate starts as an empty draft bot.

        Args:
            chatbot_id: Chatbot identifier to duplicate

        Returns:
            Newly created chatbot data, or None if the source doesn't exist
        """
        source = await self.get(chatbot_id)
        if not source:
            return None

        return await self.create(
            name=f"{source['name']} (Copy)",
            description=source["description"],
            system_prompt=source["system_prompt"],
            web_search_threshold=source["web_search_threshold"],
            embedding_model=source["embedding_model"],
            chunk_size=source["chunk_size"],
            chunk_overlap=source["chunk_overlap"],
            settings=source["settings"],
        )

    async def get_status(self, chatbot_id: str) -> Optional[Dict[str, Any]]:
        """
        Get chatbot training status and metadata.

        Args:
            chatbot_id: Chatbot identifier

        Returns:
            Status information or None
        """
        session = self._get_session()
        try:
            # Get chatbot
            stmt = select(Chatbot).where(Chatbot.id == chatbot_id)
            chatbot = session.execute(stmt).scalar_one_or_none()

            if not chatbot:
                return None

            # Get metadata
            stmt_meta = select(ChatbotMetadata).where(
                ChatbotMetadata.chatbot_id == chatbot_id
            )
            metadata = session.execute(stmt_meta).scalar_one_or_none()

            return {
                "chatbot_id": chatbot_id,
                "name": chatbot.name,
                "status": chatbot.status,
                "total_chunks": metadata.total_chunks if metadata else 0,
                "total_documents": metadata.total_documents if metadata else 0,
                "training_progress": metadata.training_progress if metadata else 0,
                "last_trained_at": (
                    metadata.last_trained_at.isoformat()
                    if metadata and metadata.last_trained_at
                    else None
                ),
                "training_error": metadata.training_error if metadata else None,
            }

        finally:
            session.close()

    async def update_status(
        self,
        chatbot_id: str,
        status: str,
        training_progress: Optional[int] = None,
        training_error: Optional[str] = None,
    ) -> None:
        """
        Update chatbot training status.

        Args:
            chatbot_id: Chatbot identifier
            status: New status
            training_progress: Training progress (0-100)
            training_error: Error message if any
        """
        session = self._get_session()
        try:
            # Update chatbot status
            session.execute(
                update(Chatbot).where(Chatbot.id == chatbot_id).values(status=status)
            )

            # Update metadata
            update_data = {}
            if training_progress is not None:
                update_data["training_progress"] = training_progress
            if training_error is not None:
                update_data["training_error"] = training_error
            if status == "active":
                from datetime import datetime

                update_data["last_trained_at"] = datetime.utcnow()

            if update_data:
                session.execute(
                    update(ChatbotMetadata)
                    .where(ChatbotMetadata.chatbot_id == chatbot_id)
                    .values(**update_data)
                )

            session.commit()

            logger.info(f"Updated chatbot {chatbot_id} status to {status}")

        except Exception as e:
            session.rollback()
            logger.error(f"Error updating chatbot status: {e}")
            raise
        finally:
            session.close()


# Global instance
_chatbot_service: Optional[ChatbotService] = None


def get_chatbot_service() -> ChatbotService:
    """Get or create the global chatbot service instance."""
    global _chatbot_service
    if _chatbot_service is None:
        _chatbot_service = ChatbotService()
    return _chatbot_service
