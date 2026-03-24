# RAG Chatbot Architecture Redesign

**Date:** 2026-03-22
**Status:** Draft
**Author:** Claude

---

## Overview

Redesign the RAG chatbot architecture for CPU-only systems with 4-8GB RAM. The system supports mixed use cases: document Q&A, FAQs, uploaded documents, and web search with intelligent intent-based routing.

---

## Goals

1. **CPU-Optimized**: Run efficiently on 4-8GB RAM systems
2. **Two-Phase Architecture**:
   - Phase 1: Document ingestion with OCR for all documents
   - Phase 2: Query processing with intent-based routing
3. **Intent-Based Routing**: Classify queries to route to documents or web
4. **Single Source Answers**: Each answer comes from ONE source (docs OR web, not both)

---

## Non-Goals

- Multi-model embeddings (too memory-intensive)
- Complex planning/plan validation
- Combining document + web results in single answer
- GPU acceleration

---

## Architecture

### Phase 1: Document Ingestion

```
Upload Document (PDF/DOCX/Image/TXT)
              |
              v
      +---------------+
      |  File Type    |
      |  Detection    |
      +-------+-------+
              |
    +---------+---------+
    v         v         v
  [PDF]    [DOCX]    [IMAGE/TXT]
    |         |         |
    v         v         |
  pdf2image  Extract    |
    |       Images      |
    |         |         |
    +---------+---------+
              |
              v
      +---------------+
      |  PaddleOCR    |  <-- ALL content OCR'd
      |  (CPU mode)   |
      +-------+-------+
              |
              v
      +---------------+
      | Text Splitter |  <-- 512 chars, 50 overlap
      +-------+-------+
              |
              v
      +---------------+
      | gte-small     |  <-- Single model, 384 dims
      |  Embedding    |
      +-------+-------+
              |
              v
      +---------------+
      |    Milvus     |  <-- Store vectors + metadata
      |   VectorDB    |
      +---------------+
```

### Phase 2: Query Processing

```
User Query
     |
     v
+------------------+
| Intent Classifier|  <-- Gemini classifies query
| (DOCUMENT_QUERY, |     type based on query text
|  WEB_QUERY,      |
|  GENERAL_QUERY)  |
+--------+---------+
         |
    +----+--------------------+
    |                         |
    v                         v
[DOCUMENT]                [WEB/GENERAL]
    |                         |
    v                         v
+----------------+      +----------------+
| 1. Embed Query |      |   Tavily API   |
| 2. Milvus      |      |   Web Search   |
|    Search      |      |    (Top-10)    |
|    (Top-20)    |      +-------+--------+
+-------+--------+              |
        |                       |
        v                       |
+----------------+              |
|   Reranker     |              |
| (Lazy Loaded)  |              |
|    (Top-10)    |              |
+-------+--------+              |
        |                       |
        +-----------+-----------+
                    |
                    v
          +------------------+
          | Response         |
          | Synthesis        |  <-- Gemini generates answer
          | (Gemini)         |      from ONE source only
          +--------+---------+
                   |
                   v
             Final Answer

SEPARATE PATHS:
- DOCUMENT_QUERY: Embed -> Milvus -> Reranker -> LLM -> Answer (from docs)
- WEB_QUERY:      Tavily -> LLM -> Answer (from web)
- GENERAL_QUERY:  Tavily -> LLM -> Answer (from web)
```

---

## Components

### Intent Types

| Intent | Description | Route |
|--------|-------------|-------|
| `DOCUMENT_QUERY` | Query about uploaded documents | Milvus -> Reranker -> LLM |
| `WEB_QUERY` | Needs current/web info (news, weather) | Tavily -> LLM |
| `GENERAL_QUERY` | General knowledge question | Tavily -> LLM |

### Services

| Service | Technology | RAM Usage | Notes |
|---------|------------|-----------|-------|
| LLM | Gemini API | 0 | Cloud-based |
| Embedding | gte-small | ~130MB | 384 dimensions |
| OCR | PaddleOCR | ~300MB | CPU mode |
| Reranker | BAAI-reranker-small | ~200MB | Lazy loaded |
| VectorDB | Milvus | ~1GB | Docker |
| Database | PostgreSQL | ~200MB | Docker |
| Cache | Redis | ~50MB | Docker |

**Total RAM: ~2.7-4GB** (fits in 4-8GB)

### Document Processing

- **PDF**: Convert pages to images via pdf2image (batch mode), then OCR
- **DOCX**: Extract embedded images, OCR images + text
- **Images**: Direct OCR
- **TXT/MD**: Extract text directly (NO OCR needed - plain text)

### PDF Batch Processing (Memory-Safe)

To prevent memory spikes on 4GB systems, PDFs are processed one page at a time:

```python
async def process_pdf_safe(file_path: str):
    """Process PDF page-by-page to avoid memory spikes."""
    total_pages = get_page_count(file_path)
    all_text = []

    for page_num in range(total_pages):
        # Convert ONE page at a time (max ~100MB per page)
        images = convert_from_path(
            file_path,
            first_page=page_num + 1,
            last_page=page_num + 1,
            dpi=200  # Lower DPI for memory efficiency
        )

        # OCR immediately
        text = await ocr_service.extract_text(images[0])
        all_text.append(text)

        # Clear image from memory
        del images
        gc.collect()

    return "\n".join(all_text)
```

**Memory impact**: ~100-200MB max during ingestion (vs ~1GB spike without batching)

### Dependencies

- **poppler-utils**: Required by pdf2image for PDF conversion
  - Windows: Install via conda or download binaries
  - Docker: `apt-get install poppler-utils`
  - Add to Dockerfile.backend

### Embedding Strategy

- **Single model**: `gte-small` (Alibaba's General Text Embeddings)
- **Dimension**: 384
- **Why**: Best balance of speed, accuracy, and memory for CPU systems
- **Model size**: ~130MB

### Reranker (Lazy Loading)

```python
import gc
from typing import Optional

class LazyReranker:
    _instance: Optional['LazyReranker'] = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls._load_model()
        return cls._instance

    @classmethod
    def _load_model(cls):
        from sentence_transformers import CrossEncoder
        model = CrossEncoder('BAAI/bge-reranker-small', device='cpu')
        return model

    @classmethod
    def unload(cls):
        """Free memory after use."""
        cls._instance = None
        gc.collect()  # Force garbage collection

    @classmethod
    def rerank(cls, query: str, documents: list, top_k: int = 10):
        instance = cls.get_instance()
        pairs = [[query, doc['content']] for doc in documents]
        scores = instance.predict(pairs)

        # Sort by score
        ranked = sorted(zip(documents, scores), key=lambda x: x[1], reverse=True)
        return [doc for doc, score in ranked[:top_k]]
```

- Load only when `DOCUMENT_QUERY` intent detected
- Unload after response generated
- Model: `BAAI/bge-reranker-small`
- Memory freed explicitly via `gc.collect()`

---

## Agents

### Keep

| Agent | Purpose |
|-------|---------|
| `intent_classifier` | Classify query as DOCUMENT/WEB/GENERAL |
| `document_search` | Search Milvus with embedding similarity |
| `web_search` | Tavily API for web results |
| `reranker` | Rerank document chunks (lazy loaded) |
| `response_synthesis` | Generate answer with Gemini |

### Remove

| Agent | Reason |
|-------|--------|
| `plan_generator` | No complex planning needed |
| `plan_validator` | No plans to validate |
| `ocr` (query-time) | OCR only during ingestion |
| `url_processing` | Tavily handles web content |

---

## File Changes

### Delete

```
backend/agents/orchestration/plan_generator.py
backend/agents/orchestration/plan_validator.py
backend/agents/execution/ocr.py
backend/agents/execution/url_processing.py
```

### Create

```
backend/services/pdf_image_converter.py  - PDF to image conversion
```

### Modify

```
backend/agents/orchestration/intent_classifier.py  - Simplified intents
backend/agents/execution/document_search.py        - Single embedding model
backend/agents/execution/reranker.py               - Lazy loading
backend/services/embedding_service.py              - gte-small only
backend/services/document_processor.py             - OCR all documents
backend/graph/rag_graph.py                         - New flow
backend/graph/edges.py                             - New routing
backend/config/settings.py                         - New defaults
```

---

## Graph Routing Logic

### New Edge Functions (edges.py)

```python
def route_by_intent(state: RAGState) -> Literal["document_search", "web_search"]:
    """Route based on classified intent."""
    intent = state.get("intent", "")

    if intent == IntentType.DOCUMENT_QUERY:
        return "document_search"
    else:  # WEB_QUERY or GENERAL_QUERY
        return "web_search"


def should_rerank(state: RAGState) -> Literal["reranker", "response_synthesis"]:
    """Only rerank for document search results."""
    intent = state.get("intent", "")

    # Skip reranker for web queries
    if intent != IntentType.DOCUMENT_QUERY:
        return "response_synthesis"

    # Rerank if we have document results
    documents = state.get("documents", [])
    if len(documents) >= 3:
        return "reranker"
    return "response_synthesis"
```

### Graph Flow

```
intent_classifier
       │
       ├─ DOCUMENT_QUERY ──▶ document_search ──▶ reranker ──▶ response_synthesis ──▶ END
       │
       └─ WEB_QUERY/GENERAL ──▶ web_search ──▶ response_synthesis ──▶ END
```

---

## Configuration Changes

### settings.py - New Defaults

```python
# Embedding - Single model
embedding_models: List[str] = ["thenlper/gte-small"]
default_embedding_model: str = "thenlper/gte-small"
milvus_dimension: int = 384

# Reranker - Lazy loading
reranker_model: str = "BAAI/bge-reranker-small"
reranker_lazy_load: bool = True

# Document Processing
chunk_size: int = 512
chunk_overlap: int = 50

# OCR
ocr_all_documents: bool = True
```

---

## Memory Optimization Strategies

1. **Single Embedding Model**: Reduces embedding memory from ~3GB to ~130MB
2. **Lazy Reranker**: Only loaded during document queries, freed after
3. **Small Model Choice**: gte-small (384d) vs bge-large (1024d)
4. **PDF Batch Processing**: Process one page at a time (100-200MB vs 1GB spike)
5. **Docker Resource Limits**: Configure container memory limits
6. **Efficient Chunking**: 512 char chunks reduce vector count
7. **Skip OCR for plain text**: TXT/MD files extracted directly, no OCR overhead

---

## API Endpoints (Unchanged)

| Endpoint | Purpose |
|----------|---------|
| `POST /documents/upload` | Upload and process documents |
| `POST /chat` | Send query, get response |
| `WS /chat/ws` | WebSocket streaming |
| `GET /health` | Health check |

---

## Testing Strategy

1. **Unit Tests**:
   - Intent classifier accuracy
   - Document processor OCR
   - Embedding generation
   - Reranker lazy loading

2. **Integration Tests**:
   - Full ingestion pipeline
   - Query routing (doc vs web)
   - Response synthesis

3. **Performance Tests**:
   - Memory usage under load
   - Response latency
   - Concurrent queries

---

## Intent Classifier Prompt

```python
INTENT_CLASSIFIER_PROMPT = """
Analyze the user query and classify its intent.

Query: "{query}"

Available knowledge base: {doc_count} documents uploaded

Classify as ONE of:
- DOCUMENT_QUERY: User is asking about information in their uploaded documents
  (e.g., "What does my report say about revenue?", "Find information about X in my files")
- WEB_QUERY: User needs current/real-time information from the web
  (e.g., "What's the weather?", "Latest news about X", "Current stock price")
- GENERAL_QUERY: General knowledge question, not specific to uploaded docs
  (e.g., "What is Python?", "Explain machine learning")

Output only the intent type (DOCUMENT_QUERY, WEB_QUERY, or GENERAL_QUERY).
"""
```

---

## Milvus Migration Strategy

### Dimension Change: 1024 → 384

The new embedding model uses 384 dimensions (vs current 1024). Two options:

**Option A: New Collection (Recommended)**
```python
# Create new collection with 384 dimensions
new_collection_name = "document_embeddings_v2"
milvus_service.create_collection(
    collection_name=new_collection_name,
    dimension=384
)
```
- Old collection preserved (rollback possible)
- Re-upload documents to populate new collection
- Switch to new collection after validation

**Option B: Drop and Recreate (Fresh Start)**
```python
# For development/testing with no critical data
milvus_service.drop_collection("document_embeddings")
milvus_service.create_collection(dimension=384)
```
- Simpler, no migration needed
- All documents must be re-uploaded

### Recommendation

For production: **Option A** (new collection)
For development: **Option B** (fresh start)

---

## Migration Path

1. **Backup existing Milvus data** (if needed)
2. **Create new Milvus collection** with 384 dimensions
3. **Update configuration** to use new embedding model
4. **Deploy updated code** (remove old agents)
5. **Re-upload documents** to populate new collection
6. **Test query routing** with various intent types
7. **Monitor memory usage** under load
8. **Delete old collection** after validation

---

## Success Criteria

- [ ] System runs on 4GB RAM machine
- [ ] Document ingestion with OCR works for all file types
- [ ] Intent classifier correctly routes queries
- [ ] Document queries return relevant answers
- [ ] Web queries return relevant answers
- [ ] Memory usage stays under 4GB during normal operation
- [ ] Response latency < 5 seconds for most queries
