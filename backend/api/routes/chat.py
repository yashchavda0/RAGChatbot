"""
Chat routes for the RAG chatbot API.
Each chat is associated with a specific chatbot and its knowledge base.
"""
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request, HTTPException, Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from config.logging_config import get_logger, set_request_id
from graph.rag_graph import process_query, stream_query
from services.session_manager import get_session_manager
from services.chatbot_service import get_chatbot_service
from services.milvus_service import get_milvus_service
from api.websocket import manager

router = APIRouter(tags=["chat"])
logger = get_logger(__name__)


# Request/Response schemas
class ChatMessage(BaseModel):
    """User chat message."""
    message: str = Field(..., description="User's message")
    session_id: str = Field(default="default", description="Session identifier")


class ChatResponse(BaseModel):
    """Chat response from the assistant."""
    response: str = Field(..., description="Assistant's response")
    sources: List[Dict[str, Any]] = Field(default_factory=list, description="Source citations")
    session_id: str = Field(..., description="Session identifier")
    chatbot_id: str = Field(..., description="Chatbot identifier")
    from_web_search: bool = Field(default=False, description="Response from web search only")
    agent_executions: List[Dict[str, Any]] = Field(default_factory=list, description="Agent execution info")


@router.post("/chat/{chatbot_id}", response_model=ChatResponse)
async def chat(
    chatbot_id: str = Path(..., description="Chatbot ID"),
    chat_message: ChatMessage = None,
):
    """
    Process a chat message through the RAG system for a specific chatbot.

    The chatbot's knowledge base is searched first. If no relevant chunks
    are found, web search is used as a fallback.
    """
    request_id = str(uuid.uuid4())
    set_request_id(request_id)

    logger.info(f"Chat request: chatbot={chatbot_id}, session={chat_message.session_id}")

    try:
        # Verify chatbot exists and is active
        chatbot_service = get_chatbot_service()
        chatbot = await chatbot_service.get(chatbot_id)

        if not chatbot:
            raise HTTPException(status_code=404, detail=f"Chatbot {chatbot_id} not found")

        if chatbot.get("status") not in ["active", "training"]:
            raise HTTPException(
                status_code=400,
                detail=f"Chatbot is not ready. Status: {chatbot.get('status')}"
            )

        # Ensure session exists
        session_manager = get_session_manager()
        session = await session_manager.get_session(chat_message.session_id)

        if not session:
            await session_manager.create_session(session_id=chat_message.session_id)

        # Check if chatbot has knowledge base
        milvus_service = get_milvus_service()
        has_knowledge = await milvus_service.has_knowledge_base(chatbot_id)

        # Process query through LangGraph with chatbot context
        state = await process_query(
            query=chat_message.message,
            session_id=chat_message.session_id,
            chatbot_id=chatbot_id,
            system_prompt=chatbot.get("system_prompt"),
            has_knowledge_base=has_knowledge,
        )

        response = state.get("final_response", "I couldn't generate a response.")
        sources = state.get("response_sources", [])
        agent_executions = state.get("agent_executions", [])
        from_web_search = state.get("from_web_search_only", False)

        # Save to conversation history
        await session_manager.add_message(
            session_id=chat_message.session_id,
            role="user",
            content=chat_message.message,
        )
        await session_manager.add_message(
            session_id=chat_message.session_id,
            role="assistant",
            content=response,
            sources=sources,
            agent_executions=agent_executions,
        )
        await session_manager.update_activity(chat_message.session_id)

        return ChatResponse(
            response=response,
            sources=sources,
            session_id=chat_message.session_id,
            chatbot_id=chatbot_id,
            from_web_search=from_web_search,
            agent_executions=agent_executions,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/chat/{chatbot_id}/ws")
async def chat_websocket(
    websocket: WebSocket,
    chatbot_id: str,
):
    """
    WebSocket endpoint for real-time chat with a specific chatbot.

    Connect: ws://localhost:8000/chat/{chatbot_id}/ws?session_id=your_session_id

    Sends updates for:
    - Agent execution status
    - Progress updates
    - Final response
    - Errors
    """
    session_id = websocket.query_params.get("session_id", "default")

    try:
        # Verify chatbot exists
        chatbot_service = get_chatbot_service()
        chatbot = await chatbot_service.get(chatbot_id)

        if not chatbot:
            await websocket.close(code=4004, reason=f"Chatbot {chatbot_id} not found")
            return

        request_id = await manager.connect(websocket, session_id)
        set_request_id(request_id)
        logger.info(f"WebSocket connected: chatbot={chatbot_id}, session={session_id}")

        # Ensure session exists
        session_manager = get_session_manager()
        session = await session_manager.get_session(session_id)
        if not session:
            await session_manager.create_session(session_id=session_id)

        while True:
            data = await websocket.receive_json()
            message = data.get("message", "")

            if not message:
                continue

            try:
                # Check if chatbot has knowledge base
                milvus_service = get_milvus_service()
                has_knowledge = await milvus_service.has_knowledge_base(chatbot_id)

                # Stream query execution
                final_state = None
                async for event in stream_query(
                    query=message,
                    session_id=session_id,
                    chatbot_id=chatbot_id,
                    system_prompt=chatbot.get("system_prompt"),
                    has_knowledge_base=has_knowledge,
                ):
                    if isinstance(event, dict) and event.get("__final_state__"):
                        final_state = event.get("state")
                        continue

                    if isinstance(event, dict) and "agent_executions" in event:
                        for agent_exec in event.get("agent_executions", []):
                            if agent_exec.get("status") in ["running", "completed", "failed"]:
                                await manager.send_agent_update(
                                    session_id=session_id,
                                    request_id=request_id,
                                    agent_id=agent_exec.get("agent_id", ""),
                                    agent_name=agent_exec.get("agent_name", ""),
                                    status=agent_exec.get("status", ""),
                                    data={
                                        "input": agent_exec.get("input_data"),
                                        "output": agent_exec.get("output_data"),
                                        "error": agent_exec.get("error_message"),
                                    },
                                )

                if final_state is None:
                    final_state = await process_query(
                        query=message,
                        session_id=session_id,
                        chatbot_id=chatbot_id,
                        system_prompt=chatbot.get("system_prompt"),
                        has_knowledge_base=has_knowledge,
                    )

                response = final_state.get("final_response", "")
                sources = final_state.get("response_sources", [])
                from_web_search = final_state.get("from_web_search_only", False)

                await manager.send_response(
                    session_id=session_id,
                    request_id=request_id,
                    response=response,
                    sources=sources,
                )

                await manager.broadcast_to_session(
                    {
                        "type": "done",
                        "request_id": request_id,
                        "session_id": session_id,
                        "chatbot_id": chatbot_id,
                        "from_web_search": from_web_search,
                    },
                    session_id,
                )

                await session_manager.add_message(
                    session_id=session_id, role="user", content=message
                )
                await session_manager.add_message(
                    session_id=session_id, role="assistant", content=response, sources=sources
                )
                await session_manager.update_activity(session_id)

            except Exception as e:
                logger.error(f"Error in WebSocket handler: {e}")
                await manager.send_error(session_id=session_id, request_id=request_id, error=str(e))

    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
        logger.info(f"WebSocket disconnected: chatbot={chatbot_id}, session={session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, session_id)
