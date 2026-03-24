---
name: api-layers
description: Build and manage API layers (routes, schemas, middleware)
---

Build API layers for the FastAPI backend.

## Usage
```
/api-layers <action> [options]
```

## Actions
- `route`: Create API route
- `schema`: Create Pydantic schema
- `middleware`: Create middleware
- `dependency`: Create dependency injection
- `websocket`: Create WebSocket handler

## Layer Structure
```
backend/api/
├── routes/
│   ├── chat.py
│   ├── documents.py
│   └── agents.py
├── schemas/
│   └── chat.py
├── middleware/
│   └── auth.py
└── websocket.py
```

## Route Template
```python
from fastapi import APIRouter, HTTPException, Depends
from backend.api.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/endpoint", tags=["Tag"])

@router.post("/", response_model=Response)
async def create(request: Request, user = Depends(get_user)):
    # Implementation
    pass
```

## Examples
```
/api-layers route feedback --methods get,post
/api-layers schema analytics
/api-layers middleware rate-limit
```
