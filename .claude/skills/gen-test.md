---
name: gen-test
description: Generate comprehensive pytest tests for backend modules (agents, services, API routes)
disable-model-invocation: true
---

Generate pytest tests for the specified file or module with full coverage.

## Usage
```
/gen-test <file-path> [--type unit|integration|e2e]
```

## Test Structure
```
tests/
├── conftest.py
├── backend/
│   ├── agents/
│   │   ├── execution/test_document_search.py
│   │   └── orchestration/test_intent_classifier.py
│   ├── services/
│   │   ├── test_milvus_service.py
│   │   └── test_gemini_service.py
│   └── api/
│       └── test_chat_routes.py
└── integration/
    └── test_full_pipeline.py
```

## Test Patterns

### Agent Test
```python
@pytest.mark.asyncio
async def test_document_search_agent(mock_milvus_service):
    agent = DocumentSearchAgent()
    state = RAGState(query="test query", session_id="test")

    result = await agent.execute(state)

    assert result.documents is not None
```

### Service Test
```python
class TestGeminiService:
    @pytest.mark.asyncio
    async def test_generate_response(self, gemini_service):
        with patch.object(gemini_service, '_call_api') as mock:
            mock.return_value = "Response"
            result = await gemini_service.generate_response("prompt")
            assert result == "Response"
```

### API Test
```python
@pytest.mark.asyncio
async def test_chat_endpoint(client):
    response = await client.post("/chat", json={"query": "test"})
    assert response.status_code == 200
```

## Examples
```
/gen-test backend/services/milvus_service.py
/gen-test backend/agents/execution/document_search.py --type integration
/gen-test backend/api/routes/chat.py --type e2e
```
