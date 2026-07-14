"""
WebSocket connection manager for real-time agent execution updates.
"""

from typing import Dict, Set, List, Any
from fastapi import WebSocket, WebSocketDisconnect
import json
import uuid
from config.logging_config import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self):
        """Initialize the connection manager."""
        # session_id -> list of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # request_id -> WebSocket connection
        self.request_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str) -> str:
        """
        Connect a WebSocket for a session.

        Args:
            websocket: WebSocket connection
            session_id: Session identifier

        Returns:
            Request ID for tracking this connection
        """
        await websocket.accept()

        request_id = str(uuid.uuid4())

        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()

        self.active_connections[session_id].add(websocket)
        self.request_connections[request_id] = websocket

        logger.info(
            f"WebSocket connected: session={session_id}, request={request_id[:8]}"
        )

        # Send connection acknowledgment
        await websocket.send_json(
            {
                "type": "connected",
                "request_id": request_id,
                "session_id": session_id,
            }
        )

        return request_id

    def disconnect(self, websocket: WebSocket, session_id: str) -> None:
        """Disconnect a WebSocket."""
        if session_id in self.active_connections:
            self.active_connections[session_id].discard(websocket)

            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

        # Remove from request connections
        to_remove = [
            req_id for req_id, ws in self.request_connections.items() if ws == websocket
        ]
        for req_id in to_remove:
            del self.request_connections[req_id]

        logger.info(f"WebSocket disconnected: session={session_id}")

    async def send_personal_message(
        self,
        message: dict,
        websocket: WebSocket,
    ) -> None:
        """Send a message to a specific WebSocket."""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")

    async def broadcast_to_session(
        self,
        message: dict,
        session_id: str,
    ) -> None:
        """Broadcast a message to all connections in a session."""
        if session_id not in self.active_connections:
            return

        disconnected = []
        # Iterate over a copy to avoid "Set changed size during iteration" errors
        for connection in list(self.active_connections[session_id]):
            try:
                # WebSocketState: CONNECTING=0, CONNECTED=1, DISCONNECTING=2, DISCONNECTED=3
                # Only send if in CONNECTED state (1)
                if connection.client_state.value != 1:
                    disconnected.append(connection)
                    continue

                await connection.send_json(message)
            except RuntimeError as e:
                # Connection already closed or in invalid state
                logger.debug(f"Connection in invalid state: {e}")
                disconnected.append(connection)
            except Exception as e:
                logger.error(f"Error broadcasting to connection: {e}")
                disconnected.append(connection)

        # Clean up disconnected connections
        for connection in disconnected:
            self.active_connections[session_id].discard(connection)
            # Also remove from request_connections
            to_remove = [
                req_id
                for req_id, ws in self.request_connections.items()
                if ws == connection
            ]
            for req_id in to_remove:
                del self.request_connections[req_id]

    async def send_agent_update(
        self,
        session_id: str,
        request_id: str,
        agent_id: str,
        agent_name: str,
        status: str,
        data: dict,
    ) -> None:
        """Send an agent execution update."""
        message = {
            "type": "agent_update",
            "data": {
                "agent_id": agent_id,
                "agent_name": agent_name,
                "status": status,
                "output_data": data.get("output"),
                "error_message": data.get("error"),
            },
        }

        await self.broadcast_to_session(message, session_id)

    async def send_progress_update(
        self,
        session_id: str,
        request_id: str,
        progress: dict,
    ) -> None:
        """Send a progress update."""
        message = {
            "type": "progress",
            "request_id": request_id,
            "session_id": session_id,
            "progress": progress,
        }

        await self.broadcast_to_session(message, session_id)

    async def send_response(
        self,
        session_id: str,
        request_id: str,
        response: str,
        sources: List[dict],
        token_usage: dict = None,
        response_time_ms: int = None,
        intent_confidence: float = None,
        retrieval_confidence: float = None,
        answer_source: str = None,
        fallback_reason: str = None,
        suggested_questions: List[str] = None,
    ) -> None:
        """Send the final response, optionally including metrics."""
        message = {
            "type": "response",
            "request_id": request_id,
            "session_id": session_id,
            "response": response,
            "sources": sources,
        }

        if token_usage is not None:
            message["token_usage"] = token_usage

        if response_time_ms is not None:
            message["response_time_ms"] = int(response_time_ms)

        if intent_confidence is not None:
            message["intent_confidence"] = float(intent_confidence)

        if retrieval_confidence is not None:
            message["retrieval_confidence"] = float(retrieval_confidence)

        if answer_source is not None:
            message["answer_source"] = answer_source

        if fallback_reason is not None:
            message["fallback_reason"] = fallback_reason

        if suggested_questions:
            message["suggested_questions"] = suggested_questions

        await self.broadcast_to_session(message, session_id)

    async def send_error(
        self,
        session_id: str,
        request_id: str,
        error: str,
    ) -> None:
        """Send an error message."""
        message = {
            "type": "error",
            "request_id": request_id,
            "session_id": session_id,
            "error": error,
        }

        await self.broadcast_to_session(message, session_id)

    def get_connection_count(self, session_id: str) -> int:
        """Get number of active connections for a session."""
        return len(self.active_connections.get(session_id, set()))


# Global connection manager instance
manager = ConnectionManager()
