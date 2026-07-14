"""Tests for ChatbotService aggregate stats and duplication."""
import uuid
from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from services.chatbot_service import ChatbotService
from services.models import Base, Chatbot, ChatbotDocument, ConversationMessage


class FakePostgresService:
    """Stands in for PostgreSQLService so tests don't need a live database."""

    def __init__(self, session_factory):
        self.session_factory = session_factory


@pytest.fixture
def service():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    svc = ChatbotService.__new__(ChatbotService)
    svc._postgres = FakePostgresService(session_factory)
    return svc


def _add_chatbot(session, name="Bot", status="active"):
    chatbot = Chatbot(id=str(uuid.uuid4()), name=name, status=status, settings={})
    session.add(chatbot)
    session.commit()
    return chatbot.id


def _add_message(session, chatbot_id, conv_session_id, timestamp):
    session.add(
        ConversationMessage(
            message_id=str(uuid.uuid4()),
            session_id=conv_session_id,
            chatbot_id=chatbot_id,
            role="user",
            content="hi",
            timestamp=timestamp,
        )
    )


def test_get_chatbot_stats_counts_conversations_messages_and_documents(service):
    session = service._get_session()
    try:
        chatbot_id = _add_chatbot(session)
        other_id = _add_chatbot(session, name="Other")

        now = datetime.utcnow()
        _add_message(session, chatbot_id, "session-a", now - timedelta(days=1))
        _add_message(session, chatbot_id, "session-a", now - timedelta(hours=1))
        _add_message(session, chatbot_id, "session-b", now - timedelta(days=10))
        session.add(
            ChatbotDocument(
                id=str(uuid.uuid4()), chatbot_id=chatbot_id, filename="a.pdf", status="completed"
            )
        )
        session.commit()

        stats = service._get_chatbot_stats([chatbot_id, other_id], session)

        assert stats[chatbot_id]["conversation_count"] == 2
        assert stats[chatbot_id]["message_count"] == 3
        assert stats[chatbot_id]["document_count"] == 1
        assert stats[chatbot_id]["last_active_at"] is not None
        assert stats[chatbot_id]["messages_this_week"] == 2
        assert stats[chatbot_id]["messages_prior_week"] == 1

        assert stats[other_id] == {
            "conversation_count": 0,
            "message_count": 0,
            "last_active_at": None,
            "document_count": 0,
            "messages_this_week": 0,
            "messages_prior_week": 0,
        }
    finally:
        session.close()


def test_get_chatbot_stats_empty_list_returns_empty_dict(service):
    session = service._get_session()
    try:
        assert service._get_chatbot_stats([], session) == {}
    finally:
        session.close()


@pytest.mark.asyncio
async def test_list_includes_stats_fields(service):
    session = service._get_session()
    try:
        chatbot_id = _add_chatbot(session)
        _add_message(session, chatbot_id, "session-a", datetime.utcnow())
        session.commit()
    finally:
        session.close()

    chatbots = await service.list()

    assert len(chatbots) == 1
    assert chatbots[0]["conversation_count"] == 1
    assert chatbots[0]["message_count"] == 1
    assert chatbots[0]["document_count"] == 0
    assert chatbots[0]["messages_this_week"] == 1
    assert chatbots[0]["messages_prior_week"] == 0


@pytest.mark.asyncio
async def test_create_stores_icon_in_settings(service):
    chatbot = await service.create(name="Support Bot", icon="support")

    assert chatbot["settings"]["icon"] == "support"


@pytest.mark.asyncio
async def test_create_without_icon_has_no_icon_key(service):
    chatbot = await service.create(name="Plain Bot")

    assert "icon" not in chatbot["settings"]
