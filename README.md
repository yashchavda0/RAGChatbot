# RAG-Based Chatbot

A complete RAG (Retrieval-Augmented Generation) chatbot system that allows users to upload documents, train an AI assistant, and chat with their knowledge base. The system is built with FastAPI backend and Next.js 14 frontend, featuring Milvus for vector storage and Gemini AI for language generation.

## Features

- **Document Upload**: Support for PDF, DOCX, and TXT files
- **URL Processing**: Process documents from web URLs
- **Vector Search**: ChromaDB integration for efficient document retrieval
- **Chat Interface**: Interactive conversation with your documents
- **Document Management**: View and delete uploaded documents
- **API Integration**: RESTful APIs for external application integration
- **Docker Support**: Easy deployment with Docker containers

## Architecture

```
Frontend (React) ↔ Backend (FastAPI) ↔ Vector DB (ChromaDB) ↔ LLM (OpenAI)
```

### Core Components

1. **Document Processing**: Extracts text from uploaded files and splits into chunks
2. **Embeddings**: Converts text chunks into vector embeddings using sentence-transformers
3. **Vector Storage**: Stores embeddings in ChromaDB for fast similarity search
4. **RAG Pipeline**: Retrieves relevant chunks and generates responses using OpenAI GPT
5. **Integration API**: Secure endpoints for external application integration

## Prerequisites

- Python 3.11+
- Node.js 18+
- OpenAI API Key
- Docker (optional, for containerized deployment)

## Installation

### Local Development

#### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create environment file:
```bash
cp .env.example .env
```

5. Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=your_openai_api_key_here
INTEGRATION_API_KEY=your_integration_api_key_here
```

6. Start the backend server:
```bash
python main.py
```

The backend will be available at `http://localhost:8000`

#### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Docker Deployment

1. Create `.env` file in the root directory:
```bash
cp backend/.env.example .env
```

2. Add your API keys to `.env`

3. Build and start containers:
```bash
docker-compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`

## Usage

### Web Interface

1. **Upload Documents**: Use the "Upload Documents" tab to upload PDF, DOCX, or TXT files
2. **Process URLs**: Enter URLs to process web-based documents
3. **Chat**: Use the "Chat" tab to ask questions about your uploaded documents
4. **Manage Documents**: View and delete documents in the "My Documents" tab

### API Integration

The system provides secure REST APIs for external integration:

#### Authentication

Include your API key in the header:
```
X-API-Key: your_integration_api_key_here
```

#### Endpoints

**Chat with Documents**
```http
POST /api/v1/chat
Content-Type: application/json
X-API-Key: your_api_key

{
  "message": "What is the main topic of the documents?",
  "session_id": "user-123",
  "context": "Additional context if needed"
}
```

**Get System Status**
```http
GET /api/v1/status
X-API-Key: your_api_key
```

**Get Documents Summary**
```http
GET /api/v1/documents/summary
X-API-Key: your_api_key
```

### External Integration Example

```javascript
const response = await fetch('http://localhost:8000/api/v1/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_integration_api_key_here'
  },
  body: JSON.stringify({
    message: 'Explain the key concepts from the uploaded documents',
    session_id: 'user-session-123'
  })
});

const data = await response.json();
console.log(data.response); // AI response
console.log(data.sources); // Source documents used
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for GPT responses | Required |
| `INTEGRATION_API_KEY` | API key for external integrations | `your-secret-api-key` |
| `REACT_APP_API_URL` | Backend API URL for frontend | `http://localhost:8000` |

### Customization

- **Chunk Size**: Modify `chunk_size` in `rag_service.py` (default: 1000)
- **Overlap**: Adjust `chunk_overlap` in `rag_service.py` (default: 200)
- **Embeddings Model**: Change `model_name` in `RAGService.__init__()` 
- **LLM Settings**: Modify `temperature` and other OpenAI parameters

## API Documentation

Interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## File Structure

```
rag-chatbot/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   ├── config/              # Settings and logging
│   ├── agents/              # Agent implementations
│   ├── graph/               # LangGraph workflow
│   ├── services/            # Business logic
│   └── api/                 # API routes
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilities
│   │   └── types/           # TypeScript types
│   ├── public/              # Static assets
│   ├── Dockerfile           # Frontend container
│   ├── package.json         # Node.js dependencies
│   └── next.config.mjs      # Next.js configuration
├── docker-compose.yml       # Docker orchestration
└── README.md
```

## Troubleshooting

### Common Issues

1. **OpenAI API Errors**: Ensure your API key is valid and has sufficient credits
2. **ChromaDB Issues**: Delete `./backend/chroma_db` folder to reset vector database
3. **File Upload Errors**: Check file size limits and supported formats (PDF, DOCX, TXT)
4. **CORS Issues**: Ensure backend is running on port 8000

### Development Tips

- Use `docker-compose logs backend` to view backend logs
- Check browser console for frontend errors
- Monitor API responses in browser Network tab
- Restart containers after environment changes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review API documentation
3. Open an issue on GitHub
4. Contact support team

---

Built with ❤️ using FastAPI, React, ChromaDB, and OpenAI