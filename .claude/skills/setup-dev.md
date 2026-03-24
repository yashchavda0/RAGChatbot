---
name: setup-dev
description: Initialize development environment for new developers
disable-model-invocation: true
---

Set up complete development environment for the RAG Chatbot project.

## Usage
```
/setup-dev [--check] [--fix]
```

## Prerequisites
| Software | Version | Purpose |
|----------|---------|---------|
| Python | 3.10+ | Backend runtime |
| Node.js | 18.x+ | Frontend runtime |
| Docker | Latest | Containers |
| Git | 2.x | Version control |

## Setup Steps
1. Clone repository
2. Copy `.env.example` to `.env`
3. Add API keys (GEMINI_API_KEY, TAVILY_API_KEY)
4. Install backend dependencies: `pip install -r requirements.txt`
5. Install frontend dependencies: `npm install`
6. Start infrastructure: `docker-compose up -d postgres milvus redis`

## Service URLs
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

## Examples
```
/setup-dev --check
/setup-dev --fix
```
