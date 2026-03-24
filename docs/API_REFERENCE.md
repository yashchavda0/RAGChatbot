# RAG Chatbot API Reference

## Overview

This document provides comprehensive API documentation for the RAG Chatbot system. The API is built with FastAPI and follows RESTful conventions.

**Base URL:** `http://localhost:8000` (development)

**Interactive Documentation:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Authentication

### Integration API

The `/api/v1/*` endpoints require API key authentication via the `X-API-Key` header.

```http
X-API-Key: your-integration-api-key
```

> Note: The integration API key must be at least 32 characters in production.

### Public Endpoints

The `/chat`, `/documents`, and `/agents` endpoints are currently public (no authentication required).

---

## API Endpoints

### 1. Root Information

#### GET /

Get API information and available endpoints.

**Request:**

```http
GET / HTTP/1.1
Host: localhost:8000
```

**Response (200 OK):**

```json
{
  "name": "RAG Chatbot API",
  "version": "2.0.0",
  "status": "running",
  "description": "Multi-agent RAG system with LangGraph",
  "features": [
    "Intent classification",
    "Plan generation & validation",
    "Document search (Milvus)",
    "Web search (Tavily)",
    "OCR (PaddleOCR)",
    "Multi-model embeddings",
    "BAAI reranker",
    "WebSocket streaming"
  ],
  "endpoints": {
    "chat": "/chat",
    "websocket": "/chat/ws",
    "documents": "/documents",
    "health": "/health",
    "docs": "/docs"
  }
}
```

---

### 2. Health Check

#### GET /health

Check the health status of the API and its dependencies.

**Response (200 OK):**

```json
{
  "status": "healthy",
  "database": "configured",
  "milvus": {
    "status": "connected",
    "count": 1234
  },
  "redis": "connected"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| status | string | Overall health status ("healthy" or "unhealthy") |
| database | string | Database connection status |
| milvus | object | Milvus connection status and document count |
| redis | string | Redis connection status |

---

### 3. Chat Operations

#### POST /chat

Process a chat message through the RAG system.

**Request Body Schema:**

```json
{
  "message": "string (required)",
  "session_id": "string (optional, default: 'default')"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | Yes | User's query message |
| session_id | string | No | Session identifier for conversation context |

**Example Request:**

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is machine learning?",
    "session_id": "user-123"
  }'
```

**Response (200 OK):**

```json
{
  "response": "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed...",
  "sources": [
    {
      "title": "Introduction to Machine Learning",
      "url": "https://example.com/ml-intro",
      "score": 0.95,
      "content": "Relevant excerpt from the source..."
    }
  ],
  "session_id": "user-123",
  "agent_executions": [
    {
      "agent_id": "intent_classifier",
      "agent_name": "Intent Classifier",
      "status": "completed",
      "input_data": {},
      "output_data": {
        "intent": "document_search",
        "confidence": 0.92
      },
      "started_at": "2026-03-22T10:00:00.000Z",
      "completed_at": "2026-03-22T10:00:01.234Z",
      "execution_time_ms": 1234,
      "error_message": null
    },
    {
      "agent_id": "document_search",
      "agent_name": "Document Search",
      "status": "completed",
      "input_data": {
        "query": "What is machine learning?"
      },
      "output_data": {
        "documents_count": 5
      },
      "started_at": "2026-03-22T10:00:01.235Z",
      "completed_at": "2026-03-22T10:00:02.500Z",
      "execution_time_ms": 1265,
      "error_message": null
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| response | string | Generated response from the assistant |
| sources | array | List of source citations |
| session_id | string | Session identifier |
| agent_executions | array | Detailed execution log of each agent |

**Error Responses:**

| Status | Description |
|--------|-------------|
| 500 | Internal server error during query processing |

---

### 4. WebSocket Chat

#### WebSocket /chat/ws

Real-time chat with streaming agent execution updates.

**Connection URL:**

```
ws://localhost:8000/chat/ws?session_id=your-session-id
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| session_id | string | No | Session identifier (default: "default") |

**Connection Flow:**

```
Client                                          Server
  |                                               |
  |---------- WebSocket Connect ----------------->|
  |<--------- {"type": "connected"} --------------|
  |                                               |
  |---------- {"message": "query"} -------------->|
  |                                               |
  |<--------- {"type": "agent_update"} -----------|
  |<--------- {"type": "progress"} ---------------|
  |<--------- {"type": "agent_update"} -----------|
  |<--------- {"type": "response"} ---------------|
  |<--------- {"type": "done"} -------------------|
  |                                               |
```

**Message Types:**

##### Connection Acknowledgment

Sent immediately after WebSocket connection.

```json
{
  "type": "connected",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "user-session-123"
}
```

##### Agent Update

Sent when an agent starts, completes, or fails.

```json
{
  "type": "agent_update",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "user-session-123",
  "agent": {
    "id": "intent_classifier",
    "name": "Intent Classifier",
    "status": "running",
    "data": {
      "input": {},
      "output": null,
      "error": null
    }
  }
}
```

| Status | Description |
|--------|-------------|
| running | Agent is currently executing |
| completed | Agent finished successfully |
| failed | Agent encountered an error |

##### Progress Update

Sent during workflow execution.

```json
{
  "type": "progress",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "user-session-123",
  "progress": {
    "node": "document_search",
    "state": "executing"
  }
}
```

##### Final Response

Sent when the response is ready.

```json
{
  "type": "response",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "user-session-123",
  "response": "Generated response text...",
  "sources": [
    {
      "title": "Source Title",
      "url": "https://example.com",
      "score": 0.95
    }
  ]
}
```

##### Error Message

Sent when an error occurs.

```json
{
  "type": "error",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "user-session-123",
  "error": "Error description"
}
```

##### Completion Signal

Sent when the workflow is complete.

```json
{
  "type": "done",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "user-session-123"
}
```

**JavaScript Example:**

```javascript
const ws = new WebSocket('ws://localhost:8000/chat/ws?session_id=my-session');

ws.onopen = () => {
  console.log('Connected');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'connected':
      console.log('Connected with request ID:', data.request_id);
      break;
    case 'agent_update':
      console.log(`Agent ${data.agent.name}: ${data.agent.status}`);
      break;
    case 'response':
      console.log('Response:', data.response);
      break;
    case 'done':
      console.log('Workflow complete');
      break;
    case 'error':
      console.error('Error:', data.error);
      break;
  }
};

// Send a message
ws.send(JSON.stringify({ message: 'What is AI?' }));
```

---

### 5. Document Operations

#### POST /documents/upload

Upload and process a document for RAG.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Document file |
| session_id | string | No | Session identifier |

**Supported Formats:** PDF, DOCX, TXT, MD

**Example Request:**

```bash
curl -X POST http://localhost:8000/documents/upload \
  -F "file=@document.pdf" \
  -F "session_id=user-123"
```

**Response (200 OK):**

```json
{
  "message": "Document processed successfully",
  "document_id": "550e8400-e29b-41d4-a716-446655440000",
  "chunks_created": 25,
  "embedding_models": [
    "bge-small-en-v1.5",
    "bge-large-en-v1.5",
    "stella-en-400M-v5"
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| message | string | Status message |
| document_id | string | Unique document identifier |
| chunks_created | integer | Number of text chunks created |
| embedding_models | array | List of embedding models used |

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Unsupported file type |
| 500 | Processing error |

---

#### GET /documents

List all documents for a session.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| session_id | string | No | Session identifier |

**Response (200 OK):**

```json
{
  "documents": []
}
```

---

#### DELETE /documents/{document_id}

Delete a document and its embeddings.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| document_id | string | Document identifier |

**Response (200 OK):**

```json
{
  "message": "Document deleted successfully",
  "embeddings_removed": 75
}
```

**Note:** Embeddings count is multiplied by 3 since documents are embedded with all 3 models.

---

### 6. Agent Operations

#### GET /agents

List all available agents and their status.

**Response (200 OK):**

```json
[
  {
    "agent_id": "intent_classifier",
    "agent_name": "Intent Classifier",
    "status": "active",
    "current_request": null
  },
  {
    "agent_id": "plan_generator",
    "agent_name": "Plan Generator",
    "status": "active",
    "current_request": null
  },
  {
    "agent_id": "plan_validator",
    "agent_name": "Plan Validator",
    "status": "active",
    "current_request": null
  },
  {
    "agent_id": "document_search",
    "agent_name": "Document Search",
    "status": "active",
    "current_request": null
  },
  {
    "agent_id": "web_search",
    "agent_name": "Web Search",
    "status": "active",
    "current_request": null
  },
  {
    "agent_id": "ocr",
    "agent_name": "OCR Agent",
    "status": "active",
    "current_request": null
  },
  {
    "agent_id": "url_process",
    "agent_name": "URL Processing",
    "status": "active",
    "current_request": null
  },
  {
    "agent_id": "reranker",
    "agent_name": "Reranker",
    "status": "active",
    "current_request": null
  },
  {
    "agent_id": "response_synthesis",
    "agent_name": "Response Synthesis",
    "status": "active",
    "current_request": null
  }
]
```

---

#### GET /agents/executions

List recent agent executions.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| session_id | string | No | Filter by session |
| limit | integer | No | Maximum results (default: 50) |

**Response (200 OK):**

```json
{
  "executions": [],
  "session_id": null,
  "limit": 50
}
```

---

#### GET /agents/graph

Get the LangGraph structure for visualization.

**Response (200 OK):**

```json
{
  "graph": "...\n...\n",
  "description": "RAG Chatbot Agent Graph"
}
```

---

### 7. Integration API

All integration endpoints require the `X-API-Key` header.

#### POST /api/v1/chat

External integration chat endpoint.

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| X-API-Key | Yes | Integration API key |

**Request Body:**

```json
{
  "message": "string (required)",
  "session_id": "string (optional, default: 'default')",
  "context": "string (optional)",
  "stream": "boolean (optional, default: false)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | Yes | User's message |
| session_id | string | No | Session identifier |
| context | string | No | Additional context for the conversation |
| stream | boolean | No | Enable streaming (not yet implemented) |

**Example Request:**

```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "message": "What is the company policy on remote work?",
    "session_id": "hr-portal-123",
    "context": "The user is an employee asking about work policies."
  }'
```

**Response (200 OK):**

```json
{
  "response": "Generated response...",
  "sources": [],
  "session_id": "hr-portal-123",
  "agent_executions": []
}
```

---

#### GET /api/v1/status

Get system status.

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| X-API-Key | Yes | Integration API key |

**Response (200 OK):**

```json
{
  "status": "active",
  "total_documents": 0,
  "total_chunks": 0,
  "ready": true
}
```

---

#### GET /api/v1/config

Get chatbot configuration.

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| X-API-Key | Yes | Integration API key |

**Response (200 OK):**

```json
{
  "name": "RAG Chatbot",
  "version": "2.0.0",
  "description": "Multi-agent RAG chatbot with LangGraph",
  "features": [
    "document_search",
    "web_search",
    "ocr",
    "intent_classification",
    "plan_generation",
    "agent_visualization"
  ],
  "embedding_models": [
    "bge-small-en-v1.5",
    "bge-large-en-v1.5",
    "stella-en-400M-v5"
  ],
  "reranker": "bge-reranker-v2-m3"
}
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "detail": "Error description message"
}
```

### HTTP Status Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or missing API key |
| 404 | Not Found - Resource not found |
| 422 | Unprocessable Entity - Validation error |
| 500 | Internal Server Error |

### Common Error Examples

**Unsupported File Type (400):**

```json
{
  "detail": "Unsupported file type. Supported: ['pdf', 'docx', 'txt', 'md']"
}
```

**Invalid API Key (401):**

```json
{
  "detail": "Invalid API key"
}
```

**Processing Error (500):**

```json
{
  "error": "Internal server error",
  "detail": "Failed to process document: PDF parsing error"
}
```

---

## Rate Limiting

Currently, no rate limiting is implemented. For production deployments, consider adding rate limiting middleware.

---

## CORS Configuration

CORS is configured via the `CORS_ORIGINS` environment variable:

```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://your-domain.com
```

Allowed methods: All (`*`)
Allowed headers: All (`*`)
Credentials: Enabled

---

## Request/Response Schemas

### ChatMessage

```json
{
  "message": "string",
  "session_id": "string (optional)"
}
```

### ChatResponse

```json
{
  "response": "string",
  "sources": [
    {
      "title": "string",
      "url": "string",
      "score": "number",
      "content": "string"
    }
  ],
  "session_id": "string",
  "agent_executions": [
    {
      "agent_id": "string",
      "agent_name": "string",
      "status": "string",
      "input_data": "object",
      "output_data": "object",
      "started_at": "string (ISO 8601)",
      "completed_at": "string (ISO 8601)",
      "execution_time_ms": "integer",
      "error_message": "string (optional)"
    }
  ]
}
```

### DocumentUploadResponse

```json
{
  "message": "string",
  "document_id": "string",
  "chunks_created": "integer",
  "embedding_models": ["string"]
}
```

### AgentStatus

```json
{
  "agent_id": "string",
  "agent_name": "string",
  "status": "string",
  "current_request": "string (optional)"
}
```

---

## SDK Examples

### Python

```python
import requests

BASE_URL = "http://localhost:8000"

# Chat
response = requests.post(
    f"{BASE_URL}/chat",
    json={
        "message": "What is machine learning?",
        "session_id": "my-session"
    }
)
print(response.json())

# Upload document
with open("document.pdf", "rb") as f:
    response = requests.post(
        f"{BASE_URL}/documents/upload",
        files={"file": f},
        data={"session_id": "my-session"}
    )
print(response.json())

# Integration API
response = requests.post(
    f"{BASE_URL}/api/v1/chat",
    headers={"X-API-Key": "your-api-key"},
    json={
        "message": "Hello",
        "session_id": "integration-session"
    }
)
print(response.json())
```

### JavaScript/TypeScript

```typescript
const BASE_URL = 'http://localhost:8000';

// Chat
async function chat(message: string, sessionId: string = 'default') {
  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId })
  });
  return response.json();
}

// Upload document
async function uploadDocument(file: File, sessionId: string = 'default') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('session_id', sessionId);

  const response = await fetch(`${BASE_URL}/documents/upload`, {
    method: 'POST',
    body: formData
  });
  return response.json();
}

// WebSocket
function connectWebSocket(sessionId: string) {
  const ws = new WebSocket(`${BASE_URL.replace('http', 'ws')}/chat/ws?session_id=${sessionId}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
  };

  return {
    send: (message: string) => ws.send(JSON.stringify({ message })),
    close: () => ws.close()
  };
}
```

### cURL

```bash
# Health check
curl http://localhost:8000/health

# Chat
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "session_id": "test"}'

# Upload document
curl -X POST http://localhost:8000/documents/upload \
  -F "file=@document.pdf"

# Integration API
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"message": "Hello"}'

# List agents
curl http://localhost:8000/agents
```
