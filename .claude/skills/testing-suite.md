---
name: testing-suite
description: Comprehensive testing suite for unit, integration, and E2E tests
disable-model-invocation: true
---

Run comprehensive tests for the RAG chatbot.

## Usage
```
/testing-suite [type] [options]
```

## Test Types
- `unit`: Fast isolated tests
- `integration`: Service integration tests
- `e2e`: End-to-end API tests
- `performance`: Load and stress tests
- `all`: Run all tests

## Test Structure
```
tests/
├── unit/
│   ├── agents/
│   ├── services/
│   └── api/
├── integration/
│   ├── test_rag_pipeline.py
│   └── test_database.py
├── e2e/
│   ├── test_chat_flow.py
│   └── test_document_upload.py
└── performance/
    └── test_load.py
```

## Commands
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=backend --cov-report=html

# Run specific type
pytest tests/unit/
pytest tests/integration/ -v
```

## Coverage Targets
| Area | Target |
|------|--------|
| Services | 80% |
| Agents | 75% |
| API Routes | 85% |
| Overall | 75% |

## Examples
```
/testing-suite unit
/testing-suite integration --coverage
/testing-suite all --parallel
```
