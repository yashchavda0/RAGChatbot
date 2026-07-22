"""
Chat routes for the RAG chatbot API.
Each chat is associated with a specific chatbot and its knowledge base.
"""

import uuid
from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
    Request,
    HTTPException,
    Path,
)
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from config.logging_config import get_logger, set_request_id
from graph.rag_graph import process_query, stream_query
from services.session_manager import get_session_manager
from services.chatbot_service import get_chatbot_service
from services.milvus_service import get_milvus_service
from services.cache_service import get_cache_service
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
    sources: List[Dict[str, Any]] = Field(
        default_factory=list, description="Source citations"
    )
    session_id: str = Field(..., description="Session identifier")
    chatbot_id: str = Field(..., description="Chatbot identifier")
    from_web_search: bool = Field(
        default=False, description="Response from web search only"
    )
    agent_executions: List[Dict[str, Any]] = Field(
        default_factory=list, description="Agent execution info"
    )
    token_usage: Optional[Dict[str, Any]] = Field(default=None)
    response_time_ms: Optional[int] = Field(default=None)
    intent_confidence: Optional[float] = Field(default=None)
    retrieval_confidence: Optional[float] = Field(default=None)
    # V2 fields
    answer_source: str = Field(default="documents", description="'documents' or 'web'")
    reasoning_mode: str = Field(default="fast_rag", description="Reasoning mode used")
    retrieval_latency_ms: Optional[float] = Field(default=None)
    generation_latency_ms: Optional[float] = Field(default=None)
    cache_hits: Optional[Dict[str, bool]] = Field(default=None)
    reranker_top_score: Optional[float] = Field(default=None)
    web_fallback_triggered: bool = Field(default=False)
    fallback_reason: Optional[str] = Field(default=None)
    suggested_questions: List[str] = Field(default_factory=list)


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

    logger.info(
        f"Chat request: chatbot={chatbot_id}, session={chat_message.session_id}"
    )

    try:
        # Verify chatbot exists and is active
        chatbot_service = get_chatbot_service()
        chatbot = await chatbot_service.get(chatbot_id)

        if not chatbot:
            raise HTTPException(
                status_code=404, detail=f"Chatbot {chatbot_id} not found"
            )

        if chatbot.get("status") == "error":
            raise HTTPException(
                status_code=400,
                detail=f"Chatbot has errors. Status: {chatbot.get('status')}",
            )

        # Ensure session exists
        session_manager = get_session_manager()
        session = await session_manager.get_session(chat_message.session_id)

        if not session:
            await session_manager.create_session(session_id=chat_message.session_id)

        # Check if chatbot has knowledge base
        milvus_service = get_milvus_service()
        has_knowledge = await milvus_service.has_knowledge_base(chatbot_id)

        # Check response cache before running full pipeline
        cache = get_cache_service()
        q_hash = cache.compute_query_hash(chat_message.message, chatbot_id)
        cached_resp = await cache.get_response(q_hash, chatbot_id)
        if cached_resp:
            logger.info(f"Response cache hit: chatbot={chatbot_id}")
            await session_manager.add_message(
                session_id=chat_message.session_id,
                chatbot_id=chatbot_id,
                role="user",
                content=chat_message.message,
            )
            await session_manager.add_message(
                session_id=chat_message.session_id,
                chatbot_id=chatbot_id,
                role="assistant",
                content=cached_resp.get("final_response", ""),
                sources=cached_resp.get("response_sources", []),
            )
            await session_manager.update_activity(chat_message.session_id)
            return ChatResponse(
                response=cached_resp.get("final_response", ""),
                sources=cached_resp.get("response_sources", []),
                session_id=chat_message.session_id,
                chatbot_id=chatbot_id,
                answer_source=cached_resp.get("answer_source", "documents"),
                token_usage=cached_resp.get("token_usage"),
                cache_hits={"response": True},
            )

        # Process query through LangGraph with chatbot context
        state = await process_query(
            query=chat_message.message,
            session_id=chat_message.session_id,
            chatbot_id=chatbot_id,
            system_prompt=chatbot.get("system_prompt"),
            has_knowledge_base=has_knowledge,
        )

        response = state.get("final_response") or "I couldn't generate a response."
        sources = state.get("response_sources", [])
        agent_executions = state.get("agent_executions", [])
        from_web_search = state.get("from_web_search_only", False)

        # Save to conversation history
        await session_manager.add_message(
            session_id=chat_message.session_id,
            chatbot_id=chatbot_id,
            role="user",
            content=chat_message.message,
        )
        await session_manager.add_message(
            session_id=chat_message.session_id,
            chatbot_id=chatbot_id,
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
            token_usage=state.get("token_usage"),
            response_time_ms=state.get("response_time_ms"),
            intent_confidence=state.get("intent_confidence"),
            retrieval_confidence=state.get("reranker_top_score"),
            # V2 fields
            answer_source=state.get("answer_source", "documents"),
            reasoning_mode=state.get("reasoning_mode", "fast_rag"),
            retrieval_latency_ms=state.get("retrieval_latency_ms"),
            generation_latency_ms=state.get("generation_latency_ms"),
            cache_hits=state.get("cache_hits"),
            reranker_top_score=state.get("reranker_top_score"),
            web_fallback_triggered=state.get("web_fallback_triggered", False),
            fallback_reason=state.get("fallback_reason"),
            suggested_questions=state.get("suggested_questions", []),
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

                    # Extract agent_executions from node state events
                    if isinstance(event, dict):
                        for node_name, node_state in event.items():
                            if (
                                isinstance(node_state, dict)
                                and "agent_executions" in node_state
                            ):
                                # Send updates for all agents in the executions list
                                for agent_exec in node_state.get(
                                    "agent_executions", []
                                ):
                                    if agent_exec.get("status") in [
                                        "running",
                                        "completed",
                                        "failed",
                                    ]:
                                        await manager.send_agent_update(
                                            session_id=session_id,
                                            request_id=request_id,
                                            agent_id=agent_exec.get("agent_id", ""),
                                            agent_name=agent_exec.get("agent_name", ""),
                                            status=agent_exec.get("status", ""),
                                            data={
                                                "input": agent_exec.get("input_data"),
                                                "output": agent_exec.get("output_data"),
                                                "error": agent_exec.get(
                                                    "error_message"
                                                ),
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

                response = (
                    final_state.get("final_response")
                    or "I couldn't generate a response."
                )
                sources = final_state.get("response_sources", [])
                from_web_search = final_state.get("from_web_search_only", False)
                token_usage = final_state.get("token_usage")
                response_time_ms = final_state.get("response_time_ms")
                intent_confidence = final_state.get("intent_confidence")
                retrieval_confidence = final_state.get("reranker_top_score")
                # V2 fields
                answer_source = final_state.get("answer_source", "documents")
                reasoning_mode = final_state.get("reasoning_mode", "fast_rag")
                retrieval_latency_ms = final_state.get("retrieval_latency_ms")
                generation_latency_ms = final_state.get("generation_latency_ms")
                cache_hits = final_state.get("cache_hits")
                reranker_top_score = final_state.get("reranker_top_score")
                web_fallback_triggered = final_state.get(
                    "web_fallback_triggered", False
                )
                fallback_reason = final_state.get("fallback_reason")
                suggested_questions = final_state.get("suggested_questions", [])

                # Send response only if connection is still active (CONNECTED state = 1)
                if websocket.client_state.value == 1:
                    await manager.send_response(
                        session_id=session_id,
                        request_id=request_id,
                        response=response,
                        sources=sources,
                        token_usage=token_usage,
                        response_time_ms=response_time_ms,
                        intent_confidence=intent_confidence,
                        retrieval_confidence=retrieval_confidence,
                        answer_source=answer_source,
                        fallback_reason=fallback_reason,
                        suggested_questions=suggested_questions,
                    )

                    await manager.broadcast_to_session(
                        {
                            "type": "done",
                            "request_id": request_id,
                            "session_id": session_id,
                            "chatbot_id": chatbot_id,
                            "from_web_search": from_web_search,
                            "token_usage": token_usage,
                            "response_time_ms": response_time_ms,
                            # V2 fields
                            "answer_source": answer_source,
                            "reasoning_mode": reasoning_mode,
                            "retrieval_latency_ms": retrieval_latency_ms,
                            "generation_latency_ms": generation_latency_ms,
                            "cache_hits": cache_hits,
                            "reranker_top_score": reranker_top_score,
                            "web_fallback_triggered": web_fallback_triggered,
                            "fallback_reason": fallback_reason,
                            "suggested_questions": suggested_questions,
                        },
                        session_id,
                    )

                await session_manager.add_message(
                    session_id=session_id,
                    chatbot_id=chatbot_id,
                    role="user",
                    content=message,
                )
                await session_manager.add_message(
                    session_id=session_id,
                    chatbot_id=chatbot_id,
                    role="assistant",
                    content=response,
                    sources=sources,
                )
                await session_manager.update_activity(session_id)

            except Exception as e:
                logger.error(f"Error in WebSocket handler: {e}")
                await manager.send_error(
                    session_id=session_id, request_id=request_id, error=str(e)
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
        logger.info(
            f"WebSocket disconnected: chatbot={chatbot_id}, session={session_id}"
        )
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, session_id)
