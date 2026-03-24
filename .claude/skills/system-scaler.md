---
name: system-scaler
description: Tools to improve and scale the RAG system
---

Optimize and scale the RAG chatbot system.

## Usage
```
/system-scaler <action> [options]
```

## Actions
- `analyze`: Analyze system bottlenecks
- `optimize`: Apply optimizations
- `benchmark`: Run performance benchmarks
- `capacity`: Calculate capacity requirements
- `scale`: Scale specific components

## Optimization Areas

### Database
- Connection pooling
- Query optimization
- Index tuning
- Read replicas

### Vector Search
- HNSW index parameters
- Collection partitioning
- Caching strategies

### LLM
- Response caching
- Prompt optimization
- Token management
- Batch processing

### Infrastructure
- Horizontal scaling
- Load balancing
- Auto-scaling rules

## Metrics
| Metric | Target |
|--------|--------|
| Query latency | < 2s p95 |
| Throughput | 100 req/s |
| Vector search | < 100ms |
| LLM response | < 3s |

## Examples
```
/system-scaler analyze
/system-scaler optimize milvus
/system-scaler benchmark --duration 60s
```
