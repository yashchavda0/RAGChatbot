'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { WSMessage, AgentUpdateMessage } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

interface UseWebSocketOptions {
  onMessage?: (message: WSMessage) => void;
  onAgentUpdate?: (update: AgentUpdateMessage['data']) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  sendMessage: (message: Record<string, unknown>) => void;
  connect: (chatbotId: string, sessionId: string) => void;
  disconnect: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1000;

export function useWebSocket({
  onMessage,
  onAgentUpdate,
  onConnect,
  onDisconnect,
  onError,
}: UseWebSocketOptions = {}): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const sessionIdRef = useRef<string>('');
  const chatbotIdRef = useRef<string>('');

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WSMessage = JSON.parse(event.data);
      onMessage?.(message);

      if (message.type === 'agent_update') {
        onAgentUpdate?.((message as AgentUpdateMessage).data);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, [onMessage, onAgentUpdate]);

  const connect = useCallback((chatbotId: string, sessionId: string) => {
    // Close existing connection if any
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    sessionIdRef.current = sessionId;
    chatbotIdRef.current = chatbotId;

    try {
      const ws = new WebSocket(`${WS_URL}/chat/${chatbotId}/ws?session_id=${sessionId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        onConnect?.();
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        setIsConnected(false);
        onDisconnect?.();

        // Exponential backoff reconnection
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current += 1;
          console.warn(
            `WebSocket disconnected. Reconnecting in ${delay}ms ` +
            `(attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            connect(chatbotIdRef.current, sessionIdRef.current);
          }, delay);
        } else {
          console.error('WebSocket max reconnection attempts reached.');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        onError?.(error);
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setIsConnected(false);
    }
  }, [handleMessage, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    sendMessage,
    connect,
    disconnect,
  };
}
