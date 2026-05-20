# RAG Chatbot — Task Tracker

> Last updated: 2026-03-27
> Branch: main

---

## Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- **P1** Critical / High Priority
- **P2** Medium Priority
- **P3** Low Priority / Polish

---

## P1 — Critical / High Priority

| ID | Status | Task | File(s) | Notes |
|----|--------|------|---------|-------|
| T01 | `[x]` | Implement OCR agent — replace placeholder with PaddleOCR | `agents/execution/ocr.py`, `services/paddle_ocr_service.py` | Fully implemented with image extraction, URL fetching, data URI support |
| T02 | `[x]` | Implement URL processing agent — replace placeholder with actual URL content extraction | `agents/execution/url_processing.py` | Fully implemented with BeautifulSoup parsing, content extraction |
| T03 | `[x]` | Fix Milvus dimension mismatch — implemented padding in `_pad_embedding()` | `services/milvus_service.py` | Embeddings padded to collection dimension automatically |
| T04 | `[x]` | Fix CORS configuration — using `settings.cors_origins` | `main.py` | Already using environment-configured origins |
| T05 | `[x]` | Fix TypeScript duplicate spread error in `useChat.ts` | `frontend/src/hooks/useChat.ts` | Code pattern is correct; no duplicate properties |

---

## P2 — Medium Priority

| ID | Status | Task | File(s) | Notes |
|----|--------|------|---------|-------|
| T06 | `[x]` | Implement `GET /documents` endpoint — return list of uploaded documents from database | `api/routes/documents.py` | Queries Document table with session filtering |
| T07 | `[x]` | Implement `POST /documents/url` endpoint — process a URL, extract content, chunk and embed it | `api/routes/documents.py` | Full implementation with URL validation, HTML parsing, embedding |
| T08 | `[x]` | Add Gemini retry logic — handle transient API failures with exponential backoff | `services/gemini_service.py` | 3 retries with 1/2/4s delays |
| T09 | `[x]` | Add rate limiting on chat endpoints — prevent abuse on `POST /chat` and `/chat/ws` | `api/routes/chat.py`, `main.py` | slowapi integration with 30 req/min limit |
| T10 | `[x]` | Improve WebSocket reconnection — add exponential backoff and max retry limit | `frontend/src/hooks/useWebSocket.ts` | Max 5 attempts with 1–16s delays |
| T11 | `[x]` | Auto-run Alembic migrations in Docker Compose startup — add migration step before backend starts | `docker-compose.yml`, `Dockerfile.backend`, `backend/docker-entrypoint.sh` | Entrypoint script runs migrations on startup |
| T12 | `[ ]` | Refactor plan execution out of edges — move `execute_plan_workflow()` from `edges.py` into a dedicated service or node | `graph/edges.py` | Routing file should not contain execution logic |
| T13 | `[ ]` | Wire up or remove `azure_ocr_service.py` — either integrate as an OCR provider option or delete dead code | `services/azure_ocr_service.py` | Useful alternative OCR provider - keep as option |
| T14 | `[ ]` | Wire up or remove `chromadb_service.py` — either integrate as an alternative vector DB or delete dead code | `services/chromadb_service.py` | Useful alternative vector DB - keep as option |

---

## P3 — Low Priority / Polish

| ID | Status | Task | File(s) | Notes |
|----|--------|------|---------|-------|
| T15 | `[ ]` | Add document management page in frontend — `/documents` route with upload and list UI | `frontend/src/app/documents/` | `DocumentUpload` component exists but no page |
| T16 | `[ ]` | Improve session persistence — store session ID beyond `localStorage` (cookie or server-side) | `frontend/src/app/chat/page.tsx` | Session lost on tab/browser clear |
| T17 | `[x]` | Complete Milvus health check in `/health` endpoint — validate connection and collection availability | `main.py` | Full Milvus validation: connection, collection exists, loaded status |
| T18 | `[ ]` | Standardize structured logging across all agent nodes — ensure consistent log entries with agent_id, session_id, timing | `agents/execution/*.py`, `agents/orchestration/*.py` | Logging is inconsistent across agents |
| T19 | `[ ]` | Clean up duplicate Docker Compose files — consolidate or delete `docker-compose copy.yml` and review `docker-compose.lite.yml` | root | Maintenance / avoid confusion |
| T20 | `[x]` | Add server-side input validation for document upload — enforce file size limit and allowed types | `api/routes/documents.py` | 50MB limit, extension whitelist, content-type validation |

---

## Completed

| ID | Task | Completed |
|----|------|-----------|
| T01 | OCR agent implementation with PaddleOCR | 2026-03-27 |
| T02 | URL processing agent with content extraction | 2026-03-27 |
| T03 | Milvus dimension padding | 2026-03-27 |
| T04 | CORS configuration using settings | 2026-03-27 |
| T05 | TypeScript duplicate spread fix | 2026-03-27 |
| T06 | GET /documents endpoint | 2026-03-27 |
| T07 | POST /documents/url endpoint | 2026-03-27 |
| T08 | Gemini exponential backoff retry (3 retries, 1/2/4s delays) | 2026-03-25 |
| T09 | Rate limiting on chat endpoints (30 req/min via slowapi) | 2026-03-27 |
| T10 | WebSocket exponential backoff reconnection (max 5 attempts, 1–16s delays) | 2026-03-25 |
| T11 | Auto-run Alembic migrations in Docker | 2026-03-27 |
| T17 | Complete Milvus health check | 2026-03-27 |
| T20 | Server-side document upload validation | 2026-03-27 |

---

## Remaining Tasks

### P2 (4 remaining)
- **T12**: Refactor plan execution out of edges - architectural cleanup
- **T13**: Azure OCR service - keep as alternative provider option
- **T14**: ChromaDB service - keep as alternative vector DB option

### P3 (4 remaining)
- **T15**: Document management page in frontend
- **T16**: Session persistence improvement
- **T18**: Standardize structured logging
- **T19**: Clean up duplicate Docker Compose files

---

## Notes

- All P1 (Critical) tasks are now complete
- T12 is an architectural improvement that can be done incrementally
- T13/T14 are useful alternatives that should be kept but are not critical
- P3 tasks are polish items that can be addressed as time permits
- Before production deployment: ensure all environment variables are properly set
