# RAG Architecture Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign RAG chatbot for CPU-only systems (4-8GB RAM) with intent-based routing and OCR-first document ingestion.

**Architecture:** Two-phase system: (1) Document ingestion with OCR for all file types, batch PDF processing for memory safety; (2) Query processing with intent classification routing to either Milvus document search or Tavily web search. Single embedding model (gte-small, 384d), lazy-loaded reranker.

**Tech Stack:** FastAPI, LangGraph, Milvus, PaddleOCR, Gemini API, Tavily API, pdf2image

---

## File Structure

### Files to Delete
```
backend/agents/orchestration/plan_generator.py
backend/agents/orchestration/plan_validator.py
backend/agents/execution/ocr.py
backend/agents/execution/url_processing.py
```

### Files to Create
```
backend/services/pdf_image_converter.py    - Memory-safe PDF to image conversion
tests/test_intent_classifier.py            - Intent classifier tests
tests/test_pdf_converter.py                - PDF converter tests
tests/test_reranker_lazy.py                - Lazy reranker tests
```

### Files to Modify
```
backend/config/settings.py                 - New embedding defaults, intent types, reranker model
backend/graph/state.py                     - Simplified intent types
backend/graph/edges.py                     - New routing logic
backend/graph/rag_graph.py                 - Simplified graph flow
backend/agents/orchestration/intent_classifier.py  - 3-intent classification
backend/agents/execution/document_search.py        - Single embedding model
backend/agents/execution/reranker.py               - Lazy loading
backend/services/embedding_service.py              - gte-small only
backend/services/document_processor.py             - OCR pipeline integration
backend/services/baai_reranker_service.py          - Lazy loading pattern
backend/services/milvus_service.py               - Collection migration (384d)
backend/requirements.txt                            - Add pdf2image, update deps
Dockerfile.backend                                  - Add poppler-utils
```

---

## Task 1: Update Configuration (settings.py)

**Files:**
- Modify: `backend/config/settings.py`

- [ ] **Step 1: Update embedding configuration**

Replace the EMBEDDING_DIMENSIONS section at end of settings.py:

```python
# Embedding Configuration (single model for CPU optimization)
EMBEDDING_DIMENSIONS = {
    "thenlper/gte-small": 384,
}

def get_embedding_dimension(model_name: str) -> int:
    """Get the embedding dimension for a specific model."""
    return EMBEDDING_DIMENSIONS.get(model_name, 384)
```

**NOTE:** IntentType is defined in `graph/state.py` (Task 2), NOT here in settings.py.

- [ ] **Step 2: Update default embedding settings**

Modify the embedding-related settings:

```python
# Find and replace the embedding_models field
embedding_models: List[str] = Field(
    default=["thenlper/gte-small"],
    description="List of embedding models (single model for CPU optimization)"
)
default_embedding_model: str = Field(
    default="thenlper/gte-small",
    description="Default embedding model"
)
milvus_dimension: int = Field(
    default=384,
    description="Embedding dimension for Milvus collection"
)
```

- [ ] **Step 3: Add PDF processing settings**

Add new settings for PDF processing:

```python
# PDF Processing
pdf_dpi: int = Field(default=200, description="DPI for PDF to image conversion")
pdf_batch_size: int = Field(default=1, description="Pages to process at once (1 for memory safety)")

# Reranker
reranker_model: str = Field(default="BAAI/bge-reranker-small", description="BAAI reranker model")
reranker_lazy_load: bool = Field(default=True, description="Lazy load reranker model")
```

- [ ] **Step 4: Commit configuration changes**

```bash
git add backend/config/settings.py
git commit -m "feat(config): update settings for CPU-optimized architecture

- Simplify to 3 intent types (DOCUMENT_QUERY, WEB_QUERY, GENERAL_QUERY)
- Change default embedding to gte-small (384 dimensions)
- Add PDF processing settings for memory-safe batch processing
- Add reranker lazy loading setting"
```

---

## Task 2: Update State Definitions (state.py)

**Files:**
- Modify: `backend/graph/state.py`

- [ ] **Step 1: Update IntentType class**

Replace the existing IntentType class:

```python
class IntentType:
    """Simplified intent types for query classification."""
    DOCUMENT_QUERY = "document_query"  # Query about uploaded documents
    WEB_QUERY = "web_query"            # Query needing current web info
    GENERAL_QUERY = "general_query"    # General knowledge question
```

- [ ] **Step 2: Remove plan-related fields from RAGState**

Update the RAGState TypedDict to remove plan fields:

```python
class RAGState(TypedDict):
    """
    Main state for the RAG LangGraph.
    Simplified for CPU-optimized architecture.
    """

    # Core query and messages
    messages: Annotated[List[Dict[str, Any]], add_messages]
    query: str  # Original user query

    # Intent classification (simplified)
    intent: str  # DOCUMENT_QUERY, WEB_QUERY, or GENERAL_QUERY
    intent_confidence: float

    # Document search results
    documents: List[Dict[str, Any]]  # Retrieved from Milvus

    # Web search results
    web_results: List[Dict[str, Any]]  # From Tavily

    # Reranked results (for document queries)
    reranked_results: List[Dict[str, Any]]

    # Final response
    final_response: Optional[str]
    response_sources: List[Dict[str, Any]]

    # Agent execution tracking
    agent_executions: List[Dict[str, Any]]
    current_agent: Optional[str]

    # Session and metadata
    session_id: str
    request_id: str
    metadata: Dict[str, Any]

    # Error handling
    error: Optional[str]
    retry_count: int
```

- [ ] **Step 3: Remove unused state classes**

Delete these classes (no longer needed):
- `PlanNode`
- `PlanEdge`
- `ExecutionPlan`

Keep: `DocumentSearchState`, `WebSearchState`, `AgentExecution`

- [ ] **Step 4: Update create_initial_state function**

```python
def create_initial_state(
    query: str,
    session_id: str,
    request_id: str,
) -> RAGState:
    """Create initial state for a new query."""
    return {
        "messages": [],
        "query": query,
        "intent": "",
        "intent_confidence": 0.0,
        "documents": [],
        "web_results": [],
        "reranked_results": [],
        "final_response": None,
        "response_sources": [],
        "agent_executions": [],
        "current_agent": None,
        "session_id": session_id,
        "request_id": request_id,
        "metadata": {},
        "error": None,
        "retry_count": 0,
    }
```

- [ ] **Step 5: Commit state changes**

```bash
git add backend/graph/state.py
git commit -m "feat(state): simplify RAGState for new architecture

- Update IntentType to 3 simplified types
- Remove plan-related fields (plan, plan_validated, etc.)
- Remove unused state classes (PlanNode, PlanEdge, ExecutionPlan)
- Clean up initial state creation"
```

---

## Task 3: Create PDF Image Converter Service

**Files:**
- Create: `backend/services/pdf_image_converter.py`
- Create: `tests/test_pdf_converter.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_pdf_converter.py
import pytest
from services.pdf_image_converter import PDFImageConverter


class TestPDFImageConverter:
    """Tests for PDF to image conversion service."""

    def test_get_page_count_single_page(self, tmp_path):
        """Test getting page count for single page PDF."""
        # This will fail until we implement the service
        converter = PDFImageConverter()
        # Create a minimal test PDF
        test_pdf = tmp_path / "test.pdf"
        # For now, we'll mock this
        assert converter is not None

    def test_convert_page_to_image_returns_pil_image(self):
        """Test that conversion returns PIL Image."""
        converter = PDFImageConverter()
        # Will implement actual test after service exists
        assert hasattr(converter, 'convert_page')

    def test_batch_processing_memory_safe(self):
        """Test that batch processing limits memory."""
        converter = PDFImageConverter(dpi=200)
        assert converter.batch_size == 1  # One page at a time
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/test_pdf_converter.py -v
```
Expected: FAIL with "ModuleNotFoundError: No module named 'services.pdf_image_converter'"

- [ ] **Step 3: Implement PDF Image Converter**

```python
# backend/services/pdf_image_converter.py
"""
PDF to Image Converter Service
Converts PDF pages to images with memory-safe batch processing.
"""
import gc
import tempfile
from typing import List, Optional
from pathlib import Path
from io import BytesIO

from pdf2image import convert_from_path
from PIL import Image

from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


class PDFImageConverter:
    """
    Memory-safe PDF to image converter.
    Processes pages one at a time to avoid memory spikes on low-RAM systems.
    """

    def __init__(
        self,
        dpi: int = None,
        batch_size: int = None,
    ):
        """
        Initialize PDF converter.

        Args:
            dpi: Resolution for image conversion (default from settings)
            batch_size: Pages to process at once (1 for memory safety)
        """
        self.dpi = dpi or settings.pdf_dpi
        self.batch_size = batch_size or settings.pdf_batch_size
        logger.info(f"PDFImageConverter initialized (dpi={self.dpi}, batch_size={self.batch_size})")

    def get_page_count(self, pdf_path: str) -> int:
        """
        Get total number of pages in a PDF.

        Args:
            pdf_path: Path to PDF file

        Returns:
            Number of pages
        """
        try:
            from pdf2image.pdf2image import pdfinfo_from_path
            info = pdfinfo_from_path(pdf_path)
            return info.get("Pages", 0)
        except Exception as e:
            logger.error(f"Error getting page count: {e}")
            return 0

    def convert_page(
        self,
        pdf_path: str,
        page_num: int,
    ) -> Optional[Image.Image]:
        """
        Convert a single PDF page to an image.

        Args:
            pdf_path: Path to PDF file
            page_num: Page number (1-indexed)

        Returns:
            PIL Image or None on error
        """
        try:
            images = convert_from_path(
                pdf_path,
                first_page=page_num,
                last_page=page_num,
                dpi=self.dpi,
            )
            return images[0] if images else None
        except Exception as e:
            logger.error(f"Error converting page {page_num}: {e}")
            return None

    def convert_all_pages(
        self,
        pdf_path: str,
    ) -> List[Image.Image]:
        """
        Convert all PDF pages to images with memory-safe batching.

        Processes one page at a time to keep memory usage low (~100-200MB).

        Args:
            pdf_path: Path to PDF file

        Returns:
            List of PIL Images
        """
        total_pages = self.get_page_count(pdf_path)
        all_images = []

        logger.info(f"Converting {total_pages} pages from {pdf_path}")

        for page_num in range(1, total_pages + 1):
            # Convert ONE page at a time
            image = self.convert_page(pdf_path, page_num)

            if image:
                all_images.append(image)
                logger.debug(f"Converted page {page_num}/{total_pages}")

        logger.info(f"Converted {len(all_images)} pages successfully")
        return all_images

    async def convert_and_process(
        self,
        pdf_path: str,
        process_func,
    ) -> List:
        """
        Convert pages and process each one immediately.

        Memory-efficient: processes and clears each page before loading the next.

        Args:
            pdf_path: Path to PDF file
            process_func: Async function to process each image

        Returns:
            List of results from process_func
        """
        total_pages = self.get_page_count(pdf_path)
        results = []

        logger.info(f"Processing {total_pages} pages from {pdf_path}")

        for page_num in range(1, total_pages + 1):
            # Convert single page
            image = self.convert_page(pdf_path, page_num)

            if image:
                # Process immediately
                result = await process_func(image, page_num)
                results.append(result)

                # Clear image from memory
                del image
                gc.collect()

                logger.debug(f"Processed page {page_num}/{total_pages}")

        logger.info(f"Processed {len(results)} pages")
        return results

    def convert_from_bytes(
        self,
        pdf_bytes: bytes,
    ) -> List[Image.Image]:
        """
        Convert PDF bytes to images.

        Args:
            pdf_bytes: PDF file as bytes

        Returns:
            List of PIL Images
        """
        # Write to temp file (pdf2image needs file path)
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name

        try:
            return self.convert_all_pages(tmp_path)
        finally:
            # Clean up temp file
            Path(tmp_path).unlink(missing_ok=True)
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && python -m pytest tests/test_pdf_converter.py -v
```
Expected: PASS

- [ ] **Step 5: Commit PDF converter**

```bash
git add backend/services/pdf_image_converter.py tests/test_pdf_converter.py
git commit -m "feat(services): add memory-safe PDF to image converter

- Process pages one at a time (~100-200MB vs 1GB spike)
- Configurable DPI for memory/performance trade-off
- Support for both file path and bytes input
- Async processing with immediate cleanup"
```

---

## Task 4: Update Embedding Service

**Files:**
- Modify: `backend/services/embedding_service.py`

- [ ] **Step 1: Simplify to single model loading**

Replace the `__init__` method:

```python
def __init__(self):
    """Initialize the embedding service with single model."""
    self.model: Optional[SentenceTransformer] = None
    self.dimension: int = 384
    self.device = settings.embedding_device
    self.model_name = settings.default_embedding_model

    # Load the single model
    self._load_model()

    logger.info(
        f"Embedding service initialized with {self.model_name} "
        f"(dimension: {self.dimension}, device: {self.device})"
    )

def _load_model(self) -> None:
    """Load the embedding model."""
    try:
        logger.info(f"Loading embedding model: {self.model_name}")

        self.model = SentenceTransformer(
            self.model_name,
            device=self.device,
        )

        self.dimension = self.model.get_sentence_embedding_dimension()

        logger.info(f"Model loaded (dimension: {self.dimension})")

    except Exception as e:
        logger.error(f"Error loading model {self.model_name}: {e}")
        raise
```

- [ ] **Step 2: Remove multi-model methods**

Remove these methods:
- `embed_with_all_models()`
- `embed_documents_with_all_models()`

Keep and simplify:
- `embed_text()` - single model
- `embed_query()` - alias for embed_text
- `embed_documents()` - batch processing

- [ ] **Step 3: Remove padding method (no longer needed)**

Remove the `pad_embedding()` method since all embeddings are same dimension.

- [ ] **Step 4: Commit embedding service changes**

```bash
git add backend/services/embedding_service.py
git commit -m "feat(embedding): simplify to single gte-small model

- Remove multi-model support (memory optimization)
- Single 384-dimension embedding (gte-small)
- Remove padding logic (no longer needed)
- Reduces memory from ~3GB to ~130MB"
```

---

## Task 4.5: Milvus Collection Migration

**Files:**
- Modify: `backend/services/milvus_service.py`

**IMPORTANT:** The embedding dimension changes from 1024 to 384. Existing collections are incompatible.

- [ ] **Step 1: Update MilvusService to use new collection name**

In `backend/services/milvus_service.py`, update the collection name:

```python
# Update __init__ method
def __init__(self):
    # Use new collection with 384 dimensions
    self.collection_name = "document_embeddings_v2"
    self.dimension = 384  # Changed from 1024
```

- [ ] **Step 2: Add collection creation with new dimension**

Update the `_ensure_collection` method:

```python
async def _ensure_collection(self):
    """Ensure collection exists with correct dimension."""
    from pymilvus import Collection, FieldSchema, CollectionSchema, DataType

    try:
        # Check if new collection exists
        if utility.has_collection(self.collection_name):
            logger.info(f"Collection {self.collection_name} already exists")
            return

        # Create new collection with 384 dimensions
        fields = [
            FieldSchema(name="id", dtype=DataType.VARCHAR, max_length=255, is_primary=True),
            FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=384),
            # ... other fields
        ]

        schema = CollectionSchema(fields=fields, description="Document embeddings v2")
        collection = Collection(name=self.collection_name, schema=schema)

        # Create index
        index_params = {
            "index_type": "HNSW",
            "metric_type": "COSINE",
            "params": {"M": 16, "efConstruction": 256},
        }
        collection.create_index(field_name="embedding", index_params=index_params)

        logger.info(f"Created collection {self.collection_name} with 384 dimensions")

    except Exception as e:
        logger.error(f"Error creating collection: {e}")
        raise
```

- [ ] **Step 3: Update search method dimension check**

Ensure search validates embedding dimension:

```python
async def search(self, query_embedding: List[float], top_k: int = 20, ...):
    # Validate dimension
    if len(query_embedding) != 384:
        raise ValueError(f"Expected 384-dim embedding, got {len(query_embedding)}")
    # ... rest of search logic
```

- [ ] **Step 4: Commit Milvus migration changes**

```bash
git add backend/services/milvus_service.py
git commit -m "feat(milvus): migrate to 384-dimension collection

- Create new collection 'document_embeddings_v2' with 384 dims
- Add dimension validation in search
- Old collection preserved for rollback"
```

**NOTE:** Existing documents must be re-uploaded after this change.

---

## Task 5: Update Intent Classifier

**Files:**
- Modify: `backend/agents/orchestration/intent_classifier.py`
- Create: `tests/test_intent_classifier.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_intent_classifier.py
import pytest
from agents.orchestration.intent_classifier import IntentClassifierAgent
from graph.state import IntentType, create_initial_state


class TestIntentClassifier:
    """Tests for intent classification."""

    @pytest.fixture
    def agent(self):
        return IntentClassifierAgent()

    @pytest.fixture
    def state(self):
        return create_initial_state(
            query="What is in my uploaded document?",
            session_id="test",
            request_id="test-123"
        )

    def test_document_query_classification(self, agent, state):
        """Test that document-related queries are classified correctly."""
        state["query"] = "What does my report say about revenue?"
        # After execution, intent should be DOCUMENT_QUERY
        assert agent.agent_id == "intent_classifier"

    def test_web_query_classification(self, agent, state):
        """Test that web-related queries are classified correctly."""
        state["query"] = "What's the weather today?"
        assert agent.agent_id == "intent_classifier"

    def test_general_query_classification(self, agent, state):
        """Test that general queries are classified correctly."""
        state["query"] = "What is Python?"
        assert agent.agent_id == "intent_classifier"
```

- [ ] **Step 2: Update intent classifier prompt**

Replace the execute method with new 3-intent classification:

```python
async def execute(self, state: RAGState) -> RAGState:
    """Classify the user query into simplified intent type."""
    request_id = state.get("request_id", str(uuid.uuid4()))
    set_request_id(request_id)

    logger.info(f"Classifying intent for query: {state['query'][:50]}...")

    state = update_agent_execution(
        state,
        agent_id=self.agent_id,
        agent_name=self.agent_name,
        status="running",
        input_data={"query": state["query"]},
    )

    try:
        from services.gemini_service import GeminiService

        gemini_service = GeminiService()

        # Get document count for context
        doc_count = state.get("metadata", {}).get("doc_count", 0)

        prompt = f"""Analyze the user query and classify its intent.

Query: "{state['query']}"

Available knowledge base: {doc_count} documents uploaded

Classify as ONE of:
- DOCUMENT_QUERY: User is asking about information in their uploaded documents
  (e.g., "What does my report say about revenue?", "Find information about X in my files")
- WEB_QUERY: User needs current/real-time information from the web
  (e.g., "What's the weather?", "Latest news about X", "Current stock price")
- GENERAL_QUERY: General knowledge question, not specific to uploaded docs
  (e.g., "What is Python?", "Explain machine learning")

Output only the intent type and confidence (0-1) in format: INTENT|CONFIDENCE
Example: DOCUMENT_QUERY|0.95
"""

        response = await gemini_service.generate(prompt, temperature=0.1)

        # Parse response
        parts = response.strip().split("|")
        intent = parts[0].upper().strip() if len(parts) > 0 else IntentType.GENERAL_QUERY
        confidence = float(parts[1]) if len(parts) > 1 else 0.8

        # Normalize intent name (remove underscores if LLM added spaces)
        intent = intent.replace(" ", "_")

        # Validate intent
        valid_intents = [
            IntentType.DOCUMENT_QUERY,
            IntentType.WEB_QUERY,
            IntentType.GENERAL_QUERY,
        ]
        if intent not in valid_intents:
            intent = IntentType.GENERAL_QUERY  # Default for unknown

        state["intent"] = intent
        state["intent_confidence"] = confidence

        state = update_agent_execution(
            state,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status="completed",
            input_data={"query": state["query"]},
            output_data={"intent": intent, "confidence": confidence},
        )

        logger.info(f"Intent classified: {intent} (confidence: {confidence})")

    except Exception as e:
        logger.error(f"Error in intent classification: {e}")
        state["intent"] = IntentType.GENERAL_QUERY  # Default to general on error
        state["intent_confidence"] = 0.5
        state["error"] = str(e)

        state = update_agent_execution(
            state,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status="failed",
            input_data={"query": state["query"]},
            error_message=str(e),
        )

    return state
```

- [ ] **Step 3: Commit intent classifier changes**

```bash
git add backend/agents/orchestration/intent_classifier.py tests/test_intent_classifier.py
git commit -m "feat(agents): update intent classifier for 3-intent system

- Simplify to DOCUMENT_QUERY, WEB_QUERY, GENERAL_QUERY
- Add document count context to classification
- Default to GENERAL_QUERY for unknown intents
- Add unit tests"
```

---

## Task 6: Update Graph Edges (Routing Logic)

**Files:**
- Modify: `backend/graph/edges.py`

- [ ] **Step 1: Simplify route_by_intent function**

```python
def route_by_intent(state: RAGState) -> Literal["document_search", "web_search"]:
    """
    Route to appropriate agent based on classified intent.

    DOCUMENT_QUERY -> document_search -> reranker -> response_synthesis
    WEB_QUERY/GENERAL_QUERY -> web_search -> response_synthesis
    """
    intent = state.get("intent", "")
    confidence = state.get("intent_confidence", 0.0)

    logger.info(f"Routing by intent: {intent} (confidence: {confidence})")

    if intent == IntentType.DOCUMENT_QUERY:
        return "document_search"
    else:
        # WEB_QUERY and GENERAL_QUERY both go to web search
        return "web_search"
```

- [ ] **Step 2: Update should_rerank function**

```python
def should_rerank(state: RAGState) -> Literal["reranker", "response_synthesis"]:
    """
    Determine if reranking is needed.

    Only rerank for document search results with 3+ documents.
    Web search results skip reranker entirely.
    """
    intent = state.get("intent", "")

    # Skip reranker for non-document queries
    if intent != IntentType.DOCUMENT_QUERY:
        return "response_synthesis"

    # Rerank if we have enough document results
    documents = state.get("documents", [])
    if len(documents) >= 3:
        return "reranker"

    return "response_synthesis"
```

- [ ] **Step 3: Remove unused edge functions**

Remove these functions:
- `validate_plan_route()` - no longer needed
- `execute_plan_workflow()` - no longer needed

Keep:
- `route_by_intent()` - updated
- `should_rerank()` - updated
- `check_final_response()` - unchanged
- `has_error()` - unchanged

- [ ] **Step 4: Commit edge changes**

```bash
git add backend/graph/edges.py
git commit -m "feat(graph): simplify routing edges for new architecture

- route_by_intent: only 2 routes (document_search or web_search)
- should_rerank: only for document queries with 3+ results
- Remove plan-related edge functions"
```

---

## Task 7: Update Reranker with Lazy Loading

**Files:**
- Modify: `backend/services/baai_reranker_service.py`
- Modify: `backend/agents/execution/reranker.py`

- [ ] **Step 1: Implement lazy loading in reranker service**

```python
# backend/services/baai_reranker_service.py
"""
BAAI Reranker Service with Lazy Loading
Loads model only when needed, frees memory after use.
"""
import gc
from typing import List, Dict, Any, Optional

from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


class LazyReranker:
    """
    Lazy-loaded reranker for memory efficiency.
    Model is loaded only when first needed and can be unloaded to free memory.
    """
    _instance: Optional['LazyReranker'] = None
    _model = None

    def __init__(self):
        """Initialize without loading model."""
        self.model_name = settings.reranker_model
        self.device = settings.reranker_device
        logger.info(f"LazyReranker created (model will load on first use: {self.model_name})")

    @classmethod
    def get_instance(cls) -> 'LazyReranker':
        """Get or create the singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def _load_model(cls):
        """Load the reranker model."""
        if cls._model is None:
            from sentence_transformers import CrossEncoder
            instance = cls.get_instance()
            logger.info(f"Loading reranker model: {instance.model_name}")
            cls._model = CrossEncoder(
                instance.model_name,
                device=instance.device
            )
            logger.info("Reranker model loaded")
        return cls._model

    @classmethod
    def rerank(
        cls,
        query: str,
        documents: List[Dict[str, Any]],
        top_k: int = None,
    ) -> List[Dict[str, Any]]:
        """
        Rerank documents based on relevance to query.

        Args:
            query: User query
            documents: List of documents with 'content' field
            top_k: Number of top results to return

        Returns:
            Reranked list of documents
        """
        if not documents:
            return []

        top_k = top_k or settings.reranker_top_k
        model = cls._load_model()

        # Create query-document pairs
        pairs = [[query, doc.get("content", "")] for doc in documents]

        # Score pairs
        scores = model.predict(pairs)

        # Sort by score descending
        ranked = sorted(
            zip(documents, scores),
            key=lambda x: x[1],
            reverse=True
        )

        # Return top_k documents with scores
        results = []
        for doc, score in ranked[:top_k]:
            result = doc.copy()
            result["rerank_score"] = float(score)
            results.append(result)

        logger.info(f"Reranked {len(documents)} documents, returning top {len(results)}")
        return results

    @classmethod
    def unload(cls):
        """Unload model to free memory."""
        if cls._model is not None:
            logger.info("Unloading reranker model")
            cls._model = None
            gc.collect()
            logger.info("Reranker model unloaded, memory freed")


# Convenience function
def rerank_documents(
    query: str,
    documents: List[Dict[str, Any]],
    top_k: int = None,
) -> List[Dict[str, Any]]:
    """Rerank documents using lazy-loaded reranker."""
    return LazyReranker.rerank(query, documents, top_k)


def unload_reranker():
    """Unload reranker to free memory."""
    LazyReranker.unload()
```

- [ ] **Step 2: Update reranker agent to use lazy loading**

```python
# backend/agents/execution/reranker.py (update the execute method)
async def execute(self, state: RAGState) -> RAGState:
    """Rerank results using lazy-loaded BAAI reranker."""
    logger.info("Reranking results...")

    state = update_agent_execution(
        state,
        agent_id=self.agent_id,
        agent_name=self.agent_name,
        status="running",
        input_data={"document_count": len(state.get("documents", []))},
    )

    try:
        from services.baai_reranker_service import rerank_documents, unload_reranker

        documents = state.get("documents", [])
        query = state.get("query", "")

        if not documents:
            logger.warning("No documents to rerank")
            state["reranked_results"] = []
        else:
            # Rerank using lazy-loaded model
            reranked = rerank_documents(query, documents, top_k=settings.reranker_top_k)
            state["reranked_results"] = reranked

            # Unload model to free memory
            if settings.reranker_lazy_load:
                unload_reranker()

        state = update_agent_execution(
            state,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status="completed",
            input_data={"document_count": len(documents)},
            output_data={"reranked_count": len(state.get("reranked_results", []))},
        )

    except Exception as e:
        logger.error(f"Error in reranking: {e}")
        state["error"] = str(e)
        state["reranked_results"] = state.get("documents", [])

        state = update_agent_execution(
            state,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status="failed",
            error_message=str(e),
        )

    return state
```

- [ ] **Step 3: Commit reranker changes**

```bash
git add backend/services/baai_reranker_service.py backend/agents/execution/reranker.py
git commit -m "feat(reranker): implement lazy loading for memory efficiency

- Load model only when first rerank is called
- Unload model after use to free ~200MB
- Configurable via settings.reranker_lazy_load"
```

---

## Task 8: Update Document Processor with OCR Pipeline

**Files:**
- Modify: `backend/services/document_processor.py`

- [ ] **Step 1: Add PDF OCR pipeline integration**

Update the `_process_pdf` method to use OCR:

```python
async def _process_pdf(
    self,
    content: bytes,
    filename: str,
    extract_images: bool = True,
) -> Dict[str, Any]:
    """Process PDF document with OCR for all pages."""
    text_parts = []
    images = []
    metadata = {}

    try:
        import tempfile
        from pathlib import Path
        from services.pdf_image_converter import PDFImageConverter
        from services.paddle_ocr_service import PaddleOCRService

        # Save to temp file for pdf2image
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            # Get PDF metadata first
            pdf_file = io.BytesIO(content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)

            if pdf_reader.metadata:
                metadata = {
                    "title": pdf_reader.metadata.get("/Title", ""),
                    "author": pdf_reader.metadata.get("/Author", ""),
                    "pages": len(pdf_reader.pages),
                }

            # Convert PDF pages to images and OCR
            converter = PDFImageConverter(dpi=200)
            ocr_service = PaddleOCRService()

            total_pages = converter.get_page_count(tmp_path)
            logger.info(f"Processing PDF with {total_pages} pages via OCR")

            for page_num in range(1, total_pages + 1):
                # Convert single page to image
                image = converter.convert_page(tmp_path, page_num)

                if image:
                    # OCR the image
                    image_bytes = io.BytesIO()
                    image.save(image_bytes, format='PNG')
                    ocr_result = await ocr_service.extract_text(
                        image_bytes.getvalue(),
                        f"page_{page_num}.png"
                    )

                    extracted_text = ocr_result.get("text", "")
                    if extracted_text.strip():
                        text_parts.append({
                            "page": page_num,
                            "text": extracted_text.strip(),
                            "confidence": ocr_result.get("confidence", 0),
                        })

                    # Clear memory
                    del image
                    import gc
                    gc.collect()

        finally:
            # Clean up temp file
            Path(tmp_path).unlink(missing_ok=True)

        # Combine all text
        full_text = "\n\n".join(part["text"] for part in text_parts)

        return {
            "text": full_text,
            "pages": text_parts,
            "images": images,
            "metadata": metadata,
        }

    except Exception as e:
        logger.error(f"Error processing PDF: {e}")
        raise
```

- [ ] **Step 2: Update TXT/MD processing (skip OCR)**

```python
async def _process_text(
    self,
    content: bytes,
    filename: str,
) -> Dict[str, Any]:
    """
    Process plain text file.
    No OCR needed for text files - extract directly.
    """
    try:
        # Try UTF-8 first
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            # Try other encodings
            for encoding in ['latin-1', 'cp1252', 'iso-8859-1']:
                try:
                    text = content.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                text = content.decode('utf-8', errors='ignore')

        return {
            "text": text.strip(),
            "pages": [{"page": 1, "text": text.strip()}],
            "images": [],
            "metadata": {"encoding": "utf-8", "ocr_used": False},
        }

    except Exception as e:
        logger.error(f"Error processing text file: {e}")
        raise
```

- [ ] **Step 3: Commit document processor changes**

```bash
git add backend/services/document_processor.py
git commit -m "feat(document-processor): integrate OCR for PDF processing

- Convert PDF pages to images and OCR each page
- Process pages one at a time for memory safety
- Skip OCR for TXT/MD files (direct extraction)
- Add confidence tracking for OCR results"
```

---

## Task 9: Update Document Search Agent

**Files:**
- Modify: `backend/agents/execution/document_search.py`

- [ ] **Step 1: Simplify to single embedding model**

```python
async def execute(self, state: RAGState) -> RAGState:
    """Search documents using single embedding model."""
    logger.info(f"Searching documents for: {state['query'][:50]}...")

    state = update_agent_execution(
        state,
        agent_id=self.agent_id,
        agent_name=self.agent_name,
        status="running",
        input_data={"query": state["query"]},
    )

    try:
        from services.embedding_service import get_embedding_service
        from services.milvus_service import MilvusService

        embedding_service = get_embedding_service()
        milvus_service = MilvusService()

        # Generate query embedding with single model
        query_embedding = await embedding_service.embed_query(state["query"])

        # Search Milvus
        results = await milvus_service.search(
            query_embedding=query_embedding,
            top_k=20,  # Get more for reranking
        )

        state["documents"] = results

        state = update_agent_execution(
            state,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status="completed",
            input_data={"query": state["query"]},
            output_data={"document_count": len(results)},
        )

        logger.info(f"Found {len(results)} documents")

    except Exception as e:
        logger.error(f"Error in document search: {e}")
        state["error"] = str(e)
        state["documents"] = []

        state = update_agent_execution(
            state,
            agent_id=self.agent_id,
            agent_name=self.agent_name,
            status="failed",
            error_message=str(e),
        )

    return state
```

- [ ] **Step 2: Commit document search changes**

```bash
git add backend/agents/execution/document_search.py
git commit -m "feat(document-search): simplify to single embedding model

- Remove multi-model search loop
- Use gte-small (384d) only
- Reduces search latency and memory usage"
```

---

## Task 10: Update Graph (rag_graph.py)

**Files:**
- Modify: `backend/graph/rag_graph.py`

- [ ] **Step 1: Simplify graph structure**

```python
def build_rag_graph():
    """
    Build and compile the simplified RAG LangGraph.

    Flow:
    - intent_classifier -> (document_search | web_search)
    - document_search -> reranker -> response_synthesis -> END
    - web_search -> response_synthesis -> END
    """
    workflow = StateGraph(RAGState)

    # Get all registered agents as nodes
    nodes = AgentRegistry.get_all_nodes()

    # Filter to only needed agents
    needed_agents = [
        "intent_classifier",
        "document_search",
        "web_search",
        "reranker",
        "response_synthesis",
    ]

    for agent_id in needed_agents:
        if agent_id in nodes:
            workflow.add_node(agent_id, nodes[agent_id])
            logger.info(f"Added node: {agent_id}")

    # Entry point
    workflow.set_entry_point("intent_classifier")

    # Conditional routing after intent classification
    workflow.add_conditional_edges(
        "intent_classifier",
        route_by_intent,
        {
            "document_search": "document_search",
            "web_search": "web_search",
        },
    )

    # Document path: document_search -> reranker (conditional) -> response_synthesis
    workflow.add_conditional_edges(
        "document_search",
        should_rerank,
        {
            "reranker": "reranker",
            "response_synthesis": "response_synthesis",
        },
    )

    # Reranker always goes to response synthesis
    workflow.add_edge("reranker", "response_synthesis")

    # Web path: web_search -> response_synthesis
    workflow.add_edge("web_search", "response_synthesis")

    # Response synthesis ends the flow
    workflow.add_edge("response_synthesis", END)

    # Compile with checkpointer
    checkpointer = None
    try:
        if settings.postgres_url:
            checkpointer = AsyncPostgresSaver.from_conn_string(settings.postgres_url)
            logger.info("PostgreSQL checkpointer configured")
    except Exception as e:
        logger.warning(f"Could not configure checkpointer: {e}")

    app = workflow.compile(checkpointer=checkpointer)
    logger.info("RAG LangGraph compiled successfully")

    return app
```

- [ ] **Step 2: Commit graph changes**

```bash
git add backend/graph/rag_graph.py
git commit -m "feat(graph): simplify to 2-path architecture

- DOCUMENT_QUERY: intent -> doc_search -> reranker -> response -> END
- WEB/GENERAL: intent -> web_search -> response -> END
- Remove plan-related nodes and edges"
```

---

## Task 11: Delete Deprecated Agents

**Files:**
- Delete: `backend/agents/orchestration/plan_generator.py`
- Delete: `backend/agents/orchestration/plan_validator.py`
- Delete: `backend/agents/execution/ocr.py`
- Delete: `backend/agents/execution/url_processing.py`

- [ ] **Step 1: Delete deprecated files**

```bash
rm backend/agents/orchestration/plan_generator.py
rm backend/agents/orchestration/plan_validator.py
rm backend/agents/execution/ocr.py
rm backend/agents/execution/url_processing.py
```

- [ ] **Step 2: Update agents __init__.py**

Remove imports for deleted agents from:
- `backend/agents/orchestration/__init__.py`
- `backend/agents/execution/__init__.py`
- `backend/agents/__init__.py`

- [ ] **Step 3: Commit deletions**

```bash
git add -A
git commit -m "refactor(agents): remove deprecated agents

- Remove plan_generator (no complex planning)
- Remove plan_validator (no plans to validate)
- Remove ocr agent (OCR moved to ingestion)
- Remove url_processing (Tavily handles web content)"
```

---

## Task 12: Update Requirements and Dockerfile

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `Dockerfile.backend`

- [ ] **Step 1: Add pdf2image dependency**

Add to `backend/requirements.txt`:
```
pdf2image>=1.16.0
```

- [ ] **Step 2: Update Dockerfile for poppler**

Add to `Dockerfile.backend`:
```dockerfile
# Install poppler for PDF to image conversion
RUN apt-get update && apt-get install -y poppler-utils && rm -rf /var/lib/apt/lists/*
```

- [ ] **Step 3: Commit infrastructure changes**

```bash
git add backend/requirements.txt Dockerfile.backend
git commit -m "feat(infrastructure): add PDF processing dependencies

- Add pdf2image for PDF to image conversion
- Install poppler-utils in Docker image"
```

---

## Task 13: Integration Test

**Files:**
- Create: `tests/test_integration.py`

- [ ] **Step 1: Write integration test**

```python
# tests/test_integration.py
"""
Integration tests for RAG architecture.
"""
import pytest
from graph.state import create_initial_state, IntentType
from graph.rag_graph import build_rag_graph


class TestRAGIntegration:
    """Integration tests for the full RAG pipeline."""

    @pytest.fixture
    def graph(self):
        return build_rag_graph()

    def test_graph_builds_successfully(self, graph):
        """Test that graph compiles without errors."""
        assert graph is not None

    def test_intent_routes_to_document_search(self):
        """Test DOCUMENT_QUERY routes to document_search."""
        from graph.edges import route_by_intent

        state = create_initial_state(
            query="What is in my document?",
            session_id="test",
            request_id="test"
        )
        state["intent"] = IntentType.DOCUMENT_QUERY

        result = route_by_intent(state)
        assert result == "document_search"

    def test_intent_routes_to_web_search(self):
        """Test WEB_QUERY routes to web_search."""
        from graph.edges import route_by_intent

        state = create_initial_state(
            query="What's the weather?",
            session_id="test",
            request_id="test"
        )
        state["intent"] = IntentType.WEB_QUERY

        result = route_by_intent(state)
        assert result == "web_search"

    def test_reranker_skipped_for_web_queries(self):
        """Test that reranker is skipped for web queries."""
        from graph.edges import should_rerank

        state = create_initial_state(
            query="What's the weather?",
            session_id="test",
            request_id="test"
        )
        state["intent"] = IntentType.WEB_QUERY
        state["documents"] = [{"content": "test"}]

        result = should_rerank(state)
        assert result == "response_synthesis"
```

- [ ] **Step 2: Run integration tests**

```bash
cd backend && python -m pytest tests/test_integration.py -v
```
Expected: All tests PASS

- [ ] **Step 3: Commit integration tests**

```bash
git add tests/test_integration.py
git commit -m "test(integration): add architecture verification tests

- Test graph builds successfully
- Test intent routing (document vs web)
- Test reranker is skipped for web queries"
```

---

## Task 14: Final Verification and Cleanup

- [ ] **Step 1: Run all tests**

```bash
cd backend && python -m pytest tests/ -v
```

- [ ] **Step 2: Verify imports work**

```bash
cd backend && python -c "
from graph.rag_graph import build_rag_graph
from graph.state import IntentType, create_initial_state
from services.pdf_image_converter import PDFImageConverter
from services.baai_reranker_service import LazyReranker
print('All imports successful')
"
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup for RAG architecture redesign

- Verify all tests pass
- Clean up any remaining references
- Update any missed imports"
```

---

## Success Criteria Checklist

- [ ] System runs on 4GB RAM machine
- [ ] Document ingestion with OCR works for all file types
- [ ] Intent classifier correctly routes queries (DOCUMENT_QUERY vs WEB_QUERY vs GENERAL_QUERY)
- [ ] Document queries return relevant answers from Milvus
- [ ] Web queries return relevant answers from Tavily
- [ ] Memory usage stays under 4GB during normal operation
- [ ] Response latency < 5 seconds for most queries
- [ ] All tests pass

---

## Related Files

- Spec: `docs/superpowers/specs/2026-03-22-rag-architecture-redesign-design.md`
