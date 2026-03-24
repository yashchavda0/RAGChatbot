---
name: db-builder
description: Build and manage database schemas, indexes, and queries
---

Create and manage database schemas and indexes.

## Usage
```
/db-builder <action> [options]
```

## Actions
- `create-table`: Generate table schema
- `add-index`: Create database index
- `add-column`: Add new column
- `create-relation`: Add foreign key
- `optimize`: Analyze and optimize schema

## PostgreSQL Template
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    messages JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_session ON conversations(session_id);
```

## Milvus Collection
```python
from pymilvus import Collection, FieldSchema, CollectionSchema, DataType

fields = [
    FieldSchema(name="id", dtype=DataType.INT64, is_primary=True),
    FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=768),
    FieldSchema(name="content", dtype=DataType.VARCHAR, max_length=65535),
]
```

## Examples
```
/db-builder create-table feedback
/db-builder add-index documents embedding
```
