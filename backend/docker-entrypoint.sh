#!/bin/bash
set -e

echo "=== RAG Chatbot Backend Startup ==="

# Wait for PostgreSQL (using Python + psycopg2)
echo "Waiting for database..."
until python -c "import psycopg2; psycopg2.connect('${POSTGRES_URL:-postgresql://raguser:ragpassword@postgres:5432/rag_chatbot}')" 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 2
done
echo "Database is ready!"

# Wait for Milvus (only if configured)
if [ -n "${MILVUS_HOST}" ]; then
  echo "Waiting for Milvus..."
  until curl -sf "http://${MILVUS_HOST}:${MILVUS_PORT:-19530}/v1/health" > /dev/null 2>&1 || \
        curl -sf "http://${MILVUS_HOST}:9091/healthz" > /dev/null 2>&1; do
    echo "Milvus is unavailable - sleeping"
    sleep 2
  done
  echo "Milvus is ready!"
else
  echo "Milvus not configured (embeddings via Gemini API)"
fi

# Wait for Redis (using TCP check)
echo "Waiting for Redis..."
REDIS_HOST=${REDIS_HOST:-redis}
REDIS_PORT=${REDIS_PORT:-6379}
until (echo > /dev/tcp/${REDIS_HOST}/${REDIS_PORT}) 2>/dev/null; do
  echo "Redis is unavailable - sleeping"
  sleep 2
done
echo "Redis is ready!"

echo "Starting application..."
exec "$@"
