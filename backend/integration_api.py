from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, List
import os
from rag_service import RAGService

router = APIRouter(prefix="/api/v1", tags=["integration"])

API_KEY = os.getenv("INTEGRATION_API_KEY", "your-secret-api-key")

def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key

class IntegrationChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    context: Optional[str] = None

class IntegrationChatResponse(BaseModel):
    response: str
    sources: List[str]
    session_id: str

class ChatbotConfig(BaseModel):
    name: str
    description: str
    system_prompt: Optional[str] = None
    max_tokens: Optional[int] = 1000
    temperature: Optional[float] = 0.7

rag_service = RAGService()

@router.post("/chat", response_model=IntegrationChatResponse)
async def integration_chat(
    request: IntegrationChatRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Chat endpoint for external applications to integrate with the RAG chatbot.
    
    Headers required:
    - X-API-Key: Your integration API key
    
    Body:
    - message: The user's message
    - session_id: Optional session identifier for conversation context
    - context: Optional additional context for the conversation
    """
    try:
        if request.context:
            enhanced_message = f"Context: {request.context}\n\nUser Question: {request.message}"
        else:
            enhanced_message = request.message
            
        response = await rag_service.chat(enhanced_message, request.session_id)
        
        return IntegrationChatResponse(
            response=response["response"],
            sources=response["sources"],
            session_id=request.session_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def integration_status(api_key: str = Depends(verify_api_key)):
    """
    Get the status of the RAG chatbot system.
    """
    try:
        documents = await rag_service.list_documents()
        total_chunks = sum(doc["chunks"] for doc in documents)
        
        return {
            "status": "active",
            "total_documents": len(documents),
            "total_chunks": total_chunks,
            "ready": len(documents) > 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config")
async def get_chatbot_config(api_key: str = Depends(verify_api_key)):
    """
    Get the current chatbot configuration.
    """
    return ChatbotConfig(
        name="RAG Chatbot",
        description="AI assistant trained on your uploaded documents",
        system_prompt="You are a helpful AI assistant that answers questions based on the provided document context.",
        max_tokens=1000,
        temperature=0.7
    )

@router.get("/documents/summary")
async def get_documents_summary(api_key: str = Depends(verify_api_key)):
    """
    Get a summary of all uploaded documents.
    """
    try:
        documents = await rag_service.list_documents()
        return {
            "total_documents": len(documents),
            "documents": [
                {
                    "id": doc["document_id"][:8],
                    "filename": doc["filename"],
                    "chunks": doc["chunks"]
                }
                for doc in documents
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook/test")
async def test_webhook(api_key: str = Depends(verify_api_key)):
    """
    Test endpoint for webhook integrations.
    """
    return {
        "message": "Webhook test successful",
        "timestamp": "2024-01-01T00:00:00Z",
        "chatbot_status": "active"
    }