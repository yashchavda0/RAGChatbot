# RAG Chatbot - System Architecture Document

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Component Diagram](#2-component-diagram)
3. [Agent Flow Diagram](#3-agent-flow-diagram)
4. [Data Flow Diagram](#4-data-flow-diagram)
5. [Infrastructure Diagram](#5-infrastructure-diagram)
6. [Service Layer Architecture](#6-service-layer-architecture)

---

## 1. System Overview

The RAG Chatbot is a multi-agent Retrieval-Augmented Generation system built with **FastAPI**, **LangGraph**, and **Next.js 14**. It orchestrates multiple specialized agents through a state graph to process user queries, retrieve information from various sources, and synthesize comprehensive responses.

### Key Architectural Patterns

| Pattern | Implementation |
|---------|---------------|
| **Agent Registry** | Decorator-based auto-registration (`@register_agent`) |
| **State Graph** | LangGraph StateGraph for workflow orchestration |
| **Intent-Based Routing** | Queries classified and routed to appropriate agents |
| **Multi-Model Embeddings** | 3 embedding models (bge-small, bge-large, stella) |
| **Checkpointing** | PostgreSQL-based conversation memory |
| **Real-time Streaming** | WebSocket for agent execution updates |

### Technology Stack

```
+------------------+-------------------+------------------+
|     Layer        |    Technology     |     Purpose      |
+------------------+-------------------+------------------+
| Frontend         | Next.js 14        | UI/UX            |
|                  | Zustand           | State Management |
|                  | Tailwind CSS      | Styling          |
|                  | Shadcn/ui         | UI Components    |
+------------------+-------------------+------------------+
| Backend          | FastAPI           | REST API         |
|                  | LangGraph         | Agent Orchestration|
|                  | Pydantic          | Validation       |
+------------------+-------------------+------------------+
| AI/ML Services   | Google Gemini     | LLM Generation   |
|                  | SentenceTransformers| Embeddings     |
|                  | BAAI Reranker     | Result Ranking   |
|                  | PaddleOCR         | Text Extraction  |
+------------------+-------------------+------------------+
| Data Stores      | PostgreSQL        | Conversations    |
|                  | Milvus            | Vector Search    |
|                  | Redis             | Caching          |
+------------------+-------------------+------------------+
| External APIs    | Tavily            | Web Search       |
+------------------+-------------------+------------------+
```

---

## 2. Component Diagram

```
+============================================================================+
|                              RAG CHATBOT SYSTEM                            |
+============================================================================+

+----------------------------------------------------------------------------+
|                            PRESENTATION LAYER                               |
+----------------------------------------------------------------------------+
|  +-------------------+    +-------------------+    +-------------------+   |
|  |   Next.js 14      |    |   Chat Component  |    |  Agent Graph Viz  |   |
|  |   App Router      |    |   WebSocket       |    |  (D3/React Flow)  |   |
|  +-------------------+    +-------------------+    +-------------------+   |
|            |                       |                        |               |
|            +-----------------------+------------------------+               |
|                                    |                                        |
+------------------------------------|----------------------------------------+
                                     | HTTP/WebSocket
+------------------------------------|----------------------------------------+
|                            API GATEWAY LAYER                                |
+------------------------------------|----------------------------------------+
|  +-------------------+    +-------------------+    +-------------------+   |
|  |  /chat            |    |  /chat/ws         |    |  /documents       |   |
|  |  REST Endpoint    |    |  WebSocket Stream |    |  Upload Endpoint  |   |
|  +-------------------+    +-------------------+    +-------------------+   |
|            |                       |                        |               |
|  +-------------------+    +-------------------+    +-------------------+   |
|  |  /agents          |    |  /health          |    |  /integration     |   |
|  |  Agent Registry   |    |  Health Check     |    |  External API     |   |
|  +-------------------+    +-------------------+    +-------------------+   |
|                                    |                                        |
+------------------------------------|----------------------------------------+
                                     |
+------------------------------------|----------------------------------------+
|                         ORCHESTRATION LAYER                                 |
+------------------------------------|----------------------------------------+
|  +---------------------------------------------------------------------+   |
|  |                     LANGGRAPH STATEGRAPH                            |   |
|  |  +-------------------+    +-------------------+                    |   |
|  |  | Intent Classifier |--->| Plan Generator    |                    |   |
|  |  | (Entry Point)     |    | (Complex Queries) |                    |   |
|  |  +-------------------+    +-------------------+                    |   |
|  |           |                        |                                |   |
|  |           v                        v                                |   |
|  |  +---------------------------------------------------------------+   |   |
|  |  |                    ROUTING EDGES                              |   |   |
|  |  |  route_by_intent | validate_plan_route | should_rerank       |   |   |
|  |  +---------------------------------------------------------------+   |   |
|  +---------------------------------------------------------------------+   |
|                                    |                                        |
+------------------------------------|----------------------------------------+
                                     |
+------------------------------------|----------------------------------------+
|                           AGENT LAYER                                       |
+------------------------------------|----------------------------------------+
|  +---------------------------+    +---------------------------+              |
|  |    ORCHESTRATION AGENTS   |    |     EXECUTION AGENTS      |              |
|  +---------------------------+    +---------------------------+              |
|  | intent_classifier         |    | document_search           |              |
|  | plan_generator            |    | web_search                |              |
|  | plan_validator            |    | ocr                       |              |
|  |                           |    | url_processing            |              |
|  |                           |    | reranker                  |              |
|  |                           |    | response_synthesis        |              |
|  +---------------------------+    +---------------------------+              |
|                                    |                                        |
+------------------------------------|----------------------------------------+
                                     |
+------------------------------------|----------------------------------------+
|                           SERVICE LAYER                                     |
+------------------------------------|----------------------------------------+
|  +-------------------+    +-------------------+    +-------------------+   |
|  | GeminiService     |    | MilvusService     |    | TavilyService     |   |
|  | - generate()      |    | - search()        |    | - search()        |   |
|  | - chat()          |    | - insert()        |    | - search_with_    |   |
|  | - stream_         |    | - delete()        |    |   answer()        |   |
|  |   generate()      |    |                   |    |                   |   |
|  +-------------------+    +-------------------+    +-------------------+   |
|  +-------------------+    +-------------------+    +-------------------+   |
|  | EmbeddingService  |    | BAARerankerService|    | PaddleOCRService  |   |
|  | - embed_text()    |    | - rerank()        |    | - extract_text()  |   |
|  | - embed_query()   |    |                   |    |                   |   |
|  | - embed_docs()    |    |                   |    |                   |   |
|  +-------------------+    +-------------------+    +-------------------+   |
|  +-------------------+    +-------------------+    +-------------------+   |
|  | RedisService      |    | PostgresService   |    | SessionManager    |   |
|  | - get/set/del     |    | - CRUD ops        |    | - session mgmt    |   |
|  | - cache           |    | - migrations      |    | - history         |   |
|  +-------------------+    +-------------------+    +-------------------+   |
|                                    |                                        |
+------------------------------------|----------------------------------------+
                                     |
+------------------------------------|----------------------------------------+
|                          INFRASTRUCTURE LAYER                               |
+------------------------------------|----------------------------------------+
|  +-------------------+    +-------------------+    +-------------------+   |
|  |    PostgreSQL     |    |      Milvus       |    |      Redis        |   |
|  |    Port: 5432     |    |  Port: 19530      |    |   Port: 6379      |   |
|  |                   |    |                   |    |                   |   |
|  | - Conversations   |    | - Vector Index    |    | - Session Cache   |   |
|  | - Checkpoints     |    | - Embeddings      |    | - Query Cache     |   |
|  | - Sessions        |    | - Metadata        |    | - Rate Limiting   |   |
|  +-------------------+    +-------------------+    +-------------------+   |
|  +-------------------+    +-------------------+                           |
|  |      etcd         |    |      MinIO        |                           |
|  |  (Milvus Meta)    |    | (Milvus Storage)  |                           |
|  +-------------------+    +-------------------+                           |
+----------------------------------------------------------------------------+

+----------------------------------------------------------------------------+
|                          EXTERNAL SERVICES                                  |
+----------------------------------------------------------------------------+
|  +-------------------+    +-------------------+                            |
|  |   Google Gemini   |    |      Tavily       |                            |
|  |      API          |    |   Web Search API  |                            |
|  +-------------------+    +-------------------+                            |
+----------------------------------------------------------------------------+
```

---

## 3. Agent Flow Diagram

### 3.1 LangGraph StateGraph Structure

```mermaid
graph TD
    START([START]) --> IC[intent_classifier]

    IC -->|route_by_intent| ROUTING{Intent Router}

    ROUTING -->|DOCUMENT_SEARCH| DS[document_search]
    ROUTING -->|WEB_SEARCH| WS[web_search]
    ROUTING -->|OCR| OCR[ocr]
    ROUTING -->|URL_PROCESS| URL[url_process]
    ROUTING -->|COMPLEX/low confidence| PG[plan_generator]

    PG --> PV[plan_validator]
    PV -->|validate_plan_route| PLANCHECK{Valid Plan?}
    PLANCHECK -->|execute_plan| DS
    PLANCHECK -->|regenerate_plan<br/>max 2 retries| PG

    DS -->|should_rerank| RERANKCHECK1{Need Rerank?}
    WS -->|should_rerank| RERANKCHECK2{Need Rerank?}

    RERANKCHECK1 -->|yes| RERANKER[reranker]
    RERANKCHECK1 -->|no| RS[response_synthesis]
    RERANKCHECK2 -->|yes| RERANKER
    RERANKCHECK2 -->|no| RS

    OCR --> RERANKER
    URL --> RERANKER
    RERANKER --> RS

    RS -->|check_final_response| FINALCHECK{Has Response?}
    FINALCHECK -->|yes| END([END])
    FINALCHECK -->|no| RERANKER

    style IC fill:#e1f5fe
    style DS fill:#fff3e0
    style WS fill:#fff3e0
    style OCR fill:#fff3e0
    style URL fill:#fff3e0
    style RERANKER fill:#f3e5f5
    style RS fill:#e8f5e9
    style PG fill:#fce4ec
    style PV fill:#fce4ec
```

### 3.2 Detailed Agent Flow (ASCII)

```
                              +-----------------+
                              |     START       |
                              +--------+--------+
                                       |
                                       v
                     +---------------------------------+
                     |       INTENT_CLASSIFIER         |
                     |  (Entry Point - All Queries)    |
                     +---------------------------------+
                                       |
                    +------------------+------------------+
                    |  Classifies: DOCUMENT_SEARCH,      |
                    |  WEB_SEARCH, OCR, URL_PROCESS,     |
                    |  COMPLEX + confidence score        |
                    +------------------+------------------+
                                       |
                                       v
                     +---------------------------------+
                     |         route_by_intent()       |
                     |  Low confidence (<0.5) -> plan  |
                     +---------------------------------+
                                       |
           +------------+--------------+--------------+-------------+
           |            |              |              |             |
           v            v              v              v             v
    +-----------+ +-----------+ +-----------+ +-----------+ +-----------+
    | DOCUMENT  | |   WEB     | |    OCR    | |    URL    | |   PLAN    |
    |  SEARCH   | |  SEARCH   | |           | | PROCESS   | | GENERATOR |
    +-----------+ +-----------+ +-----------+ +-----------+ +-----------+
           |            |              |              |             |
           |            |              |              |             v
           |            |              |              |      +-----------+
           |            |              |              |      |   PLAN    |
           |            |              |              |      | VALIDATOR |
           |            |              |              |      +-----------+
           |            |              |              |             |
           |            |              |              |      +------+------+
           |            |              |              |      |             |
           |            |              |              |      v             v
           |            |              |              |   (valid)      (invalid)
           |            |              |              |      |             |
           |            |              |              |      |      (retry < 2)
           |            |              |              |      |             |
           v            v              v              v      |             |
    +-----------------------------------------------------------------------+
    |                       should_rerank()                                  |
    |  Condition: total_results > 5 OR (documents > 0 AND web_results > 0)   |
    +-----------------------------------------------------------------------+
                    |
           +--------+--------+
           |                 |
           v                 v
    +-----------+     +-----------+
    |  RERANKER |     |  RESPONSE |
    | (BAAI)    |---->|SYNTHESIS  |
    +-----------+     +-----------+
                             |
                    +--------+--------+
                    | check_final_    |
                    | response()      |
                    +--------+--------+
                             |
              +--------------+-------------+
              |                            |
              v                            v
       +------------+               +------------+
       |    END     |               |  RERANKER  |
       | (Response  |               |  (retry)   |
       |  Ready)    |               +------------+
       +------------+
```

### 3.3 Agent Registry Pattern

```
+-----------------------------------------------------------------------+
|                        AGENT REGISTRY SYSTEM                          |
+-----------------------------------------------------------------------+
|                                                                       |
|   @register_agent(                                                    |
|       agent_id="document_search",                                     |
|       name="Document Search",                                         |
|       capabilities=["search", "milvus", "documents"],                 |
|       description="Searches uploaded documents"                       |
|   )                                                                   |
|   class DocumentSearchAgent(BaseAgent):                               |
|       async def execute(self, state: RAGState) -> RAGState:           |
|           ...                                                         |
|                                                                       |
+-----------------------------------------------------------------------+
                              |
                              v
+-----------------------------------------------------------------------+
|                         AgentRegistry                                 |
+-----------------------------------------------------------------------+
|  _agents: Dict[str, BaseAgent]                                        |
|  _agent_classes: Dict[str, type]                                      |
|                                                                       |
|  + register(agent_id, instance, class)                                |
|  + get_agent(agent_id) -> BaseAgent                                   |
|  + list_agents() -> List[str]                                         |
|  + list_agents_by_capability(cap) -> List[str]                        |
|  + get_all_nodes() -> Dict[str, Callable]  <-- LangGraph nodes        |
|  + get_node(agent_id) -> Callable                                      |
+-----------------------------------------------------------------------+
```

### 3.4 RAGState Structure

```
+-----------------------------------------------------------------------+
|                            RAGState                                   |
+-----------------------------------------------------------------------+
| CORE FIELDS                                                           |
| ----------------------                                                |
| messages: List[Dict]        # Conversation history                    |
| query: str                  # Original user query                     |
|                                                                       |
| INTENT CLASSIFICATION                                                 |
| ----------------------                                                |
| intent: str                 # DOCUMENT_SEARCH, WEB_SEARCH, etc.       |
| intent_confidence: float    # Classification confidence (0-1)         |
|                                                                       |
| PLAN (Complex Queries)                                                |
| ----------------------                                                |
| plan: Dict                  # Execution plan with nodes/edges         |
| plan_validated: bool        # Validation status                       |
| plan_validation_notes: str  # Validation feedback                     |
|                                                                       |
| EXECUTION RESULTS                                                     |
| ----------------------                                                |
| documents: List[Dict]       # Milvus search results                   |
| web_results: List[Dict]     # Tavily search results                   |
| ocr_results: List[Dict]     # PaddleOCR extracted text                |
| url_results: List[Dict]     # Processed URL content                   |
| reranked_results: List[Dict]# BAAI reranked results                   |
|                                                                       |
| RESPONSE                                                              |
| ----------------------                                                |
| final_response: str         # Synthesized response                    |
| response_sources: List[Dict]# Cited sources                           |
|                                                                       |
| TRACKING                                                              |
| ----------------------                                                |
| agent_executions: List[Dict]# All agent execution records             |
| current_agent: str          # Currently running agent                 |
| session_id: str             # Session identifier                      |
| request_id: str             # Request tracking ID                     |
| error: str                  # Error message if any                    |
| retry_count: int            # Number of retries                       |
+-----------------------------------------------------------------------+
```

---

## 4. Data Flow Diagram

### 4.1 Query Processing Flow

```
+==========================================================================+
|                         QUERY PROCESSING FLOW                             |
+==========================================================================+

USER                                                                          USER
  |                                                                             |
  |  1. POST /chat {"message": "...", "session_id": "..."}                      |
  v                                                                             |
+-----------------+                                                            |
|   Next.js UI    |                                                            |
|  (ChatPanel)    |                                                            |
+--------+--------+                                                            |
         |                                                                      |
         |  2. HTTP Request / WebSocket                                        |
         v                                                                      |
+-----------------+       +------------------+       +-----------------+        |
|    FastAPI      |       | Session Manager  |       |    Redis        |        |
|    Backend      |------>| (get/create)     |------>|   (Cache)       |        |
+--------+--------+       +------------------+       +-----------------+        |
         |                                                                      |
         |  3. Create Initial State                                             |
         v                                                                      |
+-----------------+                                                            |
|  RAGState       |                                                            |
|  - query        |                                                            |
|  - session_id   |                                                            |
|  - request_id   |                                                            |
+--------+--------+                                                            |
         |                                                                      |
         |  4. Invoke LangGraph                                                 |
         v                                                                      |
+-----------------+       +------------------+       +-----------------+        |
| LangGraph       |------>| PostgreSQL       |------>| Checkpointer    |        |
| StateGraph      |       | (AsyncPostgres)  |       | (Memory)        |        |
+--------+--------+       +------------------+       +-----------------+        |
         |                                                                      |
         |  5. Execute Agent Flow                                               |
         v                                                                      |
+-----------------+                                                            |
| Intent          |  <-- GeminiService.classify()                              |
| Classifier      |                                                            |
+--------+--------+                                                            |
         |                                                                      |
         |  6. Route by Intent                                                  |
         v                                                                      |
    +----+----+----+----+----+                                                 |
    |    |    |    |    |    |                                                 |
    v    v    v    v    v    v                                                 |
+--------------------------------------------------------------------------+  |
|                        EXECUTION AGENTS                                   |  |
+--------------------------------------------------------------------------+  |
|                                                                          |  |
|  +----------------+     +----------------+     +----------------+         |  |
|  | Document Search|     |  Web Search    |     |      OCR       |         |  |
|  |                |     |                |     |                |         |  |
|  | EmbeddingService|    | TavilyService  |     | PaddleOCRService|        |  |
|  |       |        |     |       |        |     |       |        |         |  |
|  |       v        |     |       v        |     |       v        |         |  |
|  | MilvusService  |     | tavily-python  |     | paddleocr      |         |  |
|  +----------------+     +----------------+     +----------------+         |  |
|                                                                          |  |
|  +----------------+                                                      |  |
|  | URL Processing |                                                      |  |
|  |                |                                                      |  |
|  | aiohttp + BS4  |                                                      |  |
|  +----------------+                                                      |  |
|                                                                          |  |
+--------------------------------------------------------------------------+  |
         |                                                                      |
         |  7. Combine & Rerank Results                                        |
         v                                                                      |
+-----------------+       +------------------+                                 |
|    Reranker     |------>| BAAI Reranker    |                                 |
|                 |       | baai-bge-reranker|                                 |
+--------+--------+       +------------------+                                 |
         |                                                                      |
         |  8. Synthesize Response                                              |
         v                                                                      |
+-----------------+       +------------------+                                 |
|    Response     |------>| GeminiService    |                                 |
|    Synthesis    |       | - generate()     |                                 |
+--------+--------+       +------------------+                                 |
         |                                                                      |
         |  9. Return Final State                                               |
         v                                                                      |
+-----------------+                                                            |
|    RAGState     |                                                            |
|  - final_response|                                                           |
|  - response_sources|                                                         |
|  - agent_executions|                                                         |
+--------+--------+                                                            |
         |                                                                      |
         |  10. Save to History                                                 |
         v                                                                      |
+-----------------+       +------------------+                                 |
| Session Manager |------>| PostgreSQL       |                                 |
| add_message()   |       | (Conversations)  |                                 |
+-----------------+       +------------------+                                 |
         |                                                                      |
         |  11. Return Response                                                 |
         v                                                                      |
+-----------------+                                                            |
|   ChatResponse  |------------------------------------------------------------+
|  - response     |
|  - sources      |
|  - agent_execs  |
+-----------------+
```

### 4.2 Document Upload Flow

```
+==========================================================================+
|                        DOCUMENT UPLOAD FLOW                               |
+==========================================================================+

USER                                                                          USER
  |                                                                             |
  |  1. POST /documents (multipart/form-data)                                   |
  v                                                                             |
+-----------------+                                                            |
|   Next.js UI    |                                                            |
| (UploadPanel)   |                                                            |
+--------+--------+                                                            |
         |                                                                      |
         v                                                                      |
+-----------------+                                                            |
|    FastAPI      |                                                            |
| /documents      |                                                            |
+--------+--------+                                                            |
         |                                                                      |
         |  2. Validate File                                                    |
         v                                                                      |
+-----------------+                                                            |
| Document        |                                                            |
| Processor       |                                                            |
| - extract_text  |                                                            |
| - chunk_text    |                                                            |
+--------+--------+                                                            |
         |                                                                      |
         |  3. Generate Chunks (CHUNK_SIZE=512, CHUNK_OVERLAP=50)               |
         v                                                                      |
+-----------------+                                                            |
| TextSplitter    |                                                            |
| (RecursiveChar) |                                                            |
+--------+--------+                                                            |
         |                                                                      |
         |  4. Generate Embeddings (All 3 Models)                               |
         v                                                                      |
+-----------------+                                                            |
| EmbeddingService|                                                            |
| - bge-small-en  |  384 dim                                                    |
| - bge-large-en  | 1024 dim                                                    |
| - stella-base   |  768 dim                                                    |
+--------+--------+                                                            |
         |                                                                      |
         |  5. Store in Milvus                                                  |
         v                                                                      |
+-----------------+                                                            |
| MilvusService   |                                                            |
| insert_embeddings()                                                         |
| - Pad to max_dim (1024)                                                      |
| - Store with metadata                                                        |
+-----------------+                                                            |
         |                                                                      |
         |  6. Return Confirmation                                              |
         v                                                                      |
+-----------------+------------------------------------------------------------+
| DocumentResponse|
| - document_id   |
| - chunks_created|
+-----------------+
```

### 4.3 WebSocket Streaming Flow

```
+==========================================================================+
|                     WEBSOCKET STREAMING FLOW                              |
+==========================================================================+

CLIENT                                                          CLIENT
  |                                                                           |
  |  1. Connect ws://localhost:8000/chat/ws?session_id=...                    |
  v                                                                           |
+-----------------+                                                          |
| WebSocket       |                                                          |
| Connection      |                                                          |
+--------+--------+                                                          |
         |                                                                    |
         |  2. Send Message                                                   |
         v                                                                    |
+-----------------+                                                          |
| {"message":     |                                                          |
|  "What is AI?"} |                                                          |
+--------+--------+                                                          |
         |                                                                    |
         |  3. stream_query()                                                 |
         v                                                                    |
+-----------------+                                                          |
| LangGraph       |                                                          |
| astream()       |                                                          |
+--------+--------+                                                          |
         |                                                                    |
         |  4. Stream Events                                                  |
         v                                                                    |
+-------------------------------------------------------------------------+ |
|                                                                          | |
|  +-- Agent Start Event --+                                               | |
|  | {                      |                                               | |
|  |   "type": "agent",     |                                               | |
|  |   "agent_id": "intent_ |                                               | |
|  |   "status": "running"  |                                               | |
|  | }                      |                                               | |
|  +------------------------+                                               | |
|                                                                          | |
|  +-- Agent Complete Event --+                                            | |
|  | {                         |                                            | |
|  |   "type": "agent",        |                                            | |
|  |   "agent_id": "intent_    |                                            | |
|  |   "status": "completed",  |                                            | |
|  |   "output": {...}         |                                            | |
|  | }                         |                                            | |
|  +---------------------------+                                            | |
|                                                                          | |
|  +-- Progress Update --+                                                 | |
|  | {                    |                                                 | |
|  |   "type": "progress",|                                                 | |
|  |   "node": "reranker",|                                                 | |
|  |   "state": "executing"                                                | |
|  | }                    |                                                 | |
|  +---------------------+                                                 | |
|                                                                          | |
|  +-- Final Response --+                                                  | |
|  | {                   |                                                  | |
|  |   "type": "response",                                                  | |
|  |   "response": "...",                                                    | |
|  |   "sources": [...]                                                      | |
|  | }                   |                                                  | |
|  +---------------------+                                                  | |
|                                                                          | |
|  +-- Done Event --+                                                      | |
|  | {               |                                                      | |
|  |   "type": "done"                                                        | |
|  | }               |                                                      | |
|  +-----------------+                                                      | |
|                                                                          | |
+-------------------------------------------------------------------------+ |
         |                                                                    |
         |  5. UI Updates in Real-time                                        |
         v                                                                    |
+-----------------+                                                          |
|   Next.js UI    |----------------------------------------------------------+
|  - Agent Status |
|  - Progress Bar |
|  - Streaming    |
|    Response     |
+-----------------+
```

---

## 5. Infrastructure Diagram

### 5.1 Docker Compose Architecture

```
+============================================================================+
|                         DOCKER COMPOSE STACK                                |
+============================================================================+

+----------------------------------------------------------------------------+
|                              FRONTEND                                       |
|  +---------------------------------------------------------------------+   |
|  |                     rag-chatbot-frontend                             |   |
|  |                     Container: rag-chatbot-frontend                  |   |
|  |  +---------------------------------------------------------------+   |   |
|  |  |                      Next.js 14 App                           |   |   |
|  |  |                      Port: 3000                               |   |   |
|  |  +---------------------------------------------------------------+   |   |
|  |                                                                      |   |
|  |  Environment:                                                        |   |
|  |    NEXT_PUBLIC_API_URL=http://backend:8000                           |   |
|  |    NEXT_PUBLIC_WS_URL=ws://backend:8000                              |   |
|  +---------------------------------------------------------------------+   |
+----------------------------------------------------------------------------+
                                      |
                                      | depends_on
                                      v
+----------------------------------------------------------------------------+
|                              BACKEND                                        |
|  +---------------------------------------------------------------------+   |
|  |                     rag-chatbot-backend                              |   |
|  |                     Container: rag-chatbot-backend                   |   |
|  |  +---------------------------------------------------------------+   |   |
|  |  |                      FastAPI App                              |   |   |
|  |  |                      Port: 8000                               |   |   |
|  |  +---------------------------------------------------------------+   |   |
|  |                                                                      |   |
|  |  Environment:                                                        |   |
|  |    GEMINI_API_KEY=${GEMINI_API_KEY}                                  |   |
|  |    TAVILY_API_KEY=${TAVILY_API_KEY}                                  |   |
|  |    POSTGRES_URL=postgresql://raguser:***@postgres:5432/rag_chatbot   |   |
|  |    MILVUS_HOST=milvus-standalone                                     |   |
|  |    MILVUS_PORT=19530                                                 |   |
|  |    REDIS_URL=redis://redis:6379/0                                    |   |
|  +---------------------------------------------------------------------+   |
+----------------------------------------------------------------------------+
          |                    |                    |
          | depends_on         | depends_on         | depends_on
          v                    v                    v
+------------------+  +------------------+  +------------------+
|    PostgreSQL    |  |      Milvus      |  |      Redis       |
|  rag-postgres    |  | rag-milvus       |  |   rag-redis      |
|  Port: 5432      |  | Port: 19530      |  |  Port: 6379      |
+------------------+  +------------------+  +------------------+
                             |
                             | depends_on
                    +--------+--------+
                    |                 |
                    v                 v
             +------------+    +------------+
             |    etcd    |    |   MinIO    |
             |  rag-etcd  |    | rag-minio  |
             | Port: 2379 |    | Port: 9000 |
             +------------+    +------------+
```

### 5.2 Network Topology

```
+============================================================================+
|                         NETWORK TOPOLOGY                                    |
+============================================================================+

    +-------------------------------------------------------------------+
    |                        Docker Network                             |
    |                       (bridge: default)                          |
    +-------------------------------------------------------------------+
    |                                                                   |
    |   +------------------+         +------------------+               |
    |   |    Frontend      | :3000   |     Backend      | :8000         |
    |   |  172.x.x.2       |<------->|   172.x.x.3      |               |
    |   +------------------+         +------------------+               |
    |                                          |                        |
    |          +-------------------------------+------------------+     |
    |          |                               |                  |     |
    |          v                               v                  v     |
    |   +-------------+              +------------------+   +-------+   |
    |   |  PostgreSQL | :5432        |      Milvus      |   | Redis |   |
    |   | 172.x.x.4   |              |    172.x.x.5     |   |172.x.x|   |
    |   +-------------+              |  :19530, :9091   |   |  .6   |   |
    |                                +------------------+   +-------+   |
    |                                          |                        |
    |                        +-----------------+------------------+      |
    |                        |                                    |      |
    |                        v                                    v      |
    |                 +-------------+                      +-------+     |
    |                 |    etcd     | :2379                | MinIO |     |
    |                 | 172.x.x.7   |                      |:9000  |     |
    |                 +-------------+                      +-------+     |
    |                                                                   |
    +-------------------------------------------------------------------+
                                     |
                                     | External Access
                                     v
    +-------------------------------------------------------------------+
    |                         Host Machine                              |
    |                                                                   |
    |   localhost:3000 --> Frontend (Next.js UI)                        |
    |   localhost:8000 --> Backend (FastAPI API)                        |
    |   localhost:5432 --> PostgreSQL (Direct DB Access)               |
    |   localhost:6379 --> Redis (Direct Cache Access)                 |
    |   localhost:19530--> Milvus (Direct Vector DB Access)            |
    |                                                                   |
    +-------------------------------------------------------------------+
```

### 5.3 Volume Mounts

```
+============================================================================+
|                         PERSISTENT VOLUMES                                  |
+============================================================================+

+------------------+     +------------------+     +------------------+
|  postgres_data   |     |   milvus_data    |     |    etcd_data     |
+------------------+     +------------------+     +------------------+
| /var/lib/        |     | /var/lib/        |     | /etcd            |
|  postgresql/data |     |  milvus          |     |                  |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
+------------------+     +------------------+     +------------------+
|    PostgreSQL    |     |      Milvus      |     |      etcd        |
|  - Conversations |     |  - Vector Index  |     |  - Metadata      |
|  - Sessions      |     |  - Embeddings    |     |  - Config        |
|  - Checkpoints   |     |                  |     |                  |
+------------------+     +------------------+     +------------------+

+------------------+     +------------------+
|   minio_data     |     |   backend_data   |
+------------------+     +------------------+
| /minio_data      |     | /app/data        |
+------------------+     +------------------+
        |                        |
        v                        v
+------------------+     +------------------+
|      MinIO       |     |     Backend      |
|  - Milvus Storage|     |  - Uploads       |
|  - S3-compatible |     |  - Temp Files    |
+------------------+     +------------------+

+------------------+
|    redis_data    |
+------------------+
| /data            |
+------------------+
        |
        v
+------------------+
|      Redis       |
|  - Session Cache |
|  - Query Cache   |
|  - Rate Limits   |
+------------------+
```

---

## 6. Service Layer Architecture

### 6.1 Service Dependency Graph

```
+============================================================================+
|                         SERVICE DEPENDENCIES                                |
+============================================================================+

                           +------------------+
                           |   FastAPI App    |
                           +--------+---------+
                                    |
            +-----------------------+-----------------------+
            |                       |                       |
            v                       v                       v
   +------------------+    +------------------+    +------------------+
   |  SessionManager  |    |   LangGraph      |    |   API Routes     |
   +--------+---------+    +--------+---------+    +--------+---------+
            |                       |                       |
            v                       |                       v
   +------------------+             |              +------------------+
   | PostgresService  |             |              | DocumentProcessor|
   +--------+---------+             |              +--------+---------+
            |                       |                       |
            +-----------------------+-----------------------+
                                    |
                                    v
                           +------------------+
                           |   Agent Layer    |
                           +--------+---------+
                                    |
        +------------+--------+-----+-----+--------+------------+
        |            |        |           |        |            |
        v            v        v           v        v            v
+--------+---+ +-----+---+ +--+--+  +-----+---+ +--+--+  +-----+----+
| GeminiSvc  | |MilvusSvc| |Tavily| |PaddleOCR| |Baai | |Embedding |
+--------+---+ +-----+---+ +--+--+  +-----+---+ |Rerank| +-----+----+
         |          |        |            |      +--+--+       |
         |          |        |            |         |          |
         v          v        v            v         v          v
    +---------+ +------+ +------+    +------+   +------+   +------+
    | Gemini  | |Milvus| |Tavily|    |Paddle|   | BAAI |   |Local |
    |   API   | |  DB  | | API  |    | OCR  |   |Model |   |Model |
    +---------+ +------+ +------+    +------+   +------+   +------+
```

### 6.2 Service Details

```
+============================================================================+
|                         SERVICE SPECIFICATIONS                              |
+============================================================================+

+----------------------------------------------------------------------------+
|                          GeminiService                                      |
+----------------------------------------------------------------------------+
| Location: backend/services/gemini_service.py                               |
| Purpose: LLM generation for intent classification, planning, synthesis     |
+----------------------------------------------------------------------------+
| Methods:                                                                    |
|   - generate(prompt, temperature, max_tokens) -> str                        |
|   - chat(messages, temperature) -> str                                      |
|   - stream_generate(prompt) -> AsyncGenerator[str]                          |
|   - count_tokens(text) -> int                                               |
+----------------------------------------------------------------------------+
| Configuration:                                                              |
|   - Model: gemini-1.5-flash (configurable)                                  |
|   - Temperature: 0.7 (default)                                              |
|   - Max Tokens: 2048                                                        |
|   - Safety Settings: Medium and above blocking                              |
+----------------------------------------------------------------------------+

+----------------------------------------------------------------------------+
|                          MilvusService                                      |
+----------------------------------------------------------------------------+
| Location: backend/services/milvus_service.py                                |
| Purpose: Vector storage and similarity search                               |
+----------------------------------------------------------------------------+
| Methods:                                                                    |
|   - insert_embeddings(embeddings, doc_id, chunks, model, metadata) -> ids  |
|   - search(query_embedding, model, top_k, filters) -> results              |
|   - delete_document(document_id) -> count                                   |
|   - get_stats() -> dict                                                     |
+----------------------------------------------------------------------------+
| Schema:                                                                     |
|   - id: VARCHAR(255) [Primary Key]                                          |
|   - embedding: FLOAT_VECTOR[dim=1024]                                       |
|   - document_id: VARCHAR(255)                                               |
|   - chunk_index: INT64                                                      |
|   - content: VARCHAR(65535)                                                 |
|   - embedding_model: VARCHAR(50)                                            |
|   - embedding_dim: INT64                                                    |
|   - metadata: JSON                                                          |
+----------------------------------------------------------------------------+
| Index: HNSW (M=16, efConstruction=256), COSINE metric                       |
+----------------------------------------------------------------------------+

+----------------------------------------------------------------------------+
|                          EmbeddingService                                   |
+----------------------------------------------------------------------------+
| Location: backend/services/embedding_service.py                             |
| Purpose: Multi-model text embeddings                                        |
+----------------------------------------------------------------------------+
| Methods:                                                                    |
|   - embed_text(text, model_name) -> List[float]                             |
|   - embed_query(query, model_name) -> List[float]                           |
|   - embed_documents(texts, model_name, batch_size) -> List[List[float]]     |
|   - embed_with_all_models(text) -> Dict[str, List[float]]                   |
|   - embed_documents_with_all_models(texts) -> Dict[str, List[List[float]]]  |
+----------------------------------------------------------------------------+
| Models:                                                                     |
|   - BAAI/bge-small-en-v1.5 (384 dim) - Fast, lightweight                    |
|   - BAAI/bge-large-en-v1.5 (1024 dim) - High accuracy                       |
|   - dunzhang/stella_en_400M_v5 (768 dim) - Balanced                         |
+----------------------------------------------------------------------------+
| All embeddings padded to 1024 for Milvus compatibility                      |
+----------------------------------------------------------------------------+

+----------------------------------------------------------------------------+
|                          TavilyService                                      |
+----------------------------------------------------------------------------+
| Location: backend/services/tavily_service.py                                |
| Purpose: Real-time web search                                               |
+----------------------------------------------------------------------------+
| Methods:                                                                    |
|   - search(query, max_results, search_depth, domains) -> results           |
|   - search_with_answer(query, max_results) -> {answer, results}            |
+----------------------------------------------------------------------------+
| Configuration:                                                              |
|   - Max Results: 10 (default)                                               |
|   - Search Depth: basic/advanced                                            |
|   - Domain Filtering: include/exclude lists                                 |
+----------------------------------------------------------------------------+

+----------------------------------------------------------------------------+
|                       BAARerankerService                                    |
+----------------------------------------------------------------------------+
| Location: backend/services/baai_reranker_service.py                         |
| Purpose: Result reranking for relevance                                     |
+----------------------------------------------------------------------------+
| Methods:                                                                    |
|   - rerank(query, documents, top_k) -> ranked_results                      |
+----------------------------------------------------------------------------+
| Model: BAAI/bge-reranker-base                                               |
| Process: Combines documents, web results, OCR results                      |
|          Reranks by query-document relevance                                |
+----------------------------------------------------------------------------+

+----------------------------------------------------------------------------+
|                       PaddleOCRService                                      |
+----------------------------------------------------------------------------+
| Location: backend/services/paddle_ocr_service.py                            |
| Purpose: Text extraction from images                                        |
+----------------------------------------------------------------------------+
| Methods:                                                                    |
|   - extract_text(image_data, filename) -> {text, confidence, lines}        |
+----------------------------------------------------------------------------+
| Supported Formats: PNG, JPG, JPEG, GIF, BMP, TIFF                           |
| Input Sources: File upload, URL, base64 data URI                            |
+----------------------------------------------------------------------------+

+----------------------------------------------------------------------------+
|                          RedisService                                       |
+----------------------------------------------------------------------------+
| Location: backend/services/redis_service.py                                 |
| Purpose: Caching and session management                                     |
+----------------------------------------------------------------------------+
| Methods:                                                                    |
|   - get(key) -> value                                                       |
|   - set(key, value, ttl) -> bool                                            |
|   - delete(key) -> bool                                                     |
|   - exists(key) -> bool                                                     |
+----------------------------------------------------------------------------+
| Cache Keys:                                                                 |
|   - session:{session_id} - Session data                                     |
|   - query:{hash} - Query result cache                                       |
|   - rate:{ip} - Rate limiting counters                                      |
+----------------------------------------------------------------------------+

+----------------------------------------------------------------------------+
|                       PostgresService                                       |
+----------------------------------------------------------------------------+
| Location: backend/services/postgres_service.py                              |
| Purpose: Persistent data storage                                            |
+----------------------------------------------------------------------------+
| Tables:                                                                     |
|   - conversations: id, session_id, role, content, sources, timestamp       |
|   - sessions: id, created_at, updated_at, metadata                          |
|   - langgraph_checkpoints: (LangGraph managed)                              |
+----------------------------------------------------------------------------+
| Also used by LangGraph AsyncPostgresSaver for checkpointing                |
+----------------------------------------------------------------------------+

+----------------------------------------------------------------------------+
|                       SessionManager                                        |
+----------------------------------------------------------------------------+
| Location: backend/services/session_manager.py                               |
| Purpose: Conversation session lifecycle                                     |
+----------------------------------------------------------------------------+
| Methods:                                                                    |
|   - create_session(session_id, metadata) -> Session                         |
|   - get_session(session_id) -> Session                                      |
|   - add_message(session_id, role, content, sources) -> bool                |
|   - get_history(session_id, limit) -> List[Message]                         |
|   - update_activity(session_id) -> bool                                     |
|   - delete_session(session_id) -> bool                                      |
+----------------------------------------------------------------------------+
```

### 6.3 Agent-Service Mapping

```
+============================================================================+
|                      AGENT-SERVICE DEPENDENCIES                             |
+============================================================================+

+------------------------+---------------------------------------------------+
|        AGENT           |                    SERVICES                        |
+------------------------+---------------------------------------------------+
| intent_classifier      | GeminiService                                     |
+------------------------+---------------------------------------------------+
| plan_generator         | GeminiService                                     |
+------------------------+---------------------------------------------------+
| plan_validator         | GeminiService                                     |
+------------------------+---------------------------------------------------+
| document_search        | EmbeddingService, MilvusService                   |
+------------------------+---------------------------------------------------+
| web_search             | TavilyService                                     |
+------------------------+---------------------------------------------------+
| ocr                    | PaddleOCRService                                  |
+------------------------+---------------------------------------------------+
| url_processing         | aiohttp, BeautifulSoup (internal)                 |
+------------------------+---------------------------------------------------+
| reranker               | BAARerankerService                                |
+------------------------+---------------------------------------------------+
| response_synthesis     | GeminiService                                     |
+------------------------+---------------------------------------------------+
```

---

## Appendix: Configuration Reference

### Environment Variables

```bash
# AI/ML Services
GEMINI_API_KEY=your_gemini_api_key
TAVILY_API_KEY=your_tavily_api_key

# Database
POSTGRES_URL=postgresql://raguser:password@localhost:5432/rag_chatbot
POSTGRES_USER=raguser
POSTGRES_PASSWORD=secure_password

# Vector Database
MILVUS_HOST=localhost
MILVUS_PORT=19530

# Cache
REDIS_URL=redis://localhost:6379/0

# Security
INTEGRATION_API_KEY=your_integration_key

# CORS
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Document Processing
CHUNK_SIZE=512
CHUNK_OVERLAP=50
```

### Key File Locations

```
rag-chatbot/
+-- backend/
|   +-- main.py                    # FastAPI entry point
|   +-- config/
|   |   +-- __init__.py           # Settings (Pydantic)
|   |   +-- logging_config.py     # Logging setup
|   +-- graph/
|   |   +-- rag_graph.py          # LangGraph StateGraph
|   |   +-- state.py              # RAGState definition
|   |   +-- edges.py              # Routing functions
|   +-- agents/
|   |   +-- base/
|   |   |   +-- base_agent.py     # BaseAgent + @register_agent
|   |   +-- registry.py           # AgentRegistry
|   |   +-- orchestration/
|   |   |   +-- intent_classifier.py
|   |   |   +-- plan_generator.py
|   |   |   +-- plan_validator.py
|   |   +-- execution/
|   |       +-- document_search.py
|   |       +-- web_search.py
|   |       +-- ocr.py
|   |       +-- url_processing.py
|   |       +-- reranker.py
|   |       +-- response_synthesis.py
|   +-- services/
|   |   +-- gemini_service.py
|   |   +-- milvus_service.py
|   |   +-- embedding_service.py
|   |   +-- tavily_service.py
|   |   +-- baai_reranker_service.py
|   |   +-- paddle_ocr_service.py
|   |   +-- redis_service.py
|   |   +-- postgres_service.py
|   |   +-- session_manager.py
|   |   +-- document_processor.py
|   +-- api/
|       +-- routes/
|       |   +-- chat.py           # /chat, /chat/ws
|       |   +-- documents.py      # /documents
|       |   +-- agents.py         # /agents
|       |   +-- integration.py    # /integration
|       +-- schemas/
|       +-- websocket.py
+-- frontend/
|   +-- src/
|       +-- app/                  # Next.js App Router
|       +-- components/
|       |   +-- chat/
|       |   +-- agents/
|       |   +-- documents/
|       |   +-- ui/
|       +-- hooks/
|       |   +-- useChat.ts
|       +-- store/
|           +-- (Zustand stores)
+-- docker-compose.yml
+-- Dockerfile.backend
+-- frontend/Dockerfile
+-- .env
```

---

*Document generated for RAG Chatbot Architecture - Version 2.0*
*Last Updated: March 2026*
