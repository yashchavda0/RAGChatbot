# RAG Chatbot — Architecture Deep Dive

Current-state reference: folder structure, code flow, and exact method-call order for every pipeline, backend and frontend. Ground truth as of 2026-07-23 (root `CLAUDE.md` + live code). Supersedes the old single-tenant description that used to live in this file.

## Table of Contents

1. [Overview](#1-overview)
2. [Backend folder structure](#2-backend-folder-structure)
3. [Backend entry point (`main.py`)](#3-backend-entry-point-mainpy)
4. [Agent system](#4-agent-system)
5. [RAGState](#5-ragstate)
6. [The LangGraph pipeline](#6-the-langgraph-pipeline)
7. [Service layer](#7-service-layer)
8. [Database schema](#8-database-schema)
9. [Pipeline: document upload](#9-pipeline-document-upload)
10. [Pipeline: chat / RAG execution](#10-pipeline-chat--rag-execution)
11. [Celery / background tasks](#11-celery--background-tasks)
12. [Auth & session](#12-auth--session)
13. [Frontend folder structure](#13-frontend-folder-structure)
14. [Frontend routing](#14-frontend-routing)
15. [API client layer](#15-api-client-layer)
16. [Zustand stores](#16-zustand-stores)
17. [Component inventory](#17-component-inventory)
18. [Pipeline: chat flow (frontend)](#18-pipeline-chat-flow-frontend)
19. [Pipeline: document upload flow (frontend)](#19-pipeline-document-upload-flow-frontend)
20. [Shared packages](#20-shared-packages)
21. [WebSocket contract](#21-websocket-contract)

---

## 1. Overview

Multi-tenant RAG chatbot SaaS. Users create chatbots, each with its own knowledge base; a LangGraph state-machine orchestrates retrieval, evaluation, and generation per query.

| Layer | Technology |
|---|---|
| Backend API | FastAPI |
| Orchestration | LangGraph `StateGraph` |
| LLM | Gemini (default) / Groq / Azure OpenAI — pluggable via `LLM_PROVIDER` |
| Embeddings | Ensemble: Gemini `gemini-embedding-001` (768-dim, API) + optional local sentence-transformers models |
| Vector store | Milvus, one collection (`chatbot_embeddings_v2`), filtered by `chatbot_id` |
| Relational DB | PostgreSQL (chatbot configs, conversations, tasks) |
| Object storage | MinIO (raw documents, OCR content) |
| Cache | Redis (embeddings/retrieval/response/session caching) |
| Async jobs | Celery + Redis broker (document ingestion) |
| Frontend | Next.js 14 App Router, Zustand, Tailwind |
| Shared chat UI | `packages/shared-ui` (consumed by dashboard, public widget page, and the standalone embeddable widget bundle) |

The system underwent a V1 → V2 rewrite. V1 used intent classification (`DOCUMENT_SEARCH`/`WEB_SEARCH`/`OCR`/`URL_PROCESS`/`COMPLEX`) with a `plan_generator`/`plan_validator` step for complex queries. V2 replaced this with a `reasoning_mode` (`fast_rag` / `multi_step` / `research` / `expert_review`) set per-chatbot, and a hybrid-retrieval-first pipeline. The V1 agent files (`intent_classifier.py`, `plan_generator.py`, `plan_validator.py`, `document_search.py`) still exist on disk but are **not imported** by `agents/__init__.py`, so their `@register_agent` decorators never fire — they are inert. Only the agents in `agents/__init__.py` are live in the graph; that is the set documented below.

---

## 2. Backend folder structure

```
backend/
├── main.py                     # FastAPI app, lifespan, routers, health check
├── celery_app.py                # Celery app config (Redis broker/backend)
├── pytest.ini, requirements.txt, requirements-dev.txt, docker-entrypoint.sh
│
├── agents/
│   ├── __init__.py               # imports every ACTIVE agent module — triggers @register_agent
│   ├── registry.py                # AgentRegistry
│   ├── base/base_agent.py         # BaseAgent + @register_agent decorator
│   ├── orchestration/
│   │   ├── multi_step_planner.py       # active — decomposes multi_step/research queries
│   │   ├── research_gap_analyzer.py    # active — research-mode 2nd-pass gap detection
│   │   ├── intent_classifier.py        # V1, inert (not imported)
│   │   ├── plan_generator.py           # V1, inert
│   │   └── plan_validator.py           # V1, inert
│   ├── execution/
│   │   ├── query_rewriter.py           # active
│   │   ├── session_loader.py           # active
│   │   ├── hybrid_retrieval.py         # active — vector + BM25 fused search
│   │   ├── confidence_evaluator.py     # active
│   │   ├── context_compressor.py       # active
│   │   ├── draft_generator.py          # active (expert_review mode)
│   │   ├── answer_critiquer.py         # active (expert_review mode)
│   │   ├── answer_improver.py          # active (expert_review mode)
│   │   ├── reranker.py                 # active
│   │   ├── web_search.py               # active
│   │   ├── response_synthesis.py       # active
│   │   ├── groundedness_check.py       # active (fast_rag quality gate)
│   │   ├── ocr.py                      # active, bypass node (not wired from any conditional edge)
│   │   ├── url_processing.py           # active, bypass node + reused crawl_url()/is_valid_url() helpers
│   │   └── document_search.py          # V1, inert
│   └── indexing/__init__.py       # empty placeholder
│
├── api/
│   ├── websocket.py                # ConnectionManager (global singleton `manager`)
│   ├── routes/
│   │   ├── auth.py                  # /auth/register, /auth/login
│   │   ├── chat.py                  # POST /chat/{chatbot_id}, WS /chat/{chatbot_id}/ws
│   │   ├── chatbots.py               # /chatbots/** — CRUD, KB ingestion, customization, conversations
│   │   ├── documents.py              # /documents/** — legacy, non-chatbot-scoped, synchronous
│   │   ├── agents.py                 # /agents, /agents/graph
│   │   └── tasks.py                  # /tasks/** — Celery task status/cancel
│   └── schemas/
│       ├── chat.py                    # ChatMessage / ChatResponse / DocumentUploadResponse / ...
│       └── common.py                  # Pagination / Error / Success / Health
│
├── config/
│   ├── settings.py                 # Settings (pydantic-settings) — every env var
│   └── logging_config.py            # get_logger(), setup_logging(), set_request_id()
│
├── graph/
│   ├── state.py                     # RAGState TypedDict, create_initial_state(), update_agent_execution()
│   ├── edges.py                     # routing functions
│   └── rag_graph.py                 # build_rag_graph(), get_rag_graph(), process_query(), stream_query()
│
├── services/                       # 20 modules — see §7
├── migrations/                     # idempotent `ALTER TABLE ADD COLUMN IF NOT EXISTS`-style scripts, run at startup
├── tasks/
│   ├── base.py                      # CallbackTask (Celery Task subclass, progress/status hooks)
│   ├── document_tasks.py             # process_document_async, process_batch_documents_async
│   └── url_tasks.py                  # crawl_urls_async, process_url_content_async
└── tests/                          # test_chatbot_service.py — first backend tests in the project (added 2026-07-05)
```

---

## 3. Backend entry point (`main.py`)

`FastAPI(title="RAG Chatbot API", version="2.0.0", lifespan=lifespan)`.

**`lifespan(app)` startup sequence** (in order):
1. `init_database()` (`services/models.py`) — `Base.metadata.create_all(engine)`, then `migrations.run_all_migrations(pg.engine)`.
2. `get_redis_service().connect()`.
3. `get_rag_graph()` — builds/compiles the LangGraph once, cached as a singleton.
4. If `settings.warmup_on_start and settings.warmup_embeddings`: `asyncio.create_task(_warmup_embeddings())` — sleeps `warmup_delay_seconds`, then `embedding_service.warmup()` to preload local sentence-transformers models.

**Shutdown**: cancels the warmup task, `redis.disconnect()`, `milvus.dispose()`, `postgres.dispose()`.

**CORS**: `settings.cors_origins` plus always-appended `"null"`, `"http://localhost"`, `"http://127.0.0.1"` (the embedded widget on third-party pages sends `Origin: null`). `allow_methods=["GET","POST","PATCH","DELETE","OPTIONS"]`.

**`GET /`** — API info. **`GET /health`** — checks Postgres (`pg.health_check()`), Milvus (`milvus._connected`, `get_stats()`), Redis (`client.ping()`) → `"healthy"` or `"degraded"`.

**Router registration**: `auth`, `chat`, `documents`, `agents`, `chatbots`, `tasks` — each owns its own path prefix.

Global `@app.exception_handler(Exception)` → 500 JSON `{"error": "Internal server error"}`.

---

## 4. Agent system

### `BaseAgent` / `@register_agent` / `AgentRegistry`

`agents/base/base_agent.py`:
- `register_agent(agent_id, name, capabilities=None, description=None)` — class decorator. On class definition it instantiates the class, stamps `agent_id`/`agent_name`/`capabilities`/`description` onto both the instance and the class, and calls `AgentRegistry.register(agent_id, instance, cls)`.
- `BaseAgent.execute(state) -> state` — abstract, `NotImplementedError` if unoverridden.
- `BaseAgent.to_langgraph_node()` — default node-factory wrapper around `execute`, named `f"{agent_id}_node"`.
- `BaseAgent.get_info()` / `validate_input(state)` (default `True`) / `handle_error(state, error)`.

`agents/registry.py` — `AgentRegistry` (classmethods over class-level dicts `_agents`, `_agent_classes`):
- `register()`, `get_agent()`, `get_agent_class()`, `list_agents()`, `list_agents_by_capability()`, `get_all_nodes()` (builds `{agent_id: async_node_fn}` — consumed by `build_rag_graph()`), `get_node()`, `clear()`.

Registration is an import-time side effect: `graph/rag_graph.py` does `import agents  # noqa: F401`, which runs `agents/__init__.py`, which imports every active agent module, firing each `@register_agent` decorator once at process start.

### Active agents

Every `execute()` follows the same shape: `update_agent_execution(state, agent_id, name, "running", input)` → work in `try/except` → `update_agent_execution(..., "completed"/"failed", output/error)`.

**Orchestration** (`agents/orchestration/`)

| File | Class | agent_id | Reads | Writes |
|---|---|---|---|---|
| `multi_step_planner.py` | `MultiStepPlannerAgent` | `multi_step_planner` | `query_rewritten`, `reasoning_mode` | `plan_steps` |
| `research_gap_analyzer.py` | `ResearchGapAnalyzerAgent` | `research_gap_analyzer` | `query_rewritten`, `reranked_results`, `metadata.gap_analysis_pass` | `research_gaps`, appends to `query_rewritten`, bumps `metadata.gap_analysis_pass` (capped at 1 extra pass) |

**Execution** (`agents/execution/`)

| File | Class | agent_id | Reads | Writes |
|---|---|---|---|---|
| `query_rewriter.py` | `QueryRewriterAgent` | `query_rewriter` | `query`, `conversation_history` | `original_query`, `query_rewritten` |
| `session_loader.py` | `SessionLoaderAgent` | `session_loader` | `session_id`, `chatbot_id`, `messages` | `reasoning_mode`, `clarification_enabled`, `conversation_history`, `consecutive_clarifications`, `session_context`, `cache_hits.session` |
| `hybrid_retrieval.py` | `HybridRetrievalAgent` | `hybrid_retrieval` | `query_rewritten`, `chatbot_id` | `retrieval_candidates`, `documents` (legacy mirror), `retrieval_latency_ms`, `cache_hits.retrieval` |
| `confidence_evaluator.py` | `ConfidenceEvaluatorAgent` | `confidence_evaluator` | `reranker_top_score`, `reranked_results`, `has_knowledge_base` | `confidence_score`, `answer_source`, `web_fallback_triggered`, `from_web_search_only` |
| `context_compressor.py` | `ContextCompressorAgent` | `context_compressor` | `reranked_results`, `query_rewritten` | `compressed_context` |
| `draft_generator.py` | `DraftGeneratorAgent` | `draft_generator` | `query_rewritten`, `compressed_context`, `conversation_history` | `draft_answer` |
| `answer_critiquer.py` | `AnswerCritiquerAgent` | `answer_critiquer` | `draft_answer`, `compressed_context` | `critique` |
| `answer_improver.py` | `AnswerImproverAgent` | `answer_improver` | `draft_answer`, `critique`, `compressed_context` | `final_response` (may short-circuit graph, see §6) |
| `reranker.py` | `RerankerAgent` | `reranker` | `retrieval_candidates`/`documents`, `ocr_results`, `url_results` | `reranked_results`, `reranker_scores`, `reranker_top_score` |
| `web_search.py` | `WebSearchAgent` | `web_search` | `query_rewritten` | clears document-derived state; sets `answer_source="web"`, `from_web_search_only=True`, `web_results` |
| `response_synthesis.py` | `ResponseSynthesisAgent` | `response_synthesis` | `answer_source`, `compressed_context`/`reranked_results`/`web_results`, `system_prompt`, `clarification_enabled`, `consecutive_clarifications`, `retry_count` | `final_response`, `requires_clarification`, `fallback_reason`, `suggested_questions`, `response_sources`, `token_usage`, `generation_latency_ms` |
| `groundedness_check.py` | `GroundednessCheckAgent` | `groundedness_check` | `final_response`, context, `retry_count` | `groundedness_score`, `should_retry`, `retry_count` (bounded by `groundedness_max_retries`) |
| `ocr.py` | `OCRAgent` | `ocr` | `query`, `metadata.images` | `ocr_results` |
| `url_processing.py` | `URLProcessingAgent` | `url_processing` (graph node named `url_process`) | `query`, `metadata.urls` | `url_results` |

Notes:
- `BAAIRerankerService` (used by `reranker.py`) is misleadingly named — it reranks via Gemini-embedding cosine similarity, not a BAAI cross-encoder model.
- `ocr` and `url_process` are registered graph nodes but are not reachable from any conditional edge in the current `build_rag_graph()` wiring — they exist for reuse/future wiring.

---

## 5. RAGState

`graph/state.py` — `RAGState` (TypedDict), grouped by concern:

```
messages, query                                            # core
chatbot_id, system_prompt, has_knowledge_base               # multi-tenant context
original_query, query_rewritten                             # query rewriting
reasoning_mode                                               # fast_rag | multi_step | research | expert_review
session_context, conversation_history                        # session
retrieval_candidates, retrieval_latency_ms                    # hybrid retrieval (top-30)
reranker_scores, reranker_top_score                           # reranker
confidence_score, answer_source, web_fallback_triggered       # confidence eval
compressed_context                                            # context compressor (top-5)
plan_steps, step_results, research_gaps, verified_findings    # multi-step / research
draft_answer, critique                                        # expert review
cache_hits, generation_latency_ms, langsmith_trace_id         # observability
intent, intent_confidence                                     # V1 legacy fields
plan, plan_validated, plan_validation_notes                   # V1 legacy fields
documents, low_relevance, max_document_score                  # legacy retrieval mirror
web_results, ocr_results, url_results                         # source-specific results
reranked_results                                               # post-rerank top-5
groundedness_score, should_retry                               # fast_rag gate
final_response, fallback_reason, suggested_questions,
  response_sources, from_web_search_only, token_usage          # final output
clarification_enabled, consecutive_clarifications,
  requires_clarification                                       # clarify mode
agent_executions, current_agent                                # execution tracking
session_id, request_id, metadata                               # session/meta
error, retry_count                                              # error handling
```

`AgentExecution` TypedDict: `agent_id, agent_name, status, input_data, output_data, started_at, completed_at, execution_time_ms, error_message`.

- `create_initial_state(query, session_id, request_id, chatbot_id="default", system_prompt=..., has_knowledge_base=True)` — builds the full initial dict with defaults.
- `update_agent_execution(state, agent_id, agent_name, status, input_data, output_data=None, error_message=None)` — appends an `AgentExecution` record, sets `state["current_agent"]`.

---

## 6. The LangGraph pipeline

### Routing functions (`graph/edges.py`)

- `route_by_reasoning_mode(state)` → `"multi_step_planner"` if mode in `{multi_step, research}`, else `"hybrid_retrieval"`.
- `route_after_reranker(state)` → `"research_gap_analyzer"` if `reasoning_mode == "research"`, else `"confidence_evaluator"`.
- `route_after_gap_analysis(state)` → `"hybrid_retrieval"` (second pass) if `research` mode and `research_gaps` non-empty, else `"confidence_evaluator"`.
- `route_by_confidence(state)` → `"web_search"` if `answer_source == "web"` or `web_fallback_triggered`, else `"context_compressor"`.
- `route_after_compression(state)` → `"draft_generator"` if `reasoning_mode == "expert_review"`, else `"response_synthesis"`.
- `route_after_improvement(state)` → `END` if `final_response` already set by `answer_improver`, else `"response_synthesis"`.
- `route_after_synthesis(state)` → `END` if `error`; `"groundedness_check"` if `reasoning_mode == "fast_rag"`; else `END`.
- `route_after_groundedness(state)` → `"response_synthesis"` if `should_retry`, else `END`.
- `check_final_response(state)` — defined but not wired into `build_rag_graph()` (dead helper).

### `build_rag_graph()` — node/edge wiring, in order

1. Registers every `AgentRegistry.get_all_nodes()` entry as a graph node (renaming `url_processing` → `url_process`).
2. Adds a no-op passthrough node `reasoning_router`.
3. Sequential start (must be sequential — both mutate the full state dict, no reducer for scalar channels): `START → query_rewriter → session_loader → reasoning_router`.
4. `reasoning_router` —conditional (`route_by_reasoning_mode`)→ `{multi_step_planner | hybrid_retrieval}`.
5. `multi_step_planner → hybrid_retrieval` (unconditional).
6. `hybrid_retrieval → reranker` (unconditional).
7. `reranker` —conditional (`route_after_reranker`)→ `{research_gap_analyzer | confidence_evaluator}`.
8. `research_gap_analyzer` —conditional (`route_after_gap_analysis`)→ `{hybrid_retrieval (2nd pass) | confidence_evaluator}`.
9. `confidence_evaluator` —conditional (`route_by_confidence`)→ `{web_search | context_compressor}`.
10. `web_search → response_synthesis` (unconditional).
11. `context_compressor` —conditional (`route_after_compression`)→ `{draft_generator | response_synthesis}`.
12. Expert-review chain: `draft_generator → answer_critiquer → answer_improver` —conditional (`route_after_improvement`)→ `{response_synthesis | END}`.
13. Bypass nodes present but not wired from any conditional edge: `ocr → reranker`, `url_process → reranker`.
14. `response_synthesis` —conditional (`route_after_synthesis`)→ `{groundedness_check | END}`.
15. `groundedness_check` —conditional (`route_after_groundedness`)→ `{response_synthesis (retry) | END}`.
16. `workflow.compile()` → cached singleton via `get_rag_graph()`.

### Execution helpers

- `process_query(...)` — single-shot `graph.ainvoke`, records `response_time_ms`.
- `stream_query(...)` — async generator over `graph.astream`, yields per-node events plus a final `{"__final_state__": True, "state": ...}` sentinel.
- `get_graph_visualization()` / `print_graph()` — ASCII rendering via `.get_graph().print_ascii()`, surfaced at `GET /agents/graph`.

---

## 7. Service layer

All services in `backend/services/` are class-based singletons, each behind a `get_*_service()` factory unless noted.

- **`llm_service.py`** — abstract `LLMService(ABC)`: `generate()`, `chat()`, `stream_generate()`, `count_tokens()`. Selected by `settings.llm_provider` via `get_llm_service()`:
  - `GeminiLLMService` — `google.generativeai`, retries on rate-limit/5xx (`_with_retry`), per-request `GenerativeModel` with BLOCK_MEDIUM_AND_ABOVE safety settings on all 4 harm categories.
  - `GroqLLMService` — OpenAI-compatible client, blocking calls via `loop.run_in_executor`.
  - `AzureOpenAILLMService` — `AzureOpenAI` client, same executor pattern.
- **`gemini_service.py`** — thin backward-compat re-export of `get_llm_service`/`LLMService`.
- **`embedding_service.py`** — `BaseEmbeddingProvider(ABC)`: `embed_texts()`, `embed_query()`, `get_short_name()`. Providers: `GeminiEmbeddingProvider` (768-dim, retries, batches of 100), `JinaEmbeddingProvider` (1024-dim, REST), `LocalEmbeddingProvider` (sentence-transformers, lazy-loaded, task-prefix support for nomic/bge). `EmbeddingService`: `get_dimension()`, `get_all_dimensions()`, `get_active_models()`, `embed_text()`, `embed_query()` (Redis-cached), `embed_documents()` (Redis-cached, parallel cache lookups), `embed_with_all_models()`, `embed_query_with_all_models()`, `embed_documents_with_all_models()` (all run every active provider in parallel via `asyncio.gather`), `warmup()`, `pad_embedding()`.
- **`milvus_service.py`** — `MilvusService`, collection `chatbot_embeddings_v2`, one `FLOAT_VECTOR` field per active embedding model (`EMBEDDING_FIELDS`). `dispose()`, `insert_embeddings(embeddings, chatbot_id, document_id, chunks, metadata)`, `search(query_embedding, chatbot_id, model_name, top_k, filters)` (single-model, threadpool-offloaded), `ensemble_search(query_embeddings, chatbot_id, top_k, fusion_method, filters)` (parallel per-model search + `_fuse_results` RRF/weighted), `delete_document()`, `delete_chatbot()`, `get_chatbot_chunk_count()`, `get_stats()`, `has_knowledge_base()`, `get_chunks_for_bm25()`. Uses `ThreadPoolExecutor(max_workers=8)` + a lock to guard blocking pymilvus calls.
- **`postgres_service.py`** — `PostgreSQLService`: `get_session()` (contextmanager, commit/rollback/close), `execute_query()`, `execute_command()`, `dispose()`, `health_check()`, `get_table_info()`, `get_stats()`. `QueuePool`, `pool_pre_ping=True`.
- **`document_processor.py`** — `DocumentProcessorService`: `is_supported(filename)`, `process_document(file_content, filename, extract_images=True)` (dispatches to `_process_pdf/_process_docx/_process_text/_process_image`), `_process_pdf()` (pypdf text + OCR fallback via `_ocr_fallback()` when `avg_chars_per_page < settings.ocr_min_chars_per_page`), `_process_docx()` (python-docx paragraphs + tables), `_process_text()` (multi-encoding fallback), `_process_image()` (delegates to `ocr_service.extract_text`), `extract_text_for_indexing()`.
- **`chunking_service.py`** — `ChunkingService(chunk_size=1024, chunk_overlap=50)`: `split_text(text, metadata=None)` (recursive paragraph → sentence → word → char splitting), `split_documents(documents, chatbot_id, document_id)`. Factory `get_chunking_service(chunk_size, chunk_overlap)`.
- **`baai_reranker_service.py`** — `BAAIRerankerService` (Gemini-embedding cosine similarity, not a BAAI cross-encoder): `rerank(query, documents, top_k)` → `_compute_cosine_similarity()`, `rerank_with_merge(query, document_results, web_results, top_k)`.
- **`redis_service.py`** — `RedisService` (low-level raw wrapper; `get_redis_service()` is `async`, connects on first access): `connect()`, `disconnect()`, `get/set/delete/exists()`, plus `cache_embedding/get_embedding`, `cache_search_results/get_search_results`, `cache_llm_response/get_llm_response`, `cache_reranker_results/get_reranker_results`.
- **`cache_service.py`** — `CacheService`, the structured 4-layer pipeline cache agents actually use: `compute_query_hash(query, chatbot_id)`, Layer 1 embedding (24h TTL), Layer 2 retrieval (1h TTL), Layer 3 response (30min TTL), Layer 4 session (1h TTL). All methods swallow exceptions (non-fatal cache).
- **`chatbot_service.py`** — `ChatbotService`: `create()`, `get()`, `_get_chatbot_stats()` (2 grouped queries, no N+1 — conversation/message/document counts + weekly deltas), `list()`, `update()` (must reassign the `settings` dict for SQLAlchemy change-tracking), `delete()`, `duplicate()` (config-only, does not copy documents/vectors), `get_status()`, `update_status()`.
- **`azure_ocr_service.py`** — `AzureOCRService` (`azure.ai.formrecognizer.DocumentAnalysisClient`, model `"prebuilt-layout"`): `is_configured()`, `extract_text()`, `extract_text_from_file()`, `extract_with_structure()`.
- **`ocr_service.py`** — `OCRService` (singleton via `__new__`, wraps `AzureOCRService` only): `provider` property, `extract_text()`, `extract_text_from_file()`, `extract_with_structure()`.
- **`tavily_service.py`** — `TavilyService`: `search(query, max_results, search_depth, include_domains, exclude_domains)`, `search_with_answer(query, max_results)`.
- **`youcom_service.py`** — `YouComService`: `search(query, max_results, freshness, include_domains, exclude_domains)` — merges You.com `web` + `news` buckets.
- **`bm25_service.py`** — `BM25Service` (in-memory, per-chatbot `BM25Okapi` indexes): `build_index()`, `add_documents()` (rebuilds full index), `search()`, `has_index()`, `delete_index()`, `get_stats()`. Module-level fusion: `fuse_results()`, `_rrf_fusion()`, `_weighted_fusion()`.
- **`minio_service.py`** — `MinIOService`: `upload_document()`, `upload_ocr_content()`, `get_document_url()` (presigned), `delete_document()`, `_remove_object_if_exists()`, `document_exists()`.
- **`models.py`** — SQLAlchemy `Base` + all ORM models (see §8) + `init_database()`.
- **`observability.py`** — `ObservabilityService` (LangSmith + structured JSON logs, all non-fatal): `create_run()`, `end_run()`, `log_node()`, `log_retrieval_metrics()`, `log_token_usage()`, `log_cache_event()`, `log_confidence()`, `log_compression_metrics()`.
- **`session_manager.py`** — `SessionManagerService`: `create_session()`, `get_session()`, `update_activity()`, `add_message()`, `get_conversation_history()`, `get_message_count()`, `get_message_count_since()` (rate limiting), `cleanup_expired_sessions()`.
- **`task_manager.py`** — `CeleryTask` SQLAlchemy model (table `celery_tasks`) + `TaskManager`: `create_task()`, `update_status()`, `get_task()`, `get_chatbot_tasks()`, `cleanup_old_tasks()`.

---

## 8. Database schema

`services/models.py` (SQLAlchemy `Base`), plus `CeleryTask` from `task_manager.py`:

| Table | Model | Key columns |
|---|---|---|
| `users` | `User` | id, email (unique), full_name, hashed_password, is_active, subscription_tier |
| `chatbots` | `Chatbot` | id, name, description, system_prompt, status, embedding_model, chunk_size, chunk_overlap, web_search_threshold, settings (JSON) |
| `chatbot_documents` | `ChatbotDocument` | id, chatbot_id, filename, source_type, source_url, file_size, status, chunks_count, error_message, parent_document_id |
| `chatbot_customizations` | `ChatbotCustomization` | id, chatbot_id (unique), primary_color, position, size, border_radius, font_family, greeting, welcome_message, bot_name, avatar_url, auto_open, ... |
| `chatbot_metadata` | `ChatbotMetadata` | chatbot_id (unique), total_chunks, total_documents, training_progress, last_trained_at, training_error |
| `agents` | `Agent` | agent_id, agent_name, agent_type, capabilities (JSON), input/output_schema |
| `agent_executions` | `AgentExecution` | execution_id, session_id, agent_id, input/output_data, status, timing |
| `sessions` | `Session` | session_id, user_id, created_at, last_activity, meta_data, is_active |
| `conversation_messages` | `ConversationMessage` | message_id, session_id, chatbot_id, role, content, sources (JSON), agent_executions (JSON), timestamp |
| `documents` | `Document` | document_id, session_id, filename, file_type, file_size, storage_path |
| `document_chunks` | `DocumentChunk` | chunk_id, document_id, chunk_index, content, embedding_id, embedding_models (JSON) |
| `workflows` / `workflow_executions` | `Workflow` / `WorkflowExecution` | DAG graph_definition, node_executions |
| `plans` / `plan_executions` | `Plan` / `PlanExecution` | plan_definition (JSON), validation_status |
| `sources` | `Source` | source_type, source_url, document_id, chunk_id, relevance_score |
| `agent_logs` | `AgentLog` | level, agent_id, execution_id, session_id, message, context |
| `celery_tasks` | `CeleryTask` | id (Celery task id), chatbot_id, task_type, status, progress, result (JSON), task_metadata (JSON) |

`init_database()` runs `Base.metadata.create_all(engine)` then `migrations.run_all_migrations(engine)` — idempotent `ALTER TABLE` scripts in `backend/migrations/` (e.g. `add_celery_tasks.py`, `add_chatbot_id_to_messages.py`, `add_customization_and_settings.py`, `add_parent_document_id.py`, `add_web_search_threshold.py`). No Alembic — plain scripts run at startup.

---

## 9. Pipeline: document upload

Three near-duplicate ingestion paths exist. Only the first uses Celery.

### 9a. `POST /chatbots/{chatbot_id}/documents` — Celery async (primary path)

`backend/api/routes/chatbots.py::upload_document`:
1. `get_chatbot_service().get(chatbot_id)` — 404 if missing.
2. Generate `document_id`; read file bytes; `base64.b64encode`.
3. `process_document_async.delay(chatbot_id, document_id, filename, content_base64)` — queues the Celery task.
4. `TaskManager().create_task(task_id=task.id, chatbot_id, task_type="document_processing", metadata={filename, document_id, file_size})`.
5. Returns `{task_id, document_id, status:"queued", poll_url}` immediately (<100ms).

Inside the worker (`backend/tasks/document_tasks.py::process_document_async`, runs in a fresh asyncio loop via `loop.run_until_complete`):
1. `base64.b64decode` → create `ChatbotDocument` row (`status="processing"`).
2. `chatbot_service.update_status(chatbot_id, "training", 15)`.
3. `minio_service.upload_document(...)` — raw file → MinIO.
4. `DocumentProcessorService().process_document(file_content, filename, extract_images=True)` — text extraction.
5. If OCR text present: `minio_service.upload_ocr_content(...)`.
6. `ChunkingService(chunk_size, chunk_overlap).split_text(text)` → chunks.
7. `get_embedding_service().embed_documents_with_all_models(chunks)` — parallel across all active embedding providers.
8. `get_milvus_service().insert_embeddings(embeddings=all_embeddings, chatbot_id, document_id, chunks, metadata=[...])`.
9. If `settings.bm25_enabled`: `get_bm25_service().add_documents(chatbot_id, chunks, chunk_ids)`.
10. Update `ChatbotDocument.status="completed"`, `chunks_count`; `chatbot_service.update_status(chatbot_id, "active", 100)`.
11. `CallbackTask.on_success` writes the final `celery_tasks` row via `TaskManager.update_status(status="completed", progress=100, result=retval)`.

### 9b. `POST /documents/upload?chatbot_id=...` — legacy, fully synchronous

`backend/api/routes/documents.py::upload_document`:
1. Validate extension/size.
2. `DocumentProcessorService().process_document(file_content, filename)`.
3. `ChunkingService().split_text(result["text"])` → `chunks = [c["content"] for c in chunk_result]`.
4. `get_embedding_service().embed_documents_with_all_models(chunks)`.
5. `get_milvus_service().insert_embeddings(embeddings=all_embeddings, chatbot_id, document_id, chunks, metadata=[{"filename","source_type":"upload"}]*len(chunks))`.
6. If BM25 enabled: `get_bm25_service().add_documents(...)`.
7. Returns `DocumentUploadResponse` synchronously — blocks the request for the full pipeline duration.

### 9c. FastAPI `BackgroundTasks` variant (URL / text ingestion)

Module-level functions inside `chatbots.py` (`process_document_task`, `process_url_task`, `process_text_task`), invoked via `BackgroundTasks.add_task(...)` from `POST /chatbots/{id}/urls`, `POST /chatbots/{id}/urls/scrape`, and `POST /chatbots/{id}/text` — same call order as 9a minus the Celery wrapper (in-process, not distributed/retryable).

Related read-only endpoint: `POST /chatbots/{id}/urls/crawl` — synchronous multi-level BFS crawl via `agents.execution.url_processing.crawl_url()`, returns discovered links without indexing them (the frontend lets the user pick which to scrape via 9c).

---

## 10. Pipeline: chat / RAG execution

### Entry points

- `POST /chat/{chatbot_id}` (`chat.py::chat`) — synchronous, single response.
- `WS /chat/{chatbot_id}/ws` (`chat.py::chat_websocket`) — streaming, live per-node updates.

### `POST /chat/{chatbot_id}` call order

1. `get_chatbot_service().get(chatbot_id)` — 404 if missing, 400 if `status=="error"`.
2. `get_session_manager().get_session(session_id)` → `create_session()` if absent.
3. Enforce `max_messages_per_conversation` (`get_message_count`) and `rate_limit_per_hour` (`get_message_count_since`) from `chatbot.settings`.
4. `get_milvus_service().has_knowledge_base(chatbot_id)`.
5. Response-cache check: `get_cache_service().compute_query_hash(message, chatbot_id)` → `cache.get_response(q_hash, chatbot_id)`. Cache hit: persist messages via `session_manager.add_message`/`update_activity`, return cached `ChatResponse` immediately — bypasses the graph entirely.
6. Otherwise: `await process_query(query=message, session_id, chatbot_id, system_prompt=chatbot["system_prompt"], has_knowledge_base=has_knowledge)`.
7. `session_manager.add_message(role="user", ...)`, `add_message(role="assistant", content=final_response, sources, agent_executions, metadata={requires_clarification})`, `update_activity`.
8. Build and return `ChatResponse` from the resulting `RAGState`.

### `process_query()` — LangGraph node firing order

1. **`query_rewriter`** — rewrites a follow-up into a standalone query (skipped if `query_rewrite_enabled=False` or first turn).
2. **`session_loader`** — loads `reasoning_mode`/`clarification_enabled` from chatbot settings, `conversation_history` from Postgres, `session_context` from Redis.
3. **`reasoning_router`** (no-op) → `route_by_reasoning_mode`:
   - `multi_step`/`research` → **`multi_step_planner`** (decomposes into ≤4 sub-queries via LLM) → **`hybrid_retrieval`**.
   - `fast_rag`/`expert_review` → straight to **`hybrid_retrieval`**.
4. **`hybrid_retrieval`** — checks retrieval cache; else parallel `_vector_search` (embed with all models → `milvus.ensemble_search`) + `_bm25_search` (`bm25_service.search`, building the index on demand via `milvus.get_chunks_for_bm25` if missing), fused via `asyncio.gather` + RRF → top 30 `retrieval_candidates`. Result cached.
5. **`reranker`** — `get_reranker_service().rerank(query, all_inputs, top_k=reranker_top_n)` → top 5 `reranked_results`, `reranker_top_score`.
6. `route_after_reranker`:
   - `research` mode → **`research_gap_analyzer`** — LLM identifies gaps; if found (and no prior pass this turn) loops back to **`hybrid_retrieval`** (bounded to 1 extra pass); else → `confidence_evaluator`.
   - all other modes → **`confidence_evaluator`** directly.
7. **`confidence_evaluator`** (pure logic) — compares `reranker_top_score` vs `settings.confidence_threshold`.
8. `route_by_confidence`:
   - low confidence / no KB → **`web_search`** (parallel Tavily + You.com via `asyncio.gather`, deduped by URL, clears document-derived state) → **`response_synthesis`**.
   - high confidence → **`context_compressor`** (compresses each of top-5 chunks in parallel + LLM extraction, or passthrough if disabled).
9. `route_after_compression`:
   - `expert_review` mode → **`draft_generator`** → **`answer_critiquer`** → **`answer_improver`** → `route_after_improvement` → `END` (if `final_response` set) or **`response_synthesis`**.
   - other modes → **`response_synthesis`** directly.
10. **`response_synthesis`** — source-strict (documents-only or web-only context), builds the system prompt (+ clarify-mode instructions if enabled), `llm.generate()`, parses `<answer>`/`<clarify>` tags, sets `final_response`/`requires_clarification`/`suggested_questions`/`response_sources`/`token_usage`; caches response unless it's a clarification turn.
11. `route_after_synthesis`:
    - `fast_rag` mode, no error → **`groundedness_check`** — embeds `final_response` + source chunks, cosine-similarity gate; below threshold and `retry_count < groundedness_max_retries` → `should_retry=True`, `retry_count += 1` → loops back to **`response_synthesis`** → re-runs groundedness_check → `END`.
    - all other modes / errors → `END`.

### WebSocket variant (`chat_websocket`)

Same business logic (session/rate-limit checks, `has_knowledge_base`) but calls `stream_query(...)` and iterates `graph.astream(...)` events. For each node's `agent_executions` update, calls `manager.send_agent_update(...)` per entry (`running`/`completed`/`failed`) — live per-agent progress to the frontend. After the `__final_state__` sentinel: `manager.send_response(...)` (final answer + sources + metrics), then a `"done"` broadcast with full V2 metrics (`answer_source`, `reasoning_mode`, latencies, `cache_hits`, `reranker_top_score`, `web_fallback_triggered`, `fallback_reason`, `suggested_questions`), then persists messages via `session_manager`.

---

## 11. Celery / background tasks

- **`backend/celery_app.py`** — `Celery('rag_chatbot', broker=settings.redis_url, backend=settings.redis_url, include=['tasks.document_tasks','tasks.url_tasks'])`. JSON-only serialization; `task_track_started=True`; `task_time_limit=600`/`task_soft_time_limit=540`; `task_acks_late=True`; `worker_prefetch_multiplier=1`; `worker_max_tasks_per_child=100`; `result_expires=3600`; queue routing (`tasks.process_document` → `documents` queue, `tasks.crawl_urls`/`tasks.process_url_content` → `urls` queue); `task_prerun`/`task_postrun`/`task_failure` signal handlers for logging.
- **`backend/tasks/base.py`** — `CallbackTask(Task)`: lazy `task_manager` property; `on_success`/`on_failure`/`on_retry` write to `celery_tasks` via `TaskManager`; `update_progress(progress, message, metadata)` updates both Celery's own state (`self.update_state(state='PROGRESS', meta=...)`) and the DB row.
- **`backend/tasks/document_tasks.py`** — `process_document_async` (§9a), `process_batch_documents_async` (loops, calls `process_document_async.apply(...)` synchronously per doc, aggregates results).
- **`backend/tasks/url_tasks.py`** — `crawl_urls_async` (loops `crawl_url()` per URL, reports progress), `process_url_content_async` (fetch → BeautifulSoup extract → chunk → embed → Milvus insert for one URL).
- **`backend/services/task_manager.py`** — `TaskManager` + `CeleryTask` model, consumed by `api/routes/tasks.py`.
- **`api/routes/tasks.py`**: `GET /tasks/{task_id}/status` (merges Celery `AsyncResult` state with the `TaskManager` DB record), `DELETE /tasks/{task_id}` (`celery_app.control.revoke(task_id, terminate=True)`), `GET /tasks/chatbot/{chatbot_id}` (list tasks for a chatbot).
- Docker: dedicated `celery-worker` (concurrency 4 default) and `flower` (monitoring UI, port 5555) services in `docker-compose.dev.yml`. See `CELERY_README.md` at repo root for the operational rollout details.

---

## 12. Auth & session

**Auth** (`api/routes/auth.py`) — standalone JWT auth, **not enforced** as a dependency on chat/chatbot/document routes (no `Depends(get_current_user)` found on those routers — auth exists but route-level protection is not wired in yet):
- `POST /auth/register` — password ≥8 chars (Pydantic validator), email uniqueness check, `bcrypt.hashpw`, insert `User`, `_build_auth_response()` (access token 1-day TTL, refresh token 30-day TTL, HS256 signed with `settings.secret_key`).
- `POST /auth/login` — `bcrypt.checkpw`, `is_active` check, same token response.

**Session/conversation flow** (`services/session_manager.py`):
- Every chat turn: `get_session()` → `create_session()` if missing (keyed by client-supplied `session_id`, default `"default"`) — creates a `Session` row.
- `add_message()` persists both user and assistant turns to `ConversationMessage` (chatbot_id, session_id, role, content, sources, agent_executions, meta_data incl. `requires_clarification`).
- `get_conversation_history(session_id, limit)` — used by `SessionLoaderAgent` at the start of every graph run to hydrate `conversation_history`; also computes `consecutive_clarifications` (trailing clarifying-question streak, used to force an answer after 2 in a row via the `_CLARIFY_OVERRIDE` prompt in `response_synthesis.py`).
- `update_activity()` bumps `Session.last_activity`; `cleanup_expired_sessions()` marks sessions inactive after `settings.session_timeout_minutes`.
- Separately, `CacheService` Layer 4 (`get_session`/`set_session`) caches a lightweight `session_context` summary in Redis, consulted by `SessionLoaderAgent._load_session_context()` before falling back to rebuilding from `state["messages"]`.

---

## 13. Frontend folder structure

```
frontend/src/
├── app/                                    Next.js 14 App Router
│   ├── layout.tsx                          root layout, Inter font, imports shared-ui CSS
│   ├── page.tsx                            marketing/landing page
│   ├── login/  signup/  forgot-password/    auth pages
│   ├── chat/page.tsx                       standalone demo chat (legacy, not chatbot-scoped)
│   ├── agents/page.tsx                     public agent-workflow visualizer demo
│   ├── widget/[chatbotId]/page.tsx         public embeddable widget page (iframe target)
│   ├── api/[...path]/route.ts              catch-all reverse proxy to backend
│   └── (auth)/                             protected route group
│       ├── layout.tsx                      auth guard + TopBar
│       ├── dashboard/page.tsx               chatbot list/management
│       └── chatbot/[chatbotId]/
│           ├── layout.tsx                  fetches chatbot, renders Sidebar + content
│           ├── page.tsx                    redirects to .../analytics
│           ├── analytics/  knowledge-base/  qa-management/  customization/
│           ├── settings/  playground/  embed/  conversations/
├── components/
│   ├── agents/ analytics/ auth/ chat/ conversations/ customization/ dashboard/
│   ├── documents/ embed/ knowledge/ layout/ playground/ qa/ settings/ shared/ tasks/ ui/
├── hooks/               useAnalytics, useTaskPolling
├── lib/
│   ├── api.ts           chatApi, chatbotApi, documentApi, customizationApi
│   ├── conversationApi.ts
│   ├── utils.ts
│   └── utils/            formatters.ts, constants.ts, chatbotIcons.ts, trend.ts
├── stores/              authStore.ts, conversationStore.ts (Zustand)
├── types/               index.ts, auth.ts, chatbot.ts, conversation.ts, analytics.ts
└── __tests__/
```

`useChat`, `useWebSocket`, `MessageList`, `MessageBubble`, `AgentExecutionCard`, `SourceFooter`, `WidgetChatSurface`, `ScrollArea` do **not** live in `frontend/src` — they live in `packages/shared-ui` and are imported as `@ragchatbot/shared-ui` (§20).

---

## 14. Frontend routing

**Public routes**

| Route | Renders | API/store |
|---|---|---|
| `/` | Marketing landing page | `useAuthStore` (CTA text only) |
| `/login` | Login form | `POST /api/auth/login`, `useAuthStore.login()` |
| `/signup` | Signup form + password strength | `POST /api/auth/register`, `useAuthStore.login()` |
| `/forgot-password` | Reset-request form | simulated, no real API call |
| `/chat` | Standalone demo chat UI | `useChat` from shared-ui — legacy/orphaned demo page |
| `/agents` | Static agent-workflow visualizer | `GET /api/agents` (polled 5s), falls back to hardcoded defaults |
| `/widget/[chatbotId]` | Full-page embeddable widget (iframe target) | `GET /api/chatbots/{id}/customization`, renders `WidgetChatSurface` |
| `/api/[...path]` | Reverse-proxy route handler, not a page | Forwards to `INTERNAL_BACKEND_URL`/`BACKEND_URL`/`NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) |

**Protected routes — `(auth)/`** (guarded by `(auth)/layout.tsx`, reads `useAuthStore`, redirects to `/login` once persisted state has rehydrated)

| Route | Renders | API/store |
|---|---|---|
| `/dashboard` | Chatbot grid, stats, search/filter, create modal | `chatbotApi.list/create/delete/duplicate/activate/deactivate` |
| `/chatbot/[chatbotId]` | Redirect → `/chatbot/{id}/analytics` | — |
| `.../analytics` | MetricsGrid, ConversationChart, SatisfactionChart, TopQueriesList, AgentStats, KnowledgeUsage | `useAnalytics(chatbotId)` — currently generates mock client-side data, real call commented out |
| `.../knowledge-base` | Documents/URLs/Text tabs, upload, crawl, stats | `documentApi.list/upload/addUrl/addText/crawlUrl/scrapeUrls/delete/get` |
| `.../qa-management` | "Coming Soon" placeholder | none — `QAModal`/`QATable` exist but unused |
| `.../customization` | Widget appearance/behavior form + live `WidgetChatSurface` preview | `customizationApi.get/update` |
| `.../settings` | General/AI Model/Rate Limit/Security/Danger Zone | `chatbotApi.get/update/activate/delete` |
| `.../playground` | Chat + DebugPanel test console | `useChat(chatbotId, sessionId)` from shared-ui + local `ChatInput`/`MessageBubble` |
| `.../embed` | Script-tag/NPM/React install snippets + read-only `WidgetChatSurface` preview | raw `fetch GET /api/chatbots/{id}/customization` |
| `.../conversations` | Two-pane conversation history browser | `useConversationStore` + `conversationApi.listConversations/getConversation` |

`(auth)/chatbot/[chatbotId]/layout.tsx` fetches the chatbot via `chatbotApi.get` and renders `Sidebar` + page content (404/error state if not found).

---

## 15. API client layer

Base: `const API_URL = "/api"` — all requests go through the Next.js proxy route.

**`lib/api.ts`**

`chatApi`
- `getHistory(chatbotId, sessionId)` → `GET /api/chat/{chatbotId}/history?session_id=&limit=100`

`chatbotApi`
- `list(status?, limit=50)` → `GET /api/chatbots?status=&limit=`
- `get(id)` → `GET /api/chatbots/{id}`
- `create(data)` → `POST /api/chatbots`
- `update(id, data)` → `PATCH /api/chatbots/{id}`
- `delete(id)` → `DELETE /api/chatbots/{id}`
- `activate(id)` / `deactivate(id)` / `duplicate(id)` → `POST /api/chatbots/{id}/activate|deactivate|duplicate`
- `getStatus(id)` → `GET /api/chatbots/{id}/status`

`documentApi`
- `list(chatbotId)` → `GET /api/chatbots/{chatbotId}/documents`
- `get(chatbotId, documentId)` → `GET /api/chatbots/{chatbotId}/documents/{documentId}` (returns `download_url`)
- `delete(chatbotId, documentId)` → `DELETE /api/chatbots/{chatbotId}/documents/{documentId}`
- `upload(chatbotId, file)` → `POST /api/chatbots/{chatbotId}/documents` (multipart `FormData`, field `file`)
- `addUrl(chatbotId, url)` → `POST /api/chatbots/{chatbotId}/urls` (JSON `{url}`)
- `addText(chatbotId, text, sourceName?)` → `POST /api/chatbots/{chatbotId}/text`
- `crawlUrl(chatbotId, url, {maxDepth=2, maxLinks=100, sameDomainOnly=true})` → `POST /api/chatbots/{chatbotId}/urls/crawl`
- `scrapeUrls(chatbotId, urls[], sourceUrl?)` → `POST /api/chatbots/{chatbotId}/urls/scrape`

`customizationApi`
- `get(chatbotId)` → `GET /api/chatbots/{chatbotId}/customization`
- `update(chatbotId, data)` → `POST /api/chatbots/{chatbotId}/customization`

All modules share `ApiError` + `handleResponse<T>()`.

**`lib/conversationApi.ts`** (own `ApiError`/`handleResponse`):
- `listConversations(chatbotId, filters?, pagination?)` → `GET /api/chatbots/{chatbotId}/conversations?page=&limit=&order=&search=`
- `getConversation(chatbotId, sessionId)` → `GET /api/chatbots/{chatbotId}/conversations/{sessionId}`

**`hooks/useTaskPolling.ts`** (Celery task polling):
- `useTaskPolling({taskId, interval, onComplete, onError})` → polls `GET /api/tasks/{taskId}/status`
- `cancelTask(taskId)` → `DELETE /api/tasks/{taskId}`
- `getChatbotTasks(chatbotId, options)` → `GET /api/tasks/chatbot/{chatbotId}`

---

## 16. Zustand stores

**`authStore.ts`** (`useAuthStore`, `persist` → `localStorage` key `auth-storage`)
- State: `user`, `tokens`, `isAuthenticated`, `isLoading`.
- Actions: `setUser`, `setTokens` (also mirrors tokens into raw `localStorage` keys), `login(user, tokens)`, `logout()`, `setLoading`, `updateUser(partial)`.
- `onRehydrateStorage` sets `isLoading=false` once persisted state loads — `(auth)/layout.tsx` waits on this before redirecting.

**`conversationStore.ts`** (`useConversationStore`, no persistence)
- State: `conversations`, `selectedConversation`, `filters {search, sortBy}`, `pagination {page, limit, total, pages}`, `isLoading`, `isLoadingDetail`, `error`.
- Actions: `setConversations`, `selectConversation`, `setFilters`, `setPagination`, `setLoading`, `setLoadingDetail`, `setError`, `reset()`.
- Consumed only by the conversations page.

No other Zustand stores exist.

---

## 17. Component inventory

- **`agents/`** — `WorkflowGraph` (hand-coded SVG diagram of the 9 fixed agent IDs), `AgentList`. Used only by the public `/agents` demo.
- **`analytics/`** — `MetricsGrid`, `MetricCard`, `ConversationChart`, `SatisfactionChart`, `TopQueriesList`, `KnowledgeUsage`, `AgentStats`, `DateRangePicker`, `ExportButton` — driven by `useAnalytics` (currently mock data).
- **`auth/`** — `AuthShell`, `AuthInput`. Used by login/signup/forgot-password.
- **`chat/`** — `ChatInput` — the one chat piece owned by the frontend app itself (not shared-ui): auto-resizing textarea, file-attach button (UI only — upload not wired), char-limit warning, Enter-to-send. Used by `/chat` and `.../playground`.
- **`conversations/`** — `ConversationList`, `ConversationDetail`, `ConversationFilters`, `MessageThread` (maps backend `ConversationMessage[]` → shared-ui `ChatMessage` via `mapConversationMessage`).
- **`customization/`** — `ColorPicker`.
- **`dashboard/`** — `ChatbotCard`, `ChatbotCardMenu` (Open/Duplicate/Pause-Activate/Delete), `CreateChatbotModal`, `IconPicker`.
- **`documents/`** — `DocumentUpload` — generic drag-and-drop uploader with a simulated progress bar; posts to `/api/documents/upload` (chatbot-agnostic, NOT `documentApi.upload`'s chatbot-scoped path). Used only inside the standalone `/chat` page's sidebar — a separate, disconnected implementation from the real Knowledge Base uploader.
- **`embed/`** — `CodeBlock`/`InlineCode`.
- **`knowledge/`** — `DocumentList`, `UrlList`, `WebsiteCrawlFlow` (crawl → discover → checkbox-select → bulk scrape).
- **`layout/`** — `Sidebar` (per-chatbot left nav: Analytics/Knowledge Base/Q&A/Customization/Settings/Playground/Embed/Conversations).
- **`playground/`** — `DebugPanel` (execution timeline, detected intent, agent steps, sources, token/latency), `ExecutionFlow` (built but unused — DebugPanel is used instead).
- **`qa/`** — `QAModal`, `QATable` — fully built but not wired into any page; `qa-management` shows a static placeholder instead.
- **`settings/`** — `SettingsSection`/`SettingRow`/`Toggle`/`Slider`/`Select`/`TextArea`, `ModelSelector` (lists Gemini/GPT-4/GPT-3.5/Claude-3, several marked disabled "Coming Soon").
- **`shared/`** — `GlassCard`, `TopBar`, `StatusBadge`, `TrendBadge`, `ChatbotAvatar`.
- **`ui/`** — shadcn-style primitives: `button`, `card`, `glass-card`, `input`, `skeleton`.
- **`tasks/`** — `TaskProgress`/`TaskProgressCard` — paired with `useTaskPolling`, not currently referenced by any page.

---

## 18. Pipeline: chat flow (frontend)

Two chat surfaces share the same underlying hook: the dashboard playground (`ChatInput` + `useChat`) and the embeddable widget (`WidgetChatSurface`'s inline input + `useChat`). Both call into `packages/shared-ui`.

**Widget path** — `WidgetChatSurface.tsx`: user types in the inline input → Enter/Send → `handleSend(inputValue)` → `sendMessage(content)` (from `useChat`).

**Playground/legacy path** — `ChatInput.tsx`: user types in the auto-resizing textarea → Enter (no Shift) or Send → `handleSend()` → prop `onSendMessage(input.trim())`, wired by the page to `sendMessage` from `useChat`.

**`useChat.sendMessage` implementation** (`packages/shared-ui/src/hooks/useChat.ts`), in order:
1. Guard: empty content → no-op.
2. Append a `user` `ChatMessage` to local `messages` state.
3. `setIsLoading(true)`, reset `agentExecutions` and `currentResponseRef`.
4. Append an empty placeholder `assistant` `ChatMessage` (id kept in `assistantMessageRef`) — the typing/streaming bubble.
5. Branch on `isConnected` (from `useWebSocket`):
   - **WebSocket (primary)**: `setIsStreaming(true)`, `sendWsMessage({type: "chat_message", session_id, message: content})` → `useWebSocket.sendMessage()` → `wsRef.current.send(JSON.stringify(...))`.
   - **HTTP fallback**: `fetch POST {apiBaseUrl}/chat/{chatbotId}` with `{message, session_id}`, patches the placeholder assistant message with the full JSON response.

**WebSocket connect/lifecycle** (`useWebSocket.ts`):
- On mount, `connect(chatbotId, sessionId)` builds `${wsBaseUrl}/chat/{chatbotId}/ws?session_id={sessionId}` and opens a native `WebSocket`.
- `ws.onopen` → `isConnected=true`.
- `ws.onmessage` → `handleMessage()` → `JSON.parse` → `onMessage(message)`, plus `onAgentUpdate(data)` if `type === "agent_update"`.
- `ws.onclose` → `isConnected=false`; reconnects with exponential backoff (`1000ms * 2^attempt`, max 5 attempts) unless the close was intentional or code is 1000/1001.
- Unmount / id change → `disconnect()` (maxes out reconnect attempts, closes with code 1000).

**Message-type handling inside `useChat`'s `onMessage`**, per WS frame `type`:
- `"chat_chunk"` — appends `data.chunk` to `currentResponseRef`, patches the last assistant message's content (token-by-token streaming).
- `"chat_complete"` — stops loading/streaming; dedupes sources (`deduplicateSources()`), derives `source_type` (`determineSourceType()`), patches the assistant message with final content/sources/agent_executions/confidence/answer_source/fallback_reason/suggested_questions; sets `agentExecutions`/`tokenUsage`/`responseTime`.
- `"error"` — stops loading/streaming, logs to console.
- `"response"` (non-streaming final payload) — same field mapping as `chat_complete`.
- `"done"` — backfills any of `token_usage`/`response_time_ms`/`answer_source`/`fallback_reason`/`retrieval_confidence`/`suggested_questions` not already set.
- `onAgentUpdate` — upserts into `agentExecutions` by `agent_id`; if `agent_id === "intent_classifier"` and completed, sets `detectedIntent`.

**Backend counterpart**: `WS /chat/{chatbot_id}/ws` — accepts via `manager.connect()`, loops `websocket.receive_json()`, enforces rate/message limits, streams via `stream_query()` (emitting `agent_update` per node), sends the final `manager.send_response(...)` frame.

**UI render chain**: `messages`/`agentExecutions`/`isLoading`/`isStreaming` flow into `MessageList` → `MessageBubble` per message (markdown via `react-markdown`, `SourceFooter` citations, `AgentExecutionCard` pills), auto-scrolling on new messages or when already near the bottom.

---

## 19. Pipeline: document upload flow (frontend)

**Knowledge Base tab** — `(auth)/chatbot/[chatbotId]/knowledge-base/page.tsx`:
1. "Add Source" click → hidden `<input type="file" multiple>` via ref.
2. `handleFileUpload(e)` per file: optimistic temp `Document` (`status:'processing'`) prepended to local state; `documentApi.upload(chatbotId, file)` → `FormData` → `POST /api/chatbots/{chatbotId}/documents` (multipart) → proxied by `app/api/[...path]/route.ts` to the FastAPI backend. Success replaces the temp id with the real `document_id`; failure marks `status:'error'`.
3. A `setInterval` poll (every 2000ms) re-fetches `documentApi.list(chatbotId)` while any document/url is still `processing`, remapping backend status (`completed`/`processing`/other→`error`) into the UI — this is how the indexed/chunk-count badge appears without a websocket.
4. Rendered by `DocumentList` — status badge, chunk count, Delete/Retry (`onRetry` is currently a client-only fake, not a real re-upload).

**URL / crawl path**: single URL → `documentApi.addUrl` → `POST /urls`. Whole-site crawl via `WebsiteCrawlFlow` → `documentApi.crawlUrl` → `POST /urls/crawl` (returns discovered pages) → user selects → `documentApi.scrapeUrls` → `POST /urls/scrape` → `onComplete` re-lists documents.

**Text path**: `documentApi.addText` → `POST /text`.

**Inconsistent secondary uploader**: `components/documents/DocumentUpload.tsx` (used only inside the standalone `/chat` page) posts directly to `fetch('/api/documents/upload', ...)` — chatbot-agnostic, simulated progress (`setTimeout` stage transitions), disconnected from `documentApi` and from real per-chatbot scoping.

---

## 20. Shared packages

### `packages/shared-ui/src/`

Exports (`src/index.ts`): `WidgetChatSurface`, `DEFAULT_WIDGET_SETTINGS`, `normalizeWidgetSettings`, `WidgetSurfaceSettings`, `MessageList`, `MessageBubble`, `SourceFooter`, `AgentExecutionCard`, `ScrollArea`/`ScrollBar`, `useChat`, `useWebSocket`.

- **`WidgetChatSurface.tsx`** — the complete self-contained floating chat widget (launcher bubble + panel: header, `MessageList`, inline input+send). Fully inline-styled (works without Tailwind on the host page); CSS variable `--primary` from `settings.primaryColor` via `hexToHslTriplet`. Consumes `useChat` internally. `sessionId`: preview mode uses the passed prop (or `preview-{chatbotId}`); real embeds call `getOrCreateVisitorSessionId(chatbotId)` (localStorage-persisted per-visitor id); "new chat" rotates/generates a fresh id + `clearMessages()`. Exports `normalizeWidgetSettings()` (backend snake_case → frontend camelCase). Also owns `useEnsureWebfontLoaded(fontFamily)` — injects a Google Fonts `<link>` for the selected widget font (Inter/Roboto/Open Sans/Lato; `SF Pro` is a native system font with no webfont entry), deduped via a `data-rag-widget-font` attribute, so non-default font choices actually render on real third-party embeds (previously silently fell back to a system font). Consumed by: `app/widget/[chatbotId]/page.tsx`, `customization/page.tsx` (live preview), `embed/page.tsx` (read-only preview), and `packages/widget/src/main.tsx`.
- **`MessageList.tsx`** — scrollable list, empty-state quick-actions, renders `MessageBubble` + `AgentExecutionCard` pills, typing indicator, smart auto-scroll.
- **`MessageBubble.tsx`** — markdown rendering (`react-markdown`, custom code/link/blockquote/table renderers), copy-to-clipboard, suggested-question chips, intent/confidence meta row, `SourceFooter`.
- **`SourceFooter.tsx`** — dedupes and renders compact citation chips (document vs. web, "+N more").
- **`AgentExecutionCard.tsx`** — pill badge per agent execution (running/completed/failed) with execution time.
- **`hooks/useChat.ts` / `hooks/useWebSocket.ts`** — see §18.
- **`utils.ts`** — `cn()`, visitor-session-id helpers, `formatTimestamp`, `formatExecutionTime`, `hexToHslTriplet`.
- **`styles.css`** — imported by both `frontend/src/app/layout.tsx` and `packages/widget/src/main.tsx` via a plain relative import (not the package's subpath export) — a documented workaround for Next's webpack CSS pipeline not reliably resolving subpath exports across symlinked npm workspaces.

This package is the single source of truth for chat rendering — a change here affects the dashboard, the standalone widget build, and the public `/widget/[chatbotId]` page simultaneously.

### `packages/widget/`

Builds a standalone, dependency-free `<script>` bundle (`widget.js`) any external site can embed without running Next.js.

- **`src/main.tsx`** — reads `window.RAGChatbot = {chatbotId, apiBaseUrl?}` (set by the host page before the script tag, per the snippet generated in `embed/page.tsx`), fetches `GET {apiBaseUrl}/chatbots/{chatbotId}/customization`, normalizes via `normalizeWidgetSettings`, creates `<div id="rag-chatbot-widget-root" class="rag-widget-root">` appended to `document.body`, `createRoot(mount).render(<WidgetChatSurface .../>)`. Runs on `DOMContentLoaded` if the document is still loading, else immediately.
- **`vite.config.ts`** — builds `src/main.tsx` as an IIFE library (`formats: ['iife']`, output `dist/widget.js`), using `vite-plugin-css-injected-by-js` so compiled Tailwind CSS is inlined into the JS bundle (one `<script>` tag, no separate stylesheet).
- **`postcss.config.js`** — Tailwind + Autoprefixer + `postcss-prefix-selector`, scoping every compiled selector under `.rag-widget-root` so widget styles never leak onto the host page and vice versa (special-cases `:root`/`html`/`body`/`.dark`).
- **`package.json`** — `@ragchatbot/widget`, depends on `@ragchatbot/shared-ui` + `@ragchatbot/shared-types` as workspace packages; `react`/`react-dom` as regular (not peer) deps since the bundle must be fully self-contained.
- The built `dist/widget.js` is copied to `frontend/public/widget.js`, served same-origin from the Next.js app at `/widget.js` — the URL referenced in the embed snippet built by `embed/page.tsx`.

---

## 21. WebSocket contract

All client-side WS logic lives in `packages/shared-ui/src/hooks/useWebSocket.ts` — the only WebSocket client in the repo.

- **Connect URL**: `${wsBaseUrl}/chat/{chatbotId}/ws?session_id={sessionId}`, where `wsBaseUrl` is derived from `apiBaseUrl` (widget) or `window.location` (dashboard). Matches backend route `@router.websocket("/chat/{chatbot_id}/ws")`.
- **Message handling**: `ws.onmessage` parses JSON, invokes the generic `onMessage` callback, special-cases `type === "agent_update"` for `onAgentUpdate`. All other type branching (`chat_chunk`/`chat_complete`/`error`/`response`/`done`) happens one layer up in `useChat` (§18).
- **Sending**: `sendMessage(message)` calls `.send(JSON.stringify(message))` only if `readyState === WebSocket.OPEN`; otherwise logs a warning and drops the message — no queueing.
- **Reconnection**: on `onclose`, reconnects only if not intentional and close code isn't 1000/1001, up to 5 attempts, exponential backoff `1000ms * 2^attempt`. `disconnect()` maxes out the attempt counter and closes with code 1000.
- **Duplicate-connection guard**: `connect()` no-ops if already `CONNECTING`, force-closes any existing `OPEN` socket (marked intentional) before opening a new one — handles chatbotId/sessionId changes.
- Consumed exclusively by `useChat.ts`.
