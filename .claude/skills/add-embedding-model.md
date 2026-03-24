---
name: add-embedding-model
description: Add new embedding model to MilvusService
---

Add a new embedding model to the vector database service.

## Usage
```
/add-embedding-model <model-name> [--dimension 768] [--provider huggingface|openai]
```

## Current Models
- bge-small-en (384d)
- bge-large-en (1024d)
- stella-base-en (768d)

## Implementation
1. Add model to `EmbeddingService`
2. Create new collection in Milvus
3. Update `MilvusService.search()` to support model
4. Add to document processing pipeline

## Template
```python
# In embedding_service.py
self._models["<model_name>"] = SentenceTransformer("<model_path>")

# In milvus_service.py
def create_collection_for_model(self, model_name: str, dimension: int):
    collection_name = f"documents_{model_name}"
    # Create collection with dimension
```

## Examples
```
/add-embedding-model all-MiniLM-L6-v2 --dimension 384
/add-embedding-model text-embedding-3-small --provider openai
```
