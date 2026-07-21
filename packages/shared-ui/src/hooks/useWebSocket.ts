"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { WSMessage, AgentUpdateMessage } from "@ragchatbot/shared-types";

function getDefaultWsUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;
  }
  return "/ws";
}

interface UseWebSocketOptions {
  onMessage?: (message: WSMessage) => void;
  onAgentUpdate?: (update: AgentUpdateMessage["data"]) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  wsUrl?: string;
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
  wsUrl,
}: UseWebSocketOptions = {}): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const sessionIdRef = useRef<string>("");
  const chatbotIdRef = useRef<string>("");
  const isIntentionalCloseRef = useRef(false);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        console.log("📨 Raw WebSocket message received:", message);
        onMessage?.(message);

        if (message.type === "agent_update") {
          console.log(
            "🤖 Agent update in WebSocket:",
            (message as AgentUpdateMessage).data,
          );
          onAgentUpdate?.((message as AgentUpdateMessage).data);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    },
    [onMessage, onAgentUpdate],
  );

  const connect = useCallback(
    (chatbotId: string, sessionId: string) => {
      // Prevent multiple simultaneous connections
      if (wsRef.current?.readyState === WebSocket.CONNECTING) {
        console.log("WebSocket already connecting, skipping...");
        return;
      }

      // Close existing connection if any
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        isIntentionalCloseRef.current = true;
        wsRef.current.close();
      }

      // Clear any pending reconnection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      sessionIdRef.current = sessionId;
      chatbotIdRef.current = chatbotId;

      try {
        const wsBaseUrl = (wsUrl || getDefaultWsUrl()).replace(/\/$/, "");
        const ws = new WebSocket(
          `${wsBaseUrl}/chat/${chatbotId}/ws?session_id=${sessionId}`,
        );
        wsRef.current = ws;

        ws.onopen = () => {
          reconnectAttemptsRef.current = 0;
          setIsConnected(true);
          console.log("✅ WebSocket connected");
          onConnect?.();
        };

        ws.onmessage = handleMessage;

        ws.onclose = (event) => {
          console.log("❌ WebSocket disconnected", {
            code: event.code,
            reason: event.reason,
          });
          setIsConnected(false);
          onDisconnect?.();

          // Only auto-reconnect on abnormal closures (not intentional disconnects)
          // Code 1000 = normal closure, Code 1001 = going away (page navigation)
          const shouldReconnect =
            !isIntentionalCloseRef.current &&
            event.code !== 1000 &&
            event.code !== 1001 &&
            reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS;

          if (shouldReconnect) {
            const delay =
              RECONNECT_BASE_DELAY_MS *
              Math.pow(2, reconnectAttemptsRef.current);
            reconnectAttemptsRef.current += 1;
            console.warn(
              `WebSocket abnormally disconnected (code ${event.code}). Reconnecting in ${delay}ms ` +
                `(attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`,
            );
            reconnectTimeoutRef.current = setTimeout(() => {
              connect(chatbotIdRef.current, sessionIdRef.current);
            }, delay);
          } else {
            console.log(
              "WebSocket closed normally or max reconnect attempts reached",
            );
            isIntentionalCloseRef.current = false; // Reset flag
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setIsConnected(false);
          onError?.(error);
        };
      } catch (error) {
        console.error("Failed to connect WebSocket:", error);
        setIsConnected(false);
      }
    },
    [handleMessage, onConnect, onDisconnect, onError],
  );

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect
    isIntentionalCloseRef.current = true;
    if (wsRef.current) {
      wsRef.current.close(1000, "Intentional disconnect");
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected. Message not sent:", message);
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
