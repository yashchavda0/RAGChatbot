# Dashboard (Chatbot List) Redesign Specification

**Date:** 2026-07-05
**Status:** Approved

---

## Overview

Redesign of `frontend/src/app/(auth)/dashboard/page.tsx` — the page listing a user's chatbots. Current page feels bland/empty: 2-column grid with large cards, generic stats bar, and per-card stats that are literally hardcoded to zero (`conversationCount: 0` in `mapChatbotToListItem`). This redesign fixes both the visual density and the underlying data gap.

Keeps the existing visual language (light glassmorphism `GlassCard`, `#5B5EFF`→`#8B7FFF` indigo gradient, Apple-style gray palette) — this is a density/content redesign, not a re-theme.

---

## Problems Being Fixed

1. Too much whitespace — 2-column grid, large sparse cards.
2. Cards lack info/personality — identical icon on every card, no real activity signal.
3. Stats bar feels generic — Total/Live/Drafts/Conversations, and Conversations is always 0.
4. Overall layout reads as a generic SaaS template.

---

## Backend Changes

### Extend `GET /chatbots` (`backend/api/routes/chatbots.py`)

`ChatbotResponse` gains four new fields, populated via one grouped aggregate query (no N+1):

```python
conversation_count: int = 0   # distinct session_id in conversation_messages for this chatbot_id
message_count: int = 0        # total rows in conversation_messages for this chatbot_id
last_active_at: Optional[str] = None   # max(timestamp) in conversation_messages for this chatbot_id
document_count: int = 0       # count of rows in chatbot_documents for this chatbot_id
messages_this_week: int = 0   # message_count where timestamp >= now - 7d
messages_prior_week: int = 0  # message_count where timestamp in [now-14d, now-7d)
```

`list_chatbots()` in `ChatbotService` (or the route) runs one query grouped by `chatbot_id` over `conversation_messages` (for message/conversation/last-active/weekly counts) and one grouped query over `chatbot_documents` (for document counts), then merges results onto the chatbot list by id. Bots with no messages/documents default all counts to 0 and `last_active_at` to `None`.

Trend percentage shown on the frontend is derived client-side from `messages_this_week` / `messages_prior_week` (avoid division by zero: if prior week is 0 and this week > 0, show as new activity rather than a %; if both 0, show no badge).

### New endpoint: `POST /chatbots/{chatbot_id}/deactivate`

Mirrors the existing `activate` endpoint: sets `status="inactive"` via `service.update(chatbot_id, status="inactive")`. Used by the card's Pause action.

### New endpoint: `POST /chatbots/{chatbot_id}/duplicate`

Creates a new chatbot copying `name` (suffixed " (Copy)"), `description`, `system_prompt`, `embedding_model`, `chunk_size`, `chunk_overlap`, `web_search_threshold`, and `settings` (including `icon`/`icon_color` if set). Does **not** copy documents/knowledge base or Milvus vectors — the duplicate starts as an empty `draft` bot, same as creating fresh from a template. This avoids expensive vector-store duplication and matches "duplicate as starting point" semantics.

### Icon storage — no schema migration

`chatbots.settings` is already a free-form JSONB column with merge-on-update support (`ChatbotService.update`). Icon selection stores `{"icon": "<icon-key>"}` inside `settings`. `icon-key` is one of a fixed set (see Frontend Changes). No new column, no migration. Existing bots without an `icon` key fall back to a deterministic choice derived from hashing `id` (see below) — this also determines avatar background color for every bot regardless of whether an icon was explicitly chosen.

`CreateChatbotRequest` gains an optional `icon: Optional[str] = None` field, written into `settings` on creation.

---

## Frontend Changes

### Types (`frontend/src/lib/api.ts`)

`ChatbotResponse` gains: `conversation_count`, `message_count`, `last_active_at`, `document_count`, `messages_this_week`, `messages_prior_week`. `CreateChatbotRequest` gains optional `icon`.

### Dashboard page (`frontend/src/app/(auth)/dashboard/page.tsx`)

- `mapChatbotToListItem` reads real values instead of hardcoding `conversationCount: 0` and reusing `created_at` as `lastActiveAt`.
- Grid changes from `grid-cols-1 md:grid-cols-2` to `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` (3-up on wide screens, matches approved mockup, still reasonable on medium screens).
- Stats bar tiles become: **Total Chatbots**, **Live Now**, **Conversations** (sum across bots), **Messages this week** (sum, with a small trend arrow/% comparing to prior week, same trend math as card badges).

### `ChatbotCard` (`frontend/src/components/dashboard/ChatbotCard.tsx`)

- Avatar: 44×44 rounded-xl, background color derived from a hash of `chatbot.id` (small fixed palette of ~6 colors to stay consistent with the existing indigo/orange/green accent language), icon glyph from the fixed icon set (`chatbot.icon`, falling back to a generic chat-bubble glyph if unset).
- Small status dot (bottom-right of avatar, 11px, white border) — green for live/active, gray for inactive/draft. This is in addition to the existing `StatusBadge`, which stays in its current top-right position.
- Footer row: `{conversation_count} conversations · {relative last_active_at or "Never active"}` on the left, trend badge (`▲18%` / `▼6%` / `New` / hidden if no data) on the right — replacing the current two-line stat layout.
- New `⋯` quick-actions menu (top-right corner, opens a small dropdown): **Open** (same as clicking the card), **Duplicate**, **Pause**/**Activate** (label depends on current status), **Delete** (with a confirm step — reuses the same delete confirmation pattern used elsewhere in the app if one exists, otherwise a simple confirm dialog). Menu click must `stopPropagation` so it doesn't trigger the card's `Link` navigation.
- Card `description` truncation, name, and hover-arrow affordance stay as-is.

### Icon set

Fixed set of ~10-12 icons covering common chatbot use cases (support/headset, sales/cart, general assistant/chat-bubble, docs/book, code, education/graduation-cap, healthcare/heart-pulse, business/briefcase, marketing/megaphone, global/globe, creative/sparkles). Rendered as inline SVGs (same stroke style as existing icons in the codebase) in a new small icon-picker component, used by both `CreateChatbotModal` and wherever chatbot settings are edited.

### `CreateChatbotModal`

Gains an icon picker (grid of the fixed icon set) so new bots can pick an icon at creation time; defaults to the hash-based fallback if the user doesn't pick one.

---

## Out of Scope

- Sparkline/daily activity charts (rejected in favor of the cheaper weekly trend badge).
- List/table view or hero/featured-bot layout (rejected layout directions).
- Any change to the existing chatbot detail pages (analytics, settings, playground, etc.) beyond the icon picker being reusable there later if desired.
- Re-theming the app (colors/typography stay as-is).

---

## Testing

- Backend: unit test for the new aggregate query (bots with zero messages, bots with messages across the week boundary, `duplicate` and `deactivate` endpoints).
- Frontend: manual verification via `/run` — create a few chatbots, send messages to generate conversation data, confirm dashboard shows real counts/trend, confirm quick-actions menu (duplicate, pause/activate, delete) works end to end.
