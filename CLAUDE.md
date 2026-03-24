# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A multi-agent RAG (Retrieval-Augmented Generation) chatbot built with FastAPI, LangGraph, and Next.js 14. The system uses an agent orchestration pattern where queries are classified, routed through appropriate agents, and responses are synthesized from multiple sources (documents, web search, OCR, URLs).

**Core Architecture:**
- LangGraph StateGraph for agent orchestration
- Agent Registry pattern with auto-registration via `@register_agent` decorator
- Intent-based routing (DOCUMENT_SEARCH, WEB_SEARCH, OCR, URL_PROCESS, COMPLEX)
- Plan generation/validation for complex multi-step queries
- PostgreSQL for conversation memory/checkpointing
- Milvus for vector embeddings
- Redis for caching
- WebSocket streaming for real-time agent execution updates

## Development Commands

### Docker (Full Stack)
```bash
# Start all services (Postgres, Milvus, Redis, Backend, Frontend)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down
```

### Backend Only (with uv)
```bash
cd backend
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uv pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Only (Next.js)
```bash
cd frontend
npm install
npm run dev
```

### Infrastructure Only (for local backend dev)
```bash
docker-compose up -d postgres milvus-standalone etcd minio redis
```

## Agent System Architecture

### Agent Registration
All agents auto-register via the `@register_agent` decorator in `backend/agents/base/base_agent.py`:

```python
@register_agent(
    agent_id="my_agent",
    name="My Agent",
    capabilities=["task1", "task2"],
    description="Description of what the agent does"
)
class MyAgent(BaseAgent):
    async def execute(self, state: RAGState) -> RAGState:
        # Agent implementation
        return state
```

### Agent Flow
1. **Entry**: All queries start at `intent_classifier` agent
2. **Routing**: `route_by_intent()` in `graph/edges.py` directs to next agent
3. **Execution**: Each agent updates state via `update_agent_execution()`
4. **Conditional Edges**: Agents like `reranker` and `response_synthesis` use conditional routing
5. **Exit**: `check_final_response()` decides whether to end or retry

### Key State Fields (RAGState)
- `query`: Original user query
- `intent`: Classified intent type
- `plan`: Generated execution plan (for complex queries)
- `documents/web_results/ocr_results/url_results`: Retrieved data
- `reranked_results`: Results after BAAI reranking
- `final_response`: Synthesized response
- `agent_executions`: Tracking list of all agent runs
- `session_id`: Conversation identifier

### Agent Categories

**Orchestration Agents** (`backend/agents/orchestration/`):
- `intent_classifier`: Classifies query intent using Gemini
- `plan_generator`: Creates execution plan for complex queries
- `plan_validator`: Validates generated plans

**Execution Agents** (`backend/agents/execution/`):
- `document_search`: Searches Milvus vector DB
- `web_search`: Queries Tavily API
- `ocr`: Extracts text via PaddleOCR
- `url_processing`: Processes web content
- `reranker`: Reranks results with BAAI reranker
- `response_synthesis`: Generates final response using Gemini

## Service Layer

All services are class-based in `backend/services/`:
- `GeminiService`: LLM calls
- `MilvusService`: Vector DB operations (3 embedding models: bge-small, bge-large, stella)
- `TavilyService`: Web search
- `PaddleOCRService`: OCR processing
- `BaaiRerankerService`: Result reranking
- `RedisService`: Caching
- `PostgresService`: Database operations
- `SessionManager`: Session management

## Environment Variables (.env)

Required in `.env`:
- `GEMINI_API_KEY`: Google Gemini API key
- `TAVILY_API_KEY`: Tavily web search API key
- `POSTGRES_URL`: PostgreSQL connection string
- `MILVUS_HOST`/`MILVUS_PORT`: Milvus vector DB
- `REDIS_URL`: Redis connection

## Frontend Structure (Next.js 14)

- **App Router**: `frontend/src/app/`
- **Components**:
  - `chat/`: Chat interface with WebSocket streaming
  - `agents/`: Agent list and workflow graph visualization
  - `documents/`: Document upload UI
  - `ui/`: Shadcn/ui base components
- **State**: Zustand for client state
- **Styling**: Tailwind CSS

## Graph Modification

When adding new agents:

1. Create agent class with `@register_agent` decorator
2. Import in `backend/agents/__init__.py` to trigger registration
3. Add routing logic in `graph/edges.py` if needed
4. Add node/edge in `graph/rag_graph.py` `build_rag_graph()`

Graph visualization available at `/agents` route or via `get_graph_visualization()`.

## WebSocket Streaming

Real-time agent execution updates sent via WebSocket (`/chat/ws`). Messages include:
- Agent start/completion
- Execution status updates
- Partial results
- Error states

## Document Processing

Documents are:
1. Uploaded via `/documents` endpoint
2. Processed by `DocumentProcessor` service
3. Split into chunks (configurable via `CHUNK_SIZE`, `CHUNK_OVERLAP`)
4. Embedded using 3 models simultaneously
5. Stored in Milvus with metadata
6. Retrieved during document_search queries

## Testing

Health check: `curl http://localhost:8000/health`
API docs: `http://localhost:8000/docs`
Chat endpoint: `POST /chat` or WebSocket `/chat/ws`

## Code Review Guidelines

### Dependency Conflicts to Watch

**Backend (`requirements.txt`):**
- `pydantic` must be `>=2.7.0` (pydantic-settings requires this)
- `pydantic-settings` must be `>=2.3.0`
- FastAPI 0.104.1 is compatible with pydantic 2.7.x
- Always verify related package versions are compatible

**Frontend (`package.json`):**
- Watch for TypeScript errors from duplicate object properties: `{ prop: x.prop, ...x }`
- Check Next.js 14 specific dependencies

### Common Issues Found

| Issue | File | Fix |
|-------|------|-----|
| Duplicate object spread properties | `frontend/src/hooks/useChat.ts` | Use `{ ...update, override: value }` not `{ prop: x.prop, ...x }` |
| Pydantic version conflict | `requirements.txt` | Use `pydantic>=2.7.0,<3.0.0` |
| Hardcoded API keys | `api/routes/integration.py` | Use `settings.integration_api_key` |
| CORS too permissive | `main.py` | Use `settings.cors_origins` |

### Code Review Checklist

When reviewing this codebase, always check:
1. **Backend dependencies**: Version compatibility in `requirements.txt`
2. **Frontend TypeScript**: Object spread patterns for duplicates
3. **Environment variables**: All secrets use settings, not hardcoded
4. **Docker configuration**: Build contexts match actual directories
5. **API security**: No hardcoded credentials or default API keys
