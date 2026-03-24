# RAG Chatbot - Deployment Guide

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Configuration](#2-environment-configuration)
3. [Docker Compose Deployment](#3-docker-compose-deployment)
4. [Production Deployment](#4-production-deployment)
5. [Local Development](#5-local-development)
6. [Troubleshooting](#6-troubleshooting)
7. [Monitoring and Logging](#7-monitoring-and-logging)

---

## 1. Prerequisites

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 8 GB | 16+ GB |
| Disk | 20 GB | 50+ GB SSD |
| Docker | 4.0+ | Latest |
| Docker Compose | 2.0+ | Latest |

### Required API Keys

| Service | Purpose | Get Key |
|---------|---------|---------|
| Google Gemini | LLM generation | [Google AI Studio](https://makersuite.google.com/app/apikey) |
| Tavily | Web search | [Tavily](https://tavily.com/) |

### Software Dependencies

- **Docker Desktop** 4.0 or later
- **Docker Compose** 2.0 or later
- **Git** (for cloning the repository)
- **curl** or **Postman** (for API testing)

---

## 2. Environment Configuration

### 2.1 Create Environment File

Create a `.env` file in the project root directory:

```env
# =============================================================================
# REQUIRED API KEYS
# =============================================================================

# Google Gemini API Key (required for LLM generation)
GEMINI_API_KEY=your-gemini-api-key-here

# Tavily API Key (required for web search)
TAVILY_API_KEY=your-tavily-api-key-here

# =============================================================================
# SECURITY SETTINGS
# =============================================================================

# Integration API Key (min 32 characters for production)
# Used for /api/v1/* endpoints
INTEGRATION_API_KEY=your-secure-integration-api-key-min-32-chars

# PostgreSQL Password
POSTGRES_PASSWORD=your-secure-postgres-password

# MinIO Secret Key
MINIO_SECRET_KEY=your-secure-minio-secret-key

# =============================================================================
# OPTIONAL OVERRIDES
# =============================================================================

# PostgreSQL User (default: raguser)
POSTGRES_USER=raguser

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Environment (development/production)
ENVIRONMENT=development
```

### 2.2 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | - | Google Gemini API key |
| `TAVILY_API_KEY` | Yes | - | Tavily web search API key |
| `INTEGRATION_API_KEY` | Yes* | auto-generated | API key for integration endpoints |
| `POSTGRES_PASSWORD` | Yes | - | PostgreSQL password |
| `POSTGRES_USER` | No | `raguser` | PostgreSQL username |
| `MINIO_SECRET_KEY` | Yes | - | MinIO secret key |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Allowed CORS origins |
| `ENVIRONMENT` | No | `development` | Environment mode |

*In development, a random key is auto-generated if not set. Production requires explicit setting.

---

## 3. Docker Compose Deployment

### 3.1 Service Overview

```mermaid
graph LR
    subgraph User Access
        BROWSER[Browser]
    end

    subgraph Docker Network
        FE[Frontend<br/>:3000]
        BE[Backend<br/>:8000]
        PG[(PostgreSQL<br/>:5432)]
        MIL[(Milvus<br/>:19530)]
        RED[(Redis<br/>:6379)]
        ETCD[etcd<br/>:2379]
        MINIO[MinIO<br/>:9000]
    end

    BROWSER --> FE
    BROWSER --> BE
    FE --> BE
    BE --> PG
    BE --> MIL
    BE --> RED
    MIL --> ETCD
    MIL --> MINIO
```

### 3.2 Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd rag-chatbot

# Create .env file (see Section 2.1)
cp .env.example .env
# Edit .env with your API keys

# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 3.3 Service Ports

| Service | Container Name | Port | Purpose |
|---------|----------------|------|---------|
| Frontend | rag-chatbot-frontend | 3000 | Next.js UI |
| Backend | rag-chatbot-backend | 8000 | FastAPI |
| PostgreSQL | rag-postgres | 5432 | Database |
| Milvus | rag-milvus | 19530 | Vector DB |
| Redis | rag-redis | 6379 | Cache |
| etcd | rag-etcd | 2379 | Milvus metadata |
| MinIO | rag-minio | 9000 | Object storage |

### 3.4 Common Commands

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d postgres redis milvus-standalone

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v

# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend

# Restart a service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build

# Check resource usage
docker stats
```

### 3.5 Health Verification

```bash
# Check API health
curl http://localhost:8000/health

# Expected response
{
  "status": "healthy",
  "database": "configured",
  "milvus": {"status": "connected", "count": 0},
  "redis": "connected"
}
```

### 3.6 Accessing Services

| Service | URL |
|---------|-----|
| Frontend UI | http://localhost:3000 |
| API Documentation | http://localhost:8000/docs |
| ReDoc Documentation | http://localhost:8000/redoc |
| API Root | http://localhost:8000 |

---

## 4. Production Deployment

### 4.1 Security Checklist

- [ ] Change all default passwords
- [ ] Set `ENVIRONMENT=production`
- [ ] Use strong `INTEGRATION_API_KEY` (32+ characters)
- [ ] Configure proper `CORS_ORIGINS`
- [ ] Enable HTTPS/TLS
- [ ] Set up firewall rules
- [ ] Configure rate limiting
- [ ] Enable authentication for public endpoints
- [ ] Set up backup strategies
- [ ] Configure log aggregation

### 4.2 Environment Variables (Production)

```env
# Production Environment
ENVIRONMENT=production

# API Keys (keep secure!)
GEMINI_API_KEY=prod-gemini-key
TAVILY_API_KEY=prod-tavily-key

# Security
INTEGRATION_API_KEY=use-a-secure-random-32-char-key-here
POSTGRES_PASSWORD=use-a-secure-password
MINIO_SECRET_KEY=use-a-secure-secret-key

# CORS (restrict to your domains)
CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
```

### 4.3 Docker Compose Production Overrides

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    environment:
      - ENVIRONMENT=production
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
    restart: always

  frontend:
    environment:
      - NODE_ENV=production
    restart: always

  postgres:
    deploy:
      resources:
        limits:
          memory: 1G
    restart: always

  milvus-standalone:
    deploy:
      resources:
        limits:
          memory: 4G
    restart: always

  redis:
    deploy:
      resources:
        limits:
          memory: 512M
    restart: always
```

Deploy with:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 4.4 Reverse Proxy (Nginx)

Example Nginx configuration:

```nginx
upstream backend {
    server localhost:8000;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # API
    location /api/ {
        proxy_pass http://backend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /chat/ws {
        proxy_pass http://backend/chat/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4.5 Scaling Considerations

**Horizontal Scaling:**

```yaml
# docker-compose.scale.yml
services:
  backend:
    deploy:
      replicas: 3
```

**Load Balancer:**

Use a load balancer (Nginx, HAProxy, AWS ALB) to distribute traffic across backend replicas.

**Database Considerations:**

- Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
- Configure connection pooling
- Set up read replicas for heavy read workloads

**Milvus Clustering:**

For production, consider Milvus cluster mode instead of standalone:

```yaml
# See Milvus documentation for cluster deployment
# https://milvus.io/docs/install_cluster-helm.md
```

---

## 5. Local Development

### 5.1 Infrastructure Only

Start only the infrastructure services for local backend development:

```bash
# Start infrastructure
docker-compose up -d postgres milvus-standalone etcd minio redis

# Set environment variables for local dev
export POSTGRES_URL="postgresql://raguser:ragpassword@localhost:5432/rag_chatbot"
export MILVUS_HOST="localhost"
export MILVUS_PORT="19530"
export REDIS_URL="redis://localhost:6379/0"
```

### 5.2 Backend Development

```bash
cd backend

# Create virtual environment
uv venv

# Activate virtual environment
source .venv/bin/activate  # Linux/Mac
# or
.venv\Scripts\activate     # Windows

# Install dependencies
uv pip install -r requirements.txt

# Run development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5.3 Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

### 5.4 Development Environment Variables

Create `backend/.env`:

```env
# Local Development Settings
GEMINI_API_KEY=your-gemini-api-key
TAVILY_API_KEY=your-tavily-api-key

# Local Infrastructure
POSTGRES_URL=postgresql://raguser:ragpassword@localhost:5432/rag_chatbot
MILVUS_HOST=localhost
MILVUS_PORT=19530
REDIS_URL=redis://localhost:6379/0

# CORS for local dev
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Logging
LOG_LEVEL=DEBUG
LOG_FORMAT=text
```

---

## 6. Troubleshooting

### 6.1 Common Issues

#### Services Won't Start

```bash
# Check logs
docker-compose logs

# Common causes:
# - Port already in use
# - Missing .env file
# - Invalid environment variables

# Check port usage
netstat -tlnp | grep -E '3000|8000|5432|6379|19530'
```

#### Backend Health Check Fails

```bash
# Check backend logs
docker-compose logs backend

# Common causes:
# - Database not ready
# - Milvus not connected
# - Missing API keys

# Verify services are healthy
docker-compose ps
```

#### Milvus Connection Error

```bash
# Wait for Milvus to fully start (can take 30-60 seconds)
docker-compose logs milvus-standalone

# Restart Milvus
docker-compose restart milvus-standalone
```

#### Redis Connection Error

```bash
# Check Redis status
docker-compose exec redis redis-cli ping

# Expected: PONG
```

#### Database Connection Error

```bash
# Check PostgreSQL
docker-compose exec postgres pg_isready -U raguser

# Connect to database
docker-compose exec postgres psql -U raguser -d rag_chatbot
```

### 6.2 Reset Everything

```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove all images (optional)
docker-compose down --rmi all -v

# Start fresh
docker-compose up -d
```

### 6.3 Useful Debug Commands

```bash
# Enter backend container
docker-compose exec backend bash

# Enter database container
docker-compose exec postgres bash

# Check container resource usage
docker stats

# Inspect container
docker inspect rag-chatbot-backend

# View container network
docker network ls
docker network inspect rag-chatbot_default
```

---

## 7. Monitoring and Logging

### 7.1 Log Configuration

Configure logging via environment variables:

```env
LOG_LEVEL=INFO          # DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_FORMAT=json         # json or text
```

### 7.2 Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# With timestamps
docker-compose logs -f -t backend
```

### 7.3 Log Structure (JSON Format)

```json
{
  "timestamp": "2026-03-22T10:00:00.000Z",
  "level": "INFO",
  "message": "Query processed successfully",
  "logger": "graph.rag_graph",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "user-123"
}
```

### 7.4 Health Monitoring

Set up health checks in your monitoring system:

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Overall system health |
| `GET /` | API availability |

### 7.5 Metrics Collection (Optional)

For production, consider adding:

- **Prometheus** for metrics collection
- **Grafana** for visualization
- **Loki** for log aggregation

Example Prometheus scrape config:

```yaml
scrape_configs:
  - job_name: 'rag-chatbot'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'
```

---

## Quick Reference

### Essential Commands

| Command | Description |
|---------|-------------|
| `docker-compose up -d` | Start all services |
| `docker-compose down` | Stop all services |
| `docker-compose logs -f` | View logs |
| `docker-compose ps` | Check status |
| `curl localhost:8000/health` | Health check |

### URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API Docs | http://localhost:8000/docs |
| Health | http://localhost:8000/health |

### Files

| File | Purpose |
|------|---------|
| `.env` | Environment configuration |
| `docker-compose.yml` | Service definitions |
| `backend/requirements.txt` | Python dependencies |
| `frontend/package.json` | Node.js dependencies |
