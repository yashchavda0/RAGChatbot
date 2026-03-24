# RAG Chatbot - Startup Guide

## Prerequisites

- **Docker & Docker Compose** (for Docker setup)
- **Python 3.11+** and **uv** (for local development)
- **Node.js 20+** and **npm** (for frontend)
- **API Keys**: Gemini, Tavily

---

## Option 1: Docker (Recommended for Production)

### 1. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
```bash
GEMINI_API_KEY=your_actual_key
TAVILY_API_KEY=your_actual_key
```

### 2. Start All Services

```bash
# Start everything (Postgres, Milvus, Redis, Backend, Frontend)
docker-compose up -d

# View logs
docker-compose logs -f backend
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 4. Stop Services

```bash
docker-compose down
```

---

## Option 2: Local Development with uv

### 1. Start Infrastructure Services (Docker)

Start only the databases:

```bash
docker-compose up -d postgres milvus-standalone etcd minio redis
```

### 2. Backend Setup (with uv)

```bash
cd backend

# Install uv if not already installed
pip install uv

# Create virtual environment and install dependencies
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -r requirements.txt

# Create .env file
cp ../.env.example .env
# Edit .env with your API keys

# Run backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup (Next.js 14)

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local

# Run dev server
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## Option 3: Pure Local Development (Everything Local)

If you want to run Postgres, Milvus, and Redis locally without Docker:

### Backend (with uv)

```bash
cd backend

# Install dependencies with uv
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt

# Update .env with local connection strings
# POSTGRES_URL=postgresql://user:password@localhost:5432/rag_chatbot
# MILVUS_HOST=localhost
# REDIS_URL=redis://localhost:6379/0

# Run backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## API Key Setup

### Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add to `.env`: `GEMINI_API_KEY=your_key`

### Tavily API Key
1. Go to [Tavily](https://tavily.com/)
2. Sign up and get API key
3. Add to `.env`: `TAVILY_API_KEY=your_key`

---

## Verification

### Check Backend Health
```bash
curl http://localhost:8000/health
```

### Check Frontend
Open http://localhost:3000 in browser

### Test Chat
1. Open http://localhost:3000/chat
2. Send a message
3. Observe agent execution in real-time

---

## Troubleshooting

### Backend Issues

**LangGraph import error:**
```bash
# Make sure all dependencies are installed
uv pip install --upgrade langgraph langchain langchain-google-genai
```

**PostgreSQL connection error:**
```bash
# Check if Postgres is running
docker ps | grep postgres

# Check logs
docker logs rag-postgres
```

**Milvus connection error:**
```bash
# Check if Milvus is ready
curl http://localhost:9091/metrics/health
```

### Frontend Issues

**Module not found:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**API connection error:**
```bash
# Check NEXT_PUBLIC_API_URL in .env.local
# Should be: NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Development Tips

1. **Hot Reload**: Both backend (uvicorn --reload) and frontend (npm run dev) support hot reload
2. **Database Tables**: Auto-created on backend startup via SQLAlchemy
3. **Logging**: Check backend logs for agent execution details
4. **WebSocket**: Real-time agent updates on chat page

---

## Project Structure Reference

```
rag-chatbot/
├── docker-compose.yml          # Docker orchestration
├── .env.example                # Environment template
├── backend/
│   ├── main.py                 # FastAPI entry point
│   ├── requirements.txt        # Python dependencies
│   ├── config/                 # Settings, logging
│   ├── agents/                 # Agent implementations
│   ├── graph/                  # LangGraph workflow
│   ├── services/               # Business logic
│   └── api/                    # API routes
└── frontend/                   # Next.js 14 frontend
    ├── app/                    # App Router pages
    ├── components/             # React components
    ├── hooks/                  # Custom hooks
    ├── lib/                    # Utilities
    ├── public/                 # Static assets
    └── src/                    # Source code
```
