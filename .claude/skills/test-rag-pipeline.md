---
name: test-rag-pipeline
description: End-to-end RAG pipeline testing
disable-model-invocation: true
---

Run end-to-end tests for the complete RAG pipeline.

## Usage
```
/test-rag-pipeline [--query "test query"] [--document path/to/doc]
```

## Test Scenarios
1. **Document Ingestion**: Upload → Process → Embed → Store
2. **Simple Query**: Query → Classify → Search → Respond
3. **Complex Query**: Query → Plan → Multi-step → Respond
4. **Web Search**: Query → Tavily → Rerank → Respond
5. **OCR Query**: Query → OCR → Extract → Respond

## Pipeline Steps
```
Query Input
    ↓
Intent Classifier → DOCUMENT_SEARCH | WEB_SEARCH | OCR | COMPLEX
    ↓
Execution Agent(s) → Documents | Web Results | OCR Text
    ↓
Reranker → Ranked Results
    ↓
Response Synthesis → Final Response
```

## Validation
- Latency < 5s for simple queries
- Latency < 15s for complex queries
- Response relevance score > 0.7
- No errors in agent execution

## Examples
```
/test-rag-pipeline --query "What is machine learning?"
/test-rag-pipeline --document test.pdf
```
