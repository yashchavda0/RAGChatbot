# RAG Chatbot — System / Topology Overview

Concise system-level companion to [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md), which has the full method-level backend/frontend deep dive. This file covers only: component topology, Docker Compose service layout, and the request-to-storage data flow at a glance.

## 1. Component diagram

```
                      ┌─────────────────────────────┐
                      │      Next.js 14 (frontend)   │
                      │  dashboard · playground ·    │
                      │  public /widget/[chatbotId]  │
                      └───────────────┬───────────────┘
                                      │ HTTP + WebSocket, via /api/* proxy route
                                      ▼
                      ┌─────────────────────────────┐
                      │        FastAPI backend       │
                      │  routes: chat / chatbots /   │
                      │  documents / agents / tasks  │
                      └───────────────┬───────────────┘
                                      │ process_query() / stream_query()
                                      ▼
                      ┌─────────────────────────────┐
                      │   LangGraph StateGraph (V2)  │
                      │ query_rewriter → session_    │
                      │ loader → hybrid_retrieval →  │
                      │ reranker → confidence_eval → │
                      │ context_compressor/web_search│
                      │ → response_synthesis →       │
                      │ groundedness_check           │
                      └──┬──────┬──────┬──────┬──────┘
                         │      │      │      │
                 ┌───────┘      │      │      └───────┐
                 ▼              ▼      ▼               ▼
          ┌───────────┐  ┌───────────┐ ┌────────┐ ┌───────────┐
          │  Milvus   │  │ PostgreSQL│ │ Redis  │ │ Tavily /  │
          │(vectors,  │  │(chatbots, │ │(cache, │ │ You.com   │
          │ chatbot_  │  │ sessions, │ │ Celery │ │ (web      │
          │ id-scoped)│  │ tasks)    │ │ broker)│ │ search)   │
          └───────────┘  └───────────┘ └───┬────┘ └───────────┘
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │ Celery worker  │
                                    │ (document      │
                                    │  ingestion)    │
                                    └───────┬────────┘
                                            ▼
                                    ┌───────────────┐
                                    │     MinIO      │
                                    │ (raw docs, OCR)│
                                    └───────────────┘
```

The embeddable widget (`packages/widget`, a separate Vite/React bundle built independently of the Next.js app) talks to the same FastAPI backend directly — it is not part of the Next.js request path. See [`docs/ARCHITECTURE.md` §20](./ARCHITECTURE.md#20-shared-packages).

## 2. Docker Compose topology

Two compose files; use dev for local work, prod for deployment:

| File | Purpose |
|---|---|
| `docker-compose.dev.yml` | Hot-reload backend/frontend, Attu GUI, lower resource limits, Celery worker + Flower monitoring |
| `docker-compose.yml` | Optimized production builds, no dev tooling, higher resource limits |

**Services** (dev compose, `docker-compose.dev.yml`):

| Service | Image | Port(s) | Purpose |
|---|---|---|---|
| `postgres` | postgres:16-alpine | 5432 | chatbot configs, conversations, Celery task records |
| `redis` | redis:7-alpine | 6379 | embedding/retrieval/response/session cache + Celery broker |
| `etcd` | quay.io/coreos/etcd:v3.5.5 | — (internal, `milvus` network) | Milvus metadata store |
| `minio` | minio/minio:latest | 9000 (S3 API), 9001 (console) | Milvus object storage + raw document/OCR storage |
| `milvus-standalone` | milvusdb/milvus:v2.4.17 | 19530, 9091 | vector search |
| `attu` | zilliz/attu:v2.4 | 8001 → container 3000 | Milvus GUI (dev only) |
| `backend` | `Dockerfile.backend` (`development` target) | 8000 | FastAPI, `uvicorn --reload` |
| `celery-worker` | `Dockerfile.backend` (`development` target) | — | `celery -A celery_app worker --concurrency=4 --pool=solo`, document ingestion |
| `flower` | `Dockerfile.backend` (`development` target) | 5555 | Celery monitoring UI |
| `widget-build` | node:20-alpine | — | `docker-compose --profile tools run --rm widget-build` — one-off build of the embeddable widget bundle, not part of the normal `up` |
| `frontend` | `frontend/Dockerfile` (`development` target) | 3000 | Next.js, hot-reload |

Networks: `backend` (postgres/redis/backend/celery-worker/flower/frontend) and `milvus` (etcd/minio/milvus-standalone, also joined by backend/celery-worker for direct Milvus access).

```bash
# Start all services (dev)
docker-compose -f docker-compose.dev.yml up -d --build

# Infrastructure only, for local backend dev
docker-compose -f docker-compose.dev.yml up -d postgres milvus-standalone etcd minio redis

# Build the embeddable widget bundle
docker-compose -f docker-compose.dev.yml --profile tools run --rm widget-build

# Logs / stop
docker-compose -f docker-compose.dev.yml logs -f backend
docker-compose -f docker-compose.dev.yml down
```

## 3. Data flow at a glance

**Chat turn**: browser → Next.js `/api/*` proxy → FastAPI `/chat/{chatbot_id}` (or `/ws`) → `process_query`/`stream_query` → LangGraph nodes read/write Milvus (vectors), Postgres (session history), Redis (4-layer cache), and call out to the LLM provider (Gemini/Groq/Azure) + Tavily/You.com on low-confidence fallback → final state persisted to Postgres via `SessionManagerService`.

**Document upload**: browser → Next.js proxy → FastAPI `/chatbots/{id}/documents` → Celery task queued (Redis broker) → worker uploads raw file to MinIO, extracts text, chunks, embeds (ensemble), inserts vectors into Milvus, optionally rebuilds the in-memory BM25 index → status polled by the frontend via `GET /tasks/{id}/status` and `GET /chatbots/{id}/documents`.

Full method-by-method detail for both flows: see [`docs/ARCHITECTURE.md` §9–10](./ARCHITECTURE.md#9-pipeline-document-upload) (backend) and [§18–19](./ARCHITECTURE.md#18-pipeline-chat-flow-frontend) (frontend).

## 4. Key URLs (dev)

| Service | URL |
|---|---|
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
| Frontend | http://localhost:3000 |
| Milvus GUI (Attu, dev only) | http://localhost:8001 |
| MinIO Console | http://localhost:9001 |
| Flower (Celery monitoring) | http://localhost:5555 |
| Health check | `curl http://localhost:8000/health` |

---

For everything else — folder structures, agent tables, service method signatures, database schema, exact pipeline call order — see [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md).
