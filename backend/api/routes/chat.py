"""
Chat routes for the RAG chatbot API.
Handles query processing via LangGraph and WebSocket streaming.
"""
import uuid
import asyncio
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from config.logging_config import get_logger, set_request_id
from graph.rag_graph import process_query, stream_query
from services.session_manager import get_session_manager
from api.websocket import manager
from api.schemas.chat import ChatMessage, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])
logger = get_logger(__name__)


@router.post("", response_model=ChatResponse)
async def chat(chat_message: ChatMessage):
    """
    Process a chat message through the RAG system.

    This endpoint processes the user query through the LangGraph agent system,
    which classifies intent, generates/validates plans, and executes agents
    to produce a comprehensive response with source citations.
    """
    request_id = str(uuid.uuid4())
    set_request_id(request_id)

    logger.info(f"Received chat message for session: {chat_message.session_id}")

    try:
        # Ensure session exists
        session_manager = get_session_manager()
        session = await session_manager.get_session(chat_message.session_id)

        if not session:
            # Create new session
            await session_manager.create_session(session_id=chat_message.session_id)
            logger.info(f"Created new session: {chat_message.session_id}")

        # Process query through LangGraph
        state = await process_query(
            query=chat_message.message,
            session_id=chat_message.session_id,
        )

        # Extract response
        response = state.get("final_response", "I apologize, but I couldn't generate a response.")
        sources = state.get("response_sources", [])
        agent_executions = state.get("agent_executions", [])

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

        # Update session activity
        await session_manager.update_activity(chat_message.session_id)

        return ChatResponse(
            response=response,
            sources=sources,
            session_id=chat_message.session_id,
            agent_executions=agent_executions,
        )

    except Exception as e:
        logger.error(f"Error processing chat message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/ws")
async def chat_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time chat with agent execution updates.

    Connect with: ws://localhost:8000/chat/ws?session_id=your_session_id

    The WebSocket will send updates for:
    - Agent execution status
    - Progress updates
    - Final response
    - Errors
    """
    # Get session_id from query params
    session_id = websocket.query_params.get("session_id", "default")

    try:
        # Accept connection and get request_id
        request_id = await manager.connect(websocket, session_id)
        set_request_id(request_id)

        logger.info(f"WebSocket connected: session={session_id}, request={request_id[:8]}")

        # Ensure session exists
        session_manager = get_session_manager()
        session = await session_manager.get_session(session_id)

        if not session:
            await session_manager.create_session(session_id=session_id)

        # Receive messages from client
        while True:
            data = await websocket.receive_json()
            message = data.get("message", "")

            if not message:
                continue

            logger.info(f"WebSocket message received: {message[:50]}...")

            try:
                # Stream query execution and capture final state
                final_state = None
                async for event in stream_query(
                    query=message,
                    session_id=session_id,
                ):
                    # Check for final state marker
                    if isinstance(event, dict) and event.get("__final_state__"):
                        final_state = event.get("state")
                        continue

                    # Handle different event types
                    if isinstance(event, dict):
                        # State update event
                        if "agent_executions" in event:
                            # Send agent execution updates
                            agent_executions = event.get("agent_executions", [])

                            for agent_exec in agent_executions:
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

                    elif isinstance(event, tuple):
                        # Graph execution event
                        for node_name, node_state in event:
                            if node_state:
                                # Send node execution update
                                await manager.send_progress_update(
                                    session_id=session_id,
                                    request_id=request_id,
                                    progress={
                                        "node": node_name,
                                        "state": "executing",
                                    },
                                )

                # Use captured final state (avoid re-executing the graph)
                if final_state is None:
                    logger.warning("No final state captured from stream, falling back to process_query")
                    final_state = await process_query(
                        query=message,
                        session_id=session_id,
                    )

                response = final_state.get("final_response", "")
                sources = final_state.get("response_sources", [])

                # Send final response
                await manager.send_response(
                    session_id=session_id,
                    request_id=request_id,
                    response=response,
                    sources=sources,
                )

                # Send completion message
                await manager.broadcast_to_session(
                    {
                        "type": "done",
                        "request_id": request_id,
                        "session_id": session_id,
                    },
                    session_id,
                )

                # Save to conversation history
                await session_manager.add_message(
                    session_id=session_id,
                    role="user",
                    content=message,
                )

                await session_manager.add_message(
                    session_id=session_id,
                    role="assistant",
                    content=response,
                    sources=sources,
                )

                await session_manager.update_activity(session_id)

            except Exception as e:
                logger.error(f"Error in WebSocket message handling: {e}")
                await manager.send_error(
                    session_id=session_id,
                    request_id=request_id,
                    error=str(e),
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
        logger.info(f"WebSocket disconnected: session={session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, session_id)
