---
name: backend-builder
description: Build and manage backend services, agents, and infrastructure
---

Build backend components for the RAG chatbot.

## Usage
```
/backend-builder <action> [options]
```

## Actions
- `agent`: Create LangGraph agent
- `service`: Create service class
- `route`: Create API route
- `middleware`: Create middleware
- `graph-node`: Add graph node

## Project Structure
```
backend/
├── agents/
│   ├── base/          # BaseAgent, decorators
│   ├── execution/     # Search, OCR, etc.
│   ├── orchestration/ # Classification, planning
│   └── indexing/      # Document indexing
├── services/          # Business logic
├── api/               # Routes, schemas
├── graph/             # StateGraph definitions
└── config/            # Settings, logging
```

## Agent Template
```python
@register_agent(agent_id="id", name="Name", capabilities=["cap"])
class Agent(BaseAgent):
    async def execute(self, state: RAGState) -> RAGState:
        # Implementation
        return state
```

## Examples
```
/backend-builder agent sentiment_analyzer --type execution
/backend-builder service analytics --type api
/backend-builder graph-node custom_processor
```
