"""
Chatbot service for CRUD operations and training management.
"""
import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy import create_engine, select, update, delete
from sqlalchemy.orm import sessionmaker
from config import settings
from config.logging_config import get_logger
from services.models import Chatbot, ChatbotDocument, ChatbotMetadata

logger = get_logger(__name__)


class ChatbotService:
    """Service for managing chatbots."""

    def __init__(self):
        """Initialize the chatbot service."""
        self.engine = None
        self.Session = None

    def _get_session(self):
        """Get a database session."""
        if self.engine is None:
            self.engine = create_engine(settings.postgres_url, echo=False)
            self.Session = sessionmaker(bind=self.engine)
        return self.Session()

    async def create(
        self,
        name: str,
        description: Optional[str] = None,
        system_prompt: Optional[str] = None,
        embedding_model: str = "bge-large-en-v1.5",
        chunk_size: int = 1024,
        chunk_overlap: int = 50,
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

        Returns:
            Created chatbot data
        """
        chatbot_id = str(uuid.uuid4())

        session = self._get_session()
        try:
            chatbot = Chatbot(
                id=chatbot_id,
                name=name,
                description=description,
                system_prompt=system_prompt or "You are a helpful assistant. Answer based only on the provided context from the knowledge base.",
                embedding_model=embedding_model,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                status="draft",
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
                "status": "draft",
                "embedding_model": embedding_model,
                "chunk_size": chunk_size,
                "chunk_overlap": chunk_overlap,
                "created_at": chatbot.created_at.isoformat(),
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
                "status": result.status,
                "embedding_model": result.embedding_model,
                "chunk_size": result.chunk_size,
                "chunk_overlap": result.chunk_overlap,
                "created_at": result.created_at.isoformat() if result.created_at else None,
                "updated_at": result.updated_at.isoformat() if result.updated_at else None,
            }

        finally:
            session.close()

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
                chatbots.append({
                    "id": r.id,
                    "name": r.name,
                    "description": r.description,
                    "status": r.status,
                    "embedding_model": r.embedding_model,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                })

            return chatbots

        finally:
            session.close()

    async def update(
        self,
        chatbot_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        system_prompt: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Update a chatbot.

        Args:
            chatbot_id: Chatbot identifier
            name: New name
            description: New description
            system_prompt: New system prompt
            status: New status

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
            if status is not None:
                chatbot.status = status

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
            result = session.execute(
                delete(Chatbot).where(Chatbot.id == chatbot_id)
            )

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
            stmt_meta = select(ChatbotMetadata).where(ChatbotMetadata.chatbot_id == chatbot_id)
            metadata = session.execute(stmt_meta).scalar_one_or_none()

            return {
                "chatbot_id": chatbot_id,
                "name": chatbot.name,
                "status": chatbot.status,
                "total_chunks": metadata.total_chunks if metadata else 0,
                "total_documents": metadata.total_documents if metadata else 0,
                "training_progress": metadata.training_progress if metadata else 0,
                "last_trained_at": metadata.last_trained_at.isoformat() if metadata and metadata.last_trained_at else None,
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
                update(Chatbot)
                .where(Chatbot.id == chatbot_id)
                .values(status=status)
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
