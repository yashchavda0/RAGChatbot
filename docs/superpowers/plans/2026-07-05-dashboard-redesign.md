# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the chatbot list dashboard (`frontend/src/app/(auth)/dashboard/page.tsx`) to fix hardcoded-zero stats, sparse 2-column cards, and a generic stats bar — per the approved spec at `docs/superpowers/specs/2026-07-05-dashboard-redesign-design.md`.

**Architecture:** Backend gains one grouped-aggregate query in `ChatbotService` (conversation/message/document counts, weekly trend) surfaced through `GET /chatbots`, plus `duplicate`/`deactivate` endpoints. Frontend consolidates on a single `ChatbotListItem` type, adds a hash-colored icon avatar, a shared trend-badge component, and a per-card quick-actions menu, and widens the grid to 3 columns.

**Tech Stack:** FastAPI + SQLAlchemy 2.0 (backend), Next.js 14 + React + Tailwind + lucide-react (frontend), pytest + pytest-asyncio (new backend test infra — none exists yet).

## Global Constraints

- `pydantic>=2.7.0,<3.0.0` — don't add pydantic v1-only syntax.
- No DB migration — `chatbots.settings` (JSON column) already supports arbitrary keys via `ChatbotService.update`'s merge-on-update; icon storage uses this, no new column.
- No Milvus/knowledge-base copy on duplicate — duplicated chatbots start as empty `draft` bots.
- Keep existing visual language (light glassmorphism `GlassCard`, `#5B5EFF`→`#8B7FFF` indigo gradient, Apple-gray palette `#1D1D1F`/`#86868B`/`#E5E5EA`) — no re-theme.
- `lucide-react` is already a frontend dependency (`^0.344.0`) and already used elsewhere in the app — use it for the icon set instead of hand-written SVGs.

---

## Task 1: Backend — aggregate chatbot stats query

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_chatbot_service.py`
- Modify: `backend/services/chatbot_service.py`

**Interfaces:**
- Produces: `ChatbotService._get_chatbot_stats(chatbot_ids: List[str], session) -> Dict[str, Dict[str, Any]]` — keyed by chatbot id, each value has `conversation_count`, `message_count`, `last_active_at` (ISO string or `None`), `document_count`, `messages_this_week`, `messages_prior_week` (all ints default 0).
- Produces: `ChatbotService.list(...)` — each dict in the returned list now also carries those same six keys.

- [ ] **Step 1: Add test dependencies**

Append to `backend/requirements.txt`:

```
# Testing
pytest>=7.4.0
pytest-asyncio>=0.23.0
```

- [ ] **Step 2: Create test package**

Create `backend/tests/__init__.py` (empty file).

- [ ] **Step 3: Write the failing tests**

Create `backend/tests/test_chatbot_service.py`:

```python
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
```

- [ ] **Step 4: Run tests to verify they fail**

Run (from `backend/`): `pip install -r requirements.txt && pytest tests/test_chatbot_service.py -v`
Expected: FAIL — `AttributeError: 'ChatbotService' object has no attribute '_get_chatbot_stats'`

- [ ] **Step 5: Implement `_get_chatbot_stats` and wire it into `list()`**

In `backend/services/chatbot_service.py`, update the imports at the top:

```python
"""
Chatbot service for CRUD operations and training management.
"""
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import select, update, delete, func, case
from config.logging_config import get_logger
from services.postgres_service import get_postgres_service
from services.models import Chatbot, ChatbotDocument, ChatbotMetadata, ConversationMessage
```

Add this new method to `ChatbotService` (place it right before `async def list`):

```python
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
                            row.last_active_at.isoformat() if row.last_active_at else None
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
```

Update `list()` to merge these stats in before closing the session:

```python
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
                    "system_prompt": r.system_prompt,
                    "web_search_threshold": r.web_search_threshold,
                    "status": r.status,
                    "embedding_model": r.embedding_model,
                    "chunk_size": r.chunk_size,
                    "chunk_overlap": r.chunk_overlap,
                    "settings": r.settings or {},
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                })

            stats_by_id = self._get_chatbot_stats([c["id"] for c in chatbots], session)
            for c in chatbots:
                c.update(stats_by_id.get(c["id"], {}))

            return chatbots

        finally:
            session.close()
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pytest tests/test_chatbot_service.py -v`
Expected: `3 passed`

- [ ] **Step 7: Commit**

```bash
git add backend/requirements.txt backend/tests/__init__.py backend/tests/test_chatbot_service.py backend/services/chatbot_service.py
git commit -m "feat(backend): add per-chatbot conversation/message/document stats"
```

---

## Task 2: Backend — expose stats fields + icon on `ChatbotResponse`/`ChatbotCreate`

**Files:**
- Modify: `backend/api/routes/chatbots.py`
- Modify: `backend/services/chatbot_service.py`
- Modify: `backend/tests/test_chatbot_service.py`

**Interfaces:**
- Consumes: `ChatbotService._get_chatbot_stats` (Task 1), `ChatbotService.list()` dicts now carrying the six stats keys.
- Produces: `ChatbotResponse` schema fields `conversation_count: int`, `message_count: int`, `last_active_at: Optional[str]`, `document_count: int`, `messages_this_week: int`, `messages_prior_week: int` (all defaulted to 0/None). `ChatbotService.create(..., settings: Optional[Dict[str, Any]] = None, icon: Optional[str] = None)`. `ChatbotCreate.icon: Optional[str]`.

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_chatbot_service.py`:

```python
@pytest.mark.asyncio
async def test_create_stores_icon_in_settings(service):
    chatbot = await service.create(name="Support Bot", icon="support")

    assert chatbot["settings"]["icon"] == "support"


@pytest.mark.asyncio
async def test_create_without_icon_has_no_icon_key(service):
    chatbot = await service.create(name="Plain Bot")

    assert "icon" not in chatbot["settings"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_chatbot_service.py -v -k icon`
Expected: FAIL — `TypeError: create() got an unexpected keyword argument 'icon'`

- [ ] **Step 3: Update `ChatbotService.create()` to accept `settings` and `icon`**

In `backend/services/chatbot_service.py`, replace the `create` method:

```python
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
            settings: Initial settings dict (e.g. carried over from a duplicated chatbot)
            icon: Icon key to store in settings (see frontend CHATBOT_ICONS)

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
                system_prompt=system_prompt or "You are a helpful assistant. Answer based only on the provided context from the knowledge base.",
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_chatbot_service.py -v -k icon`
Expected: `2 passed`

- [ ] **Step 5: Add fields to `ChatbotResponse` and `icon` to `ChatbotCreate`**

In `backend/api/routes/chatbots.py`, update `ChatbotCreate`:

```python
class ChatbotCreate(BaseModel):
    """Request to create a new chatbot."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    system_prompt: Optional[str] = Field(
        default="You are a helpful assistant. Answer based only on the provided context from the knowledge base. If the context doesn't contain relevant information, say so."
    )
    icon: Optional[str] = None
```

Update `ChatbotResponse`:

```python
class ChatbotResponse(BaseModel):
    """Chatbot response."""

    id: str
    name: str
    description: Optional[str] = None
    system_prompt: str = "You are a helpful assistant."
    status: str = "draft"
    embedding_model: str = "gemini-embedding-001"
    chunk_size: int = 1024
    chunk_overlap: int = 50
    web_search_threshold: Optional[float] = 0.6
    settings: Optional[dict] = None
    created_at: Optional[str] = None
    conversation_count: int = 0
    message_count: int = 0
    last_active_at: Optional[str] = None
    document_count: int = 0
    messages_this_week: int = 0
    messages_prior_week: int = 0
```

Update `create_chatbot` to pass `icon` through:

```python
@router.post("", response_model=ChatbotResponse)
async def create_chatbot(request: ChatbotCreate):
    """Create a new chatbot."""
    try:
        service = get_chatbot_service()
        chatbot = await service.create(
            name=request.name,
            description=request.description,
            system_prompt=request.system_prompt,
            icon=request.icon,
        )
        return ChatbotResponse(**chatbot)
    except Exception as e:
        logger.error(f"Error creating chatbot: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 6: Run full backend test suite**

Run: `pytest tests/test_chatbot_service.py -v`
Expected: `5 passed`

- [ ] **Step 7: Commit**

```bash
git add backend/api/routes/chatbots.py backend/services/chatbot_service.py backend/tests/test_chatbot_service.py
git commit -m "feat(backend): expose chatbot stats fields and icon on API schemas"
```

---

## Task 3: Backend — `POST /chatbots/{chatbot_id}/deactivate`

**Files:**
- Modify: `backend/api/routes/chatbots.py`
- Modify: `backend/tests/test_chatbot_service.py`

**Interfaces:**
- Consumes: `ChatbotService.update(chatbot_id, status=...)` (already exists, unchanged signature).
- Produces: `POST /chatbots/{chatbot_id}/deactivate` route returning `ChatbotResponse`.

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_chatbot_service.py`:

```python
@pytest.mark.asyncio
async def test_update_status_to_inactive(service):
    chatbot = await service.create(name="Bot")

    updated = await service.update(chatbot["id"], status="inactive")

    assert updated["status"] == "inactive"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_chatbot_service.py -v -k inactive`
Expected: This actually already passes — `ChatbotService.update` already supports `status`. This step confirms that baseline before we add the route on top of it.
Expected: `1 passed`

- [ ] **Step 3: Add the route**

In `backend/api/routes/chatbots.py`, add this route directly after `activate_chatbot` (after its closing, before `@router.get("/{chatbot_id}/status"...)`):

```python
@router.post("/{chatbot_id}/deactivate")
async def deactivate_chatbot(chatbot_id: str):
    """Deactivate a chatbot so it stops accepting chat messages."""
    try:
        service = get_chatbot_service()
        chatbot = await service.get(chatbot_id)
        if not chatbot:
            raise HTTPException(status_code=404, detail="Chatbot not found")

        if chatbot["status"] == "inactive":
            return {"message": "Chatbot is already inactive", "chatbot_id": chatbot_id}

        updated = await service.update(chatbot_id, status="inactive")
        return ChatbotResponse(**updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating chatbot: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 4: Manually verify the route**

Run backend (`uvicorn main:app --reload --host 0.0.0.0 --port 8000` from `backend/`, infra services up via `docker-compose -f docker-compose.dev.yml up -d postgres milvus-standalone etcd minio redis`), then:

```bash
curl -X POST http://localhost:8000/chatbots/<an-existing-chatbot-id>/deactivate
```

Expected: JSON response with `"status": "inactive"`.

- [ ] **Step 5: Commit**

```bash
git add backend/api/routes/chatbots.py backend/tests/test_chatbot_service.py
git commit -m "feat(backend): add chatbot deactivate endpoint"
```

---

## Task 4: Backend — duplicate chatbot (config only, no documents)

**Files:**
- Modify: `backend/services/chatbot_service.py`
- Modify: `backend/api/routes/chatbots.py`
- Modify: `backend/tests/test_chatbot_service.py`

**Interfaces:**
- Consumes: `ChatbotService.get`, `ChatbotService.create` (Task 2's `settings`/`icon` params).
- Produces: `ChatbotService.duplicate(chatbot_id: str) -> Optional[Dict[str, Any]]`. `POST /chatbots/{chatbot_id}/duplicate` route returning `ChatbotResponse`, 404 if source doesn't exist.

- [ ] **Step 1: Write the failing tests**

Add to `backend/tests/test_chatbot_service.py` (needs `ChatbotDocument` already imported):

```python
@pytest.mark.asyncio
async def test_duplicate_copies_config_without_documents(service):
    original = await service.create(
        name="Support Bot",
        description="Handles support",
        icon="support",
    )
    session = service._get_session()
    try:
        session.add(
            ChatbotDocument(
                id=str(uuid.uuid4()),
                chatbot_id=original["id"],
                filename="a.pdf",
                status="completed",
            )
        )
        session.commit()
    finally:
        session.close()

    duplicated = await service.duplicate(original["id"])

    assert duplicated is not None
    assert duplicated["id"] != original["id"]
    assert duplicated["name"] == "Support Bot (Copy)"
    assert duplicated["description"] == "Handles support"
    assert duplicated["settings"]["icon"] == "support"
    assert duplicated["status"] == "draft"

    session = service._get_session()
    try:
        docs = session.query(ChatbotDocument).filter_by(chatbot_id=duplicated["id"]).all()
        assert docs == []
    finally:
        session.close()


@pytest.mark.asyncio
async def test_duplicate_returns_none_for_missing_chatbot(service):
    result = await service.duplicate("does-not-exist")

    assert result is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_chatbot_service.py -v -k duplicate`
Expected: FAIL — `AttributeError: 'ChatbotService' object has no attribute 'duplicate'`

- [ ] **Step 3: Implement `ChatbotService.duplicate`**

Add to `backend/services/chatbot_service.py`, right after `async def delete`:

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_chatbot_service.py -v -k duplicate`
Expected: `2 passed`

- [ ] **Step 5: Add the route**

In `backend/api/routes/chatbots.py`, add directly after `deactivate_chatbot`:

```python
@router.post("/{chatbot_id}/duplicate", response_model=ChatbotResponse)
async def duplicate_chatbot(chatbot_id: str):
    """Duplicate a chatbot's configuration into a new draft chatbot (no documents copied)."""
    try:
        service = get_chatbot_service()
        duplicated = await service.duplicate(chatbot_id)
        if not duplicated:
            raise HTTPException(status_code=404, detail="Chatbot not found")
        return ChatbotResponse(**duplicated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error duplicating chatbot: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 6: Run full backend test suite**

Run: `pytest tests/test_chatbot_service.py -v`
Expected: `9 passed`

- [ ] **Step 7: Commit**

```bash
git add backend/services/chatbot_service.py backend/api/routes/chatbots.py backend/tests/test_chatbot_service.py
git commit -m "feat(backend): add chatbot duplicate endpoint"
```

---

## Task 5: Frontend — trend util + `TrendBadge` component

**Files:**
- Create: `frontend/src/lib/utils/trend.ts`
- Create: `frontend/src/components/shared/TrendBadge.tsx`

**Interfaces:**
- Produces: `ChatbotTrend` type (`{ direction: 'up' | 'down' | 'new' | 'none'; percent?: number }`), `computeTrend(thisWeek: number, priorWeek: number): ChatbotTrend`, `<TrendBadge trend={ChatbotTrend} className?: string />` (renders `null` when `direction === 'none'`).

- [ ] **Step 1: Create the trend util**

Create `frontend/src/lib/utils/trend.ts`:

```ts
export interface ChatbotTrend {
  direction: 'up' | 'down' | 'new' | 'none';
  percent?: number;
}

export function computeTrend(thisWeek: number, priorWeek: number): ChatbotTrend {
  if (priorWeek === 0) {
    return thisWeek > 0 ? { direction: 'new' } : { direction: 'none' };
  }
  const percent = Math.round(((thisWeek - priorWeek) / priorWeek) * 100);
  if (percent === 0) return { direction: 'none' };
  return { direction: percent > 0 ? 'up' : 'down', percent: Math.abs(percent) };
}
```

- [ ] **Step 2: Create the badge component**

Create `frontend/src/components/shared/TrendBadge.tsx`:

```tsx
'use client';

import { cn } from '@/lib/utils';
import type { ChatbotTrend } from '@/lib/utils/trend';

interface TrendBadgeProps {
  trend: ChatbotTrend;
  className?: string;
}

const TREND_CONFIG: Record<Exclude<ChatbotTrend['direction'], 'none'>, { color: string; bg: string }> = {
  up: { color: '#34C759', bg: 'rgba(52,199,89,0.15)' },
  down: { color: '#FF3B30', bg: 'rgba(255,59,48,0.12)' },
  new: { color: '#5B5EFF', bg: 'rgba(91,94,255,0.12)' },
};

export function TrendBadge({ trend, className }: TrendBadgeProps) {
  if (trend.direction === 'none') return null;

  const { color, bg } = TREND_CONFIG[trend.direction];
  const label =
    trend.direction === 'new'
      ? 'New'
      : `${trend.direction === 'up' ? '▲' : '▼'} ${trend.percent}%`;

  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold', className)}
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: No new errors referencing `trend.ts` or `TrendBadge.tsx`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/utils/trend.ts frontend/src/components/shared/TrendBadge.tsx
git commit -m "feat(frontend): add trend computation util and badge component"
```

---

## Task 6: Frontend — `api.ts` types and methods

**Files:**
- Modify: `frontend/src/lib/api.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ChatbotResponse` gains `conversation_count: number`, `message_count: number`, `last_active_at: string | null`, `document_count: number`, `messages_this_week: number`, `messages_prior_week: number`. `CreateChatbotRequest` gains `icon?: string`. `chatbotApi.deactivate(id: string): Promise<ChatbotResponse>`, `chatbotApi.duplicate(id: string): Promise<ChatbotResponse>`.

- [ ] **Step 1: Update `ChatbotResponse` and `CreateChatbotRequest`**

In `frontend/src/lib/api.ts`, replace the two interfaces:

```ts
export interface ChatbotResponse {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  status: string;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  settings: Record<string, any> | null;
  created_at: string | null;
  conversation_count: number;
  message_count: number;
  last_active_at: string | null;
  document_count: number;
  messages_this_week: number;
  messages_prior_week: number;
}

export interface ChatbotListResponse {
  chatbots: ChatbotResponse[];
  total: number;
}

export interface CreateChatbotRequest {
  name: string;
  description?: string;
  system_prompt?: string;
  icon?: string;
}
```

- [ ] **Step 2: Add `deactivate` and `duplicate` to `chatbotApi`**

In `frontend/src/lib/api.ts`, add to `chatbotApi` (right after `activate`):

```ts
  deactivate: async (id: string): Promise<ChatbotResponse> => {
    const response = await fetch(`${API_URL}/chatbots/${id}/deactivate`, {
      method: "POST",
    });
    return handleResponse<ChatbotResponse>(response);
  },

  duplicate: async (id: string): Promise<ChatbotResponse> => {
    const response = await fetch(`${API_URL}/chatbots/${id}/duplicate`, {
      method: "POST",
    });
    return handleResponse<ChatbotResponse>(response);
  },
```

- [ ] **Step 3: Verify it compiles**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: Errors only in files this plan hasn't updated yet (`dashboard/page.tsx`, `ChatbotCard.tsx` — fixed in Task 9). No errors in `api.ts` itself.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat(frontend): add chatbot stats fields and duplicate/deactivate API methods"
```

---

## Task 7: Frontend — chatbot icon set + `ChatbotAvatar`

**Files:**
- Create: `frontend/src/lib/utils/chatbotIcons.ts`
- Create: `frontend/src/components/shared/ChatbotAvatar.tsx`

**Interfaces:**
- Produces: `CHATBOT_ICONS: Record<ChatbotIconKey, LucideIcon>`, `type ChatbotIconKey`, `getAvatarColor(id: string): string`. `<ChatbotAvatar id={string} icon={string | undefined} isLive={boolean} size?: 'sm' | 'md' />`.

- [ ] **Step 1: Create the icon set + color hash util**

Create `frontend/src/lib/utils/chatbotIcons.ts`:

```ts
import {
  MessageCircle,
  Headset,
  ShoppingCart,
  Briefcase,
  GraduationCap,
  HeartPulse,
  Code2,
  Globe,
  BookOpen,
  Megaphone,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export const CHATBOT_ICONS: Record<string, LucideIcon> = {
  chat: MessageCircle,
  support: Headset,
  sales: ShoppingCart,
  business: Briefcase,
  education: GraduationCap,
  health: HeartPulse,
  code: Code2,
  global: Globe,
  docs: BookOpen,
  marketing: Megaphone,
  creative: Sparkles,
};

export type ChatbotIconKey = keyof typeof CHATBOT_ICONS;

const AVATAR_COLORS = ['#5B5EFF', '#FF9500', '#34C759', '#FF3B30', '#AF52DE', '#00C7BE'];

export function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
```

- [ ] **Step 2: Create the avatar component**

Create `frontend/src/components/shared/ChatbotAvatar.tsx`:

```tsx
'use client';

import { cn } from '@/lib/utils';
import { CHATBOT_ICONS, getAvatarColor } from '@/lib/utils/chatbotIcons';

interface ChatbotAvatarProps {
  id: string;
  icon?: string;
  isLive?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ChatbotAvatar({ id, icon, isLive, size = 'md', className }: ChatbotAvatarProps) {
  const Icon = (icon && CHATBOT_ICONS[icon]) || CHATBOT_ICONS.chat;
  const color = getAvatarColor(id);
  const dimensionClass = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11';
  const iconSize = size === 'sm' ? 16 : 20;

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <div
        className={cn(dimensionClass, 'rounded-xl flex items-center justify-center')}
        style={{ backgroundColor: color }}
      >
        <Icon className="text-white" size={iconSize} strokeWidth={2} />
      </div>
      {isLive !== undefined && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
          style={{ backgroundColor: isLive ? '#34C759' : '#8E8E93' }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: No new errors referencing `chatbotIcons.ts` or `ChatbotAvatar.tsx`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/utils/chatbotIcons.ts frontend/src/components/shared/ChatbotAvatar.tsx
git commit -m "feat(frontend): add chatbot icon set and hash-colored avatar component"
```

---

## Task 8: Frontend — `ChatbotCardMenu` quick actions

**Files:**
- Create: `frontend/src/components/dashboard/ChatbotCardMenu.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `<ChatbotCardMenu isLive={boolean} onOpen={() => void} onDuplicate={() => void} onToggleActive={() => void} onDelete={() => void} />` — a `⋯` trigger that opens a dropdown with Open/Duplicate/Pause-or-Activate/Delete, closes on outside click, and stops click propagation so it doesn't trigger a parent `<Link>`.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/dashboard/ChatbotCardMenu.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreVertical, ExternalLink, Copy, Pause, Play, Trash2 } from 'lucide-react';

interface ChatbotCardMenuProps {
  isLive: boolean;
  onOpen: () => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

export function ChatbotCardMenu({
  isLive,
  onOpen,
  onDuplicate,
  onToggleActive,
  onDelete,
}: ChatbotCardMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const runAndClose = (action: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    action();
  };

  return (
    <div
      ref={ref}
      className="relative"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Chatbot actions"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-all"
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-10 w-44 rounded-xl border border-[#E5E5EA] bg-white shadow-lg py-1">
          <button
            type="button"
            onClick={runAndClose(onOpen)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7]"
          >
            <ExternalLink size={15} /> Open
          </button>
          <button
            type="button"
            onClick={runAndClose(onDuplicate)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7]"
          >
            <Copy size={15} /> Duplicate
          </button>
          <button
            type="button"
            onClick={runAndClose(onToggleActive)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7]"
          >
            {isLive ? <Pause size={15} /> : <Play size={15} />}
            {isLive ? 'Pause' : 'Activate'}
          </button>
          <button
            type="button"
            onClick={runAndClose(onDelete)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#FF3B30] hover:bg-[#FF3B30]/5"
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: No new errors referencing `ChatbotCardMenu.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/dashboard/ChatbotCardMenu.tsx
git commit -m "feat(frontend): add chatbot card quick-actions menu"
```

---

## Task 9: Frontend — wire it all into the dashboard

**Files:**
- Modify: `frontend/src/types/chatbot.ts`
- Modify: `frontend/src/app/(auth)/dashboard/page.tsx`
- Modify: `frontend/src/components/dashboard/ChatbotCard.tsx`

**Interfaces:**
- Consumes: `ChatbotTrend`/`computeTrend` (Task 5), `ChatbotAvatar` (Task 7), `ChatbotCardMenu` (Task 8), `chatbotApi.deactivate`/`duplicate` (Task 6).
- Produces: Single shared `ChatbotListItem` type (removes the dashboard page's local duplicate definition). `ChatbotCard` gains `onDuplicate?: (id: string) => void` and `onToggleActive?: (chatbot: ChatbotListItem) => void` props alongside the existing `onDelete?`.

- [ ] **Step 1: Update the shared `ChatbotListItem` type**

In `frontend/src/types/chatbot.ts`, add the import and replace `ChatbotListItem`:

```ts
import type { ChatbotTrend } from '@/lib/utils/trend';

// ... (keep everything above ChatbotListItem unchanged) ...

export interface ChatbotListItem {
  id: string;
  name: string;
  description: string;
  status: ChatbotStatus;
  conversationCount: number;
  messageCount: number;
  documentCount: number;
  messagesThisWeek: number;
  messagesPriorWeek: number;
  trend: ChatbotTrend;
  lastActiveAt?: string;
  createdAt: string;
  icon?: string;
}
```

- [ ] **Step 2: Rewrite the dashboard page**

Replace the full contents of `frontend/src/app/(auth)/dashboard/page.tsx`:

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/shared/GlassCard';
import { TrendBadge } from '@/components/shared/TrendBadge';
import { ChatbotCard } from '@/components/dashboard/ChatbotCard';
import { CreateChatbotModal } from '@/components/dashboard/CreateChatbotModal';
import { chatbotApi, ChatbotResponse } from '@/lib/api';
import { computeTrend } from '@/lib/utils/trend';
import { formatNumber } from '@/lib/utils/formatters';
import type { ChatbotListItem } from '@/types/chatbot';

function mapChatbotToListItem(chatbot: ChatbotResponse): ChatbotListItem {
  const statusMap: Record<string, ChatbotListItem['status']> = {
    active: 'live',
    training: 'draft',
    error: 'inactive',
    draft: 'draft',
  };
  return {
    id: chatbot.id,
    name: chatbot.name,
    description: chatbot.description || '',
    status: statusMap[chatbot.status] || 'draft',
    conversationCount: chatbot.conversation_count,
    messageCount: chatbot.message_count,
    documentCount: chatbot.document_count,
    messagesThisWeek: chatbot.messages_this_week,
    messagesPriorWeek: chatbot.messages_prior_week,
    trend: computeTrend(chatbot.messages_this_week, chatbot.messages_prior_week),
    lastActiveAt: chatbot.last_active_at || undefined,
    createdAt: chatbot.created_at || new Date().toISOString(),
    icon: (chatbot.settings?.icon as string) || undefined,
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [chatbots, setChatbots] = useState<ChatbotListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'draft' | 'inactive'>('all');

  const fetchChatbots = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await chatbotApi.list();
      setChatbots(response.chatbots.map(mapChatbotToListItem));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chatbots');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChatbots();
  }, [fetchChatbots]);

  const filteredChatbots = chatbots.filter((chatbot) => {
    const matchesSearch =
      chatbot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chatbot.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || chatbot.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateChatbot = async (data: { name: string; description: string; icon?: string }) => {
    setIsCreating(true);
    try {
      const newChatbot = await chatbotApi.create({
        name: data.name,
        description: data.description,
        icon: data.icon,
      });
      setChatbots([mapChatbotToListItem(newChatbot), ...chatbots]);
      setIsCreateModalOpen(false);
      router.push(`/chatbot/${newChatbot.id}/knowledge-base`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chatbot');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteChatbot = async (id: string) => {
    if (!window.confirm('Delete this chatbot? This removes its knowledge base and cannot be undone.')) {
      return;
    }
    try {
      await chatbotApi.delete(id);
      setChatbots((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete chatbot');
    }
  };

  const handleDuplicateChatbot = async (id: string) => {
    try {
      const duplicated = await chatbotApi.duplicate(id);
      setChatbots((prev) => [mapChatbotToListItem(duplicated), ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate chatbot');
    }
  };

  const handleToggleActive = async (chatbot: ChatbotListItem) => {
    try {
      const updated =
        chatbot.status === 'live'
          ? await chatbotApi.deactivate(chatbot.id)
          : await chatbotApi.activate(chatbot.id);
      setChatbots((prev) =>
        prev.map((c) => (c.id === chatbot.id ? mapChatbotToListItem(updated) : c))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update chatbot status');
    }
  };

  const totalMessagesThisWeek = chatbots.reduce((sum, c) => sum + c.messagesThisWeek, 0);
  const totalMessagesPriorWeek = chatbots.reduce((sum, c) => sum + c.messagesPriorWeek, 0);

  const stats = {
    total: chatbots.length,
    live: chatbots.filter((c) => c.status === 'live').length,
    totalConversations: chatbots.reduce((sum, c) => sum + c.conversationCount, 0),
    messagesThisWeek: totalMessagesThisWeek,
    messagesTrend: computeTrend(totalMessagesThisWeek, totalMessagesPriorWeek),
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1D1D1F]">Your Chatbots</h1>
            <p className="text-[#86868B] mt-1">
              Manage and monitor your AI assistants
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#5B5EFF] to-[#8B7FFF] hover:from-[#3D3DD9] hover:to-[#5B5EFF] transition-all shadow-lg shadow-[#5B5EFF]/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Chatbot
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <GlassCard padding="sm" className="text-center">
            <p className="text-2xl font-bold text-[#1D1D1F]">{stats.total}</p>
            <p className="text-sm text-[#86868B]">Total Chatbots</p>
          </GlassCard>
          <GlassCard padding="sm" className="text-center">
            <p className="text-2xl font-bold text-[#34C759]">{stats.live}</p>
            <p className="text-sm text-[#86868B]">Live Now</p>
          </GlassCard>
          <GlassCard padding="sm" className="text-center">
            <p className="text-2xl font-bold text-[#5B5EFF]">
              {formatNumber(stats.totalConversations)}
            </p>
            <p className="text-sm text-[#86868B]">Conversations</p>
          </GlassCard>
          <GlassCard padding="sm" className="text-center">
            <div className="flex items-center justify-center gap-2">
              <p className="text-2xl font-bold text-[#1D1D1F]">{formatNumber(stats.messagesThisWeek)}</p>
              <TrendBadge trend={stats.messagesTrend} />
            </div>
            <p className="text-sm text-[#86868B]">Messages this week</p>
          </GlassCard>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search chatbots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#E5E5EA] bg-white/50 text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#5B5EFF]/20 focus:border-[#5B5EFF] transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-white/50 border border-[#E5E5EA]">
            {(['all', 'live', 'draft', 'inactive'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-white text-[#1D1D1F] shadow-sm'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Chatbots Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <GlassCard key={i} className="animate-pulse">
                <div className="h-6 bg-[#E5E5EA] rounded w-1/2 mb-3" />
                <div className="h-4 bg-[#E5E5EA] rounded w-3/4 mb-4" />
                <div className="flex gap-2">
                  <div className="h-6 bg-[#E5E5EA] rounded w-16" />
                  <div className="h-6 bg-[#E5E5EA] rounded w-24" />
                </div>
              </GlassCard>
            ))}
          </div>
        ) : error ? (
          <GlassCard className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#FF3B30]/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#FF3B30]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">Failed to load chatbots</h3>
            <p className="text-[#86868B] mb-6">{error}</p>
            <button
              onClick={fetchChatbots}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#5B5EFF] to-[#8B7FFF] hover:from-[#3D3DD9] hover:to-[#5B5EFF] transition-all"
            >
              Try Again
            </button>
          </GlassCard>
        ) : filteredChatbots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredChatbots.map((chatbot) => (
              <ChatbotCard
                key={chatbot.id}
                chatbot={chatbot}
                onDelete={handleDeleteChatbot}
                onDuplicate={handleDuplicateChatbot}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        ) : (
          <GlassCard className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#5B5EFF]/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-[#5B5EFF]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">No chatbots found</h3>
            <p className="text-[#86868B] mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first chatbot to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#5B5EFF] to-[#8B7FFF] hover:from-[#3D3DD9] hover:to-[#5B5EFF] transition-all"
              >
                Create Your First Chatbot
              </button>
            )}
          </GlassCard>
        )}
      </div>

      {/* Create Modal */}
      <CreateChatbotModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateChatbot}
        isLoading={isCreating}
      />
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `ChatbotCard`**

Replace the full contents of `frontend/src/components/dashboard/ChatbotCard.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ChatbotAvatar } from '@/components/shared/ChatbotAvatar';
import { TrendBadge } from '@/components/shared/TrendBadge';
import { ChatbotCardMenu } from '@/components/dashboard/ChatbotCardMenu';
import { formatRelativeTime, formatNumber } from '@/lib/utils/formatters';
import type { ChatbotListItem } from '@/types/chatbot';

interface ChatbotCardProps {
  chatbot: ChatbotListItem;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onToggleActive?: (chatbot: ChatbotListItem) => void;
}

export function ChatbotCard({ chatbot, onDelete, onDuplicate, onToggleActive }: ChatbotCardProps) {
  const router = useRouter();
  const href = `/chatbot/${chatbot.id}/analytics`;
  const isLive = chatbot.status === 'live';

  return (
    <Link href={href}>
      <GlassCard hover className="group h-full relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <ChatbotAvatar id={chatbot.id} icon={chatbot.icon} isLive={isLive} />
            <div>
              <h3 className="font-semibold text-[#1D1D1F] group-hover:text-[#5B5EFF] transition-colors">
                {chatbot.name}
              </h3>
              <p className="text-sm text-[#86868B] line-clamp-1">{chatbot.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={chatbot.status} size="sm" />
            <ChatbotCardMenu
              isLive={isLive}
              onOpen={() => router.push(href)}
              onDuplicate={() => onDuplicate?.(chatbot.id)}
              onToggleActive={() => onToggleActive?.(chatbot)}
              onDelete={() => onDelete?.(chatbot.id)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-4 border-t border-[#E5E5EA]/50">
          <span className="text-sm text-[#86868B]">
            <span className="font-medium text-[#1D1D1F]">{formatNumber(chatbot.conversationCount)}</span>{' '}
            conversations &middot;{' '}
            {chatbot.lastActiveAt ? `active ${formatRelativeTime(chatbot.lastActiveAt)}` : 'never active'}
          </span>
          <TrendBadge trend={chatbot.trend} />
        </div>
      </GlassCard>
    </Link>
  );
}
```

- [ ] **Step 4: Verify it compiles**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: No errors.

Run: `npm run lint`
Expected: No new errors in the modified files.

- [ ] **Step 5: Manually verify in the browser**

With backend + frontend dev servers running (`npm run dev` in `frontend/`, backend per Task 3's step 4), open `http://localhost:3000/dashboard` and confirm:
- Cards render 3-up on a wide window.
- Each card shows a colored icon avatar with a status dot, real conversation count, real last-active text, and a trend badge (or no badge for bots with no prior-week activity).
- Stats bar shows Total Chatbots / Live Now / Conversations / Messages this week (with trend).
- Clicking a card's `⋯` menu opens Open/Duplicate/Pause-or-Activate/Delete without navigating the card; each action works (duplicate adds a new card, pause/activate flips status, delete asks to confirm then removes the card).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/chatbot.ts "frontend/src/app/(auth)/dashboard/page.tsx" frontend/src/components/dashboard/ChatbotCard.tsx
git commit -m "feat(frontend): redesign dashboard with 3-up grid, real stats, and quick actions"
```

---

## Task 10: Frontend — icon picker in `CreateChatbotModal`

**Files:**
- Create: `frontend/src/components/dashboard/IconPicker.tsx`
- Modify: `frontend/src/components/dashboard/CreateChatbotModal.tsx`

**Interfaces:**
- Consumes: `CHATBOT_ICONS`, `ChatbotIconKey` (Task 7).
- Produces: `<IconPicker value={ChatbotIconKey} onChange={(icon: ChatbotIconKey) => void} />`. `CreateChatbotModal`'s `onSubmit` now passes `{ name, description, icon }`.

- [ ] **Step 1: Create the icon picker**

Create `frontend/src/components/dashboard/IconPicker.tsx`:

```tsx
'use client';

import { cn } from '@/lib/utils';
import { CHATBOT_ICONS, type ChatbotIconKey } from '@/lib/utils/chatbotIcons';

interface IconPickerProps {
  value: ChatbotIconKey;
  onChange: (icon: ChatbotIconKey) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {(Object.keys(CHATBOT_ICONS) as ChatbotIconKey[]).map((key) => {
        const Icon = CHATBOT_ICONS[key];
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-label={key}
            aria-pressed={selected}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center border transition-all',
              selected
                ? 'border-[#5B5EFF] bg-[#5B5EFF]/10 text-[#5B5EFF]'
                : 'border-[#E5E5EA] text-[#86868B] hover:border-[#5B5EFF]/50'
            )}
          >
            <Icon size={18} strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `CreateChatbotModal`**

In `frontend/src/components/dashboard/CreateChatbotModal.tsx`, update imports and add icon state:

```tsx
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/shared/GlassCard';
import { IconPicker } from '@/components/dashboard/IconPicker';
import type { ChatbotIconKey } from '@/lib/utils/chatbotIcons';

interface CreateChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; icon?: string }) => void;
  isLoading?: boolean;
}

export function CreateChatbotModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: CreateChatbotModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<ChatbotIconKey>('chat');
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { name?: string; description?: string } = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!description.trim()) newErrors.description = 'Description is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({ name, description, icon });
    setName('');
    setDescription('');
    setIcon('chat');
    setErrors({});
  };

  if (!isOpen) return null;
```

Add the icon picker to the form body, right after the description field's closing `</div>` and before the Content div's closing `</div>`:

```tsx
              <div>
                <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                  Icon
                </label>
                <IconPicker value={icon} onChange={setIcon} />
              </div>
```

- [ ] **Step 3: Verify it compiles**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Manually verify in the browser**

Open the dashboard, click "Create Chatbot," confirm the icon grid renders and selecting an icon highlights it, submit the form, and confirm the new card shows the chosen icon (not the default chat-bubble fallback).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/IconPicker.tsx frontend/src/components/dashboard/CreateChatbotModal.tsx
git commit -m "feat(frontend): add icon picker to chatbot creation modal"
```

---

## Self-Review Notes

- **Spec coverage:** backend aggregates (Task 1-2), duplicate/deactivate endpoints (Task 3-4), icon storage via existing `settings` JSON (Task 2), 3-up grid + real stats bar + card footer (Task 9), avatar/status-dot (Task 7, 9), trend badge (Task 5, 9), quick-actions menu (Task 8-9), icon picker on create (Task 10) — all covered. Sparkline/table/hero-card directions were explicitly rejected in the spec and have no tasks, as intended.
- **Type consistency checked:** `ChatbotListItem` fields (`conversationCount`, `messageCount`, `documentCount`, `messagesThisWeek`, `messagesPriorWeek`, `trend`, `icon`) are defined once in Task 9 Step 1 and used identically in `mapChatbotToListItem`, `ChatbotCard`, and the stats bar — no drift between the old dashboard-local type and the shared one, since the local duplicate is removed.
- **No placeholders:** every step has complete, runnable code and exact commands.
