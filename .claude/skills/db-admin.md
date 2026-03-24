---
name: db-admin
description: Database administration tasks (PostgreSQL, Milvus, Redis)
disable-model-invocation: true
---

Manage and administer project databases.

## Usage
```
/db-admin <action> [options]
```

## Actions
- `status`: Check database health
- `backup`: Create database backup
- `restore`: Restore from backup
- `migrate`: Run pending migrations
- `rollback`: Rollback last migration
- `stats`: Show database statistics
- `optimize`: Optimize tables/indexes

## Databases
| Database | Port | Purpose |
|----------|------|---------|
| PostgreSQL | 5432 | Conversation memory |
| Milvus | 19530 | Vector embeddings |
| Redis | 6379 | Caching |

## Commands
```bash
# PostgreSQL
docker exec rag-postgres pg_dump -U raguser rag_chatbot > backup.sql

# Milvus
curl http://localhost:9091/api/v1/collections

# Redis
docker exec rag-redis redis-cli INFO
```

## Examples
```
/db-admin status
/db-admin backup postgres
/db-admin stats milvus
```
