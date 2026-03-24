---
name: add-route
description: Create new FastAPI route with schemas and registration
---

Generate a new FastAPI route with request/response schemas.

## Usage
```
/add-route <route-name> [--prefix /api/v1] [--methods get,post]
```

## Route Template
```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/<route>", tags=["<Route>"])

class <Route>Request(BaseModel):
    field1: str = Field(..., description="Description")

class <Route>Response(BaseModel):
    id: str
    result: str

@router.get("/", response_model=list[<Route>Response])
async def list_items(): pass

@router.post("/", response_model=<Route>Response, status_code=201)
async def create_item(request: <Route>Request): pass

@router.get("/{item_id}", response_model=<Route>Response)
async def get_item(item_id: str): pass
```

## Registration
1. Create `backend/api/routes/<route>.py`
2. Add to `backend/main.py`: `app.include_router(<route>_router)`

## Examples
```
/add-route feedback --methods get,post,put,delete
/add-route analytics --methods get
```
