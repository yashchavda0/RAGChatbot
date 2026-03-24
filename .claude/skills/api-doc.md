---
name: api-doc
description: Generate API documentation from FastAPI routes, schemas, and agent definitions
---

Generate comprehensive API documentation including OpenAPI specs and examples.

## Usage
```
/api-doc [--format openapi|markdown|html] [--output <path>]
```

## Output Structure
```
docs/api/
├── openapi.json
├── endpoints.md
├── websockets.md
├── agents.md
└── examples/
    ├── requests.json
    └── responses.json
```

## Endpoint Documentation Template
```markdown
## POST /chat

### Request
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | User query |
| session_id | string | No | Session identifier |

### Response
{
  "response": "...",
  "sources": [...],
  "agent_executions": [...]
}
```

## WebSocket Documentation
Document message types: agent_start, agent_complete, partial_response, error, complete

## Agent Workflow Documentation
Document all agents, their capabilities, and the routing flow.

## Examples
```
/api-doc
/api-doc --format openapi --output docs/api/openapi.json
```
