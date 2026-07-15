"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ChatMessage, AgentExecution, Source } from "@ragchatbot/shared-types";
import { useWebSocket } from "./useWebSocket";

const API_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8000";

interface UseChatOptions {
  apiBaseUrl?: string;
  wsUrl?: string;
  /** Persist messages to localStorage. Defaults to true. */
  persist?: boolean;
}

interface UseChatReturn {
  messages: ChatMessage[];
  agentExecutions: AgentExecution[];
  detectedIntent: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  responseTime: number | null;
  tokenUsage: { prompt: number; completion: number; total: number } | null;
}

// Helper function to deduplicate sources by document_name
function deduplicateSources(sources: Source[]): Source[] {
  const seen = new Map<string, Source>();

  for (const source of sources) {
    const key =
      source.type === "document"
        ? source.document_name || source.filename
        : source.url;

    if (!key) continue;

    if (!seen.has(key)) {
      seen.set(key, { ...source });
    } else {
      // Keep the highest scoring one for documents
      const existing = seen.get(key)!;
      if (
        source.type === "document" &&
        source.similarity_score &&
        existing.similarity_score
      ) {
        if (source.similarity_score > existing.similarity_score) {
          seen.set(key, source);
        }
      }
    }
  }

  return Array.from(seen.values());
}

// Helper function to determine source type
function determineSourceType(
  sources: Source[] | undefined,
): "document" | "web" | "mixed" | undefined {
  if (!sources || sources.length === 0) return undefined;

  const hasDocument = sources.some((s) => s.type === "document");
  const hasWeb = sources.some((s) => s.type === "web");

  if (hasDocument && hasWeb) return "mixed";
  if (hasDocument) return "document";
  if (hasWeb) return "web";

  return undefined;
}

export function useChat(
  chatbotId: string,
  sessionId: string = "default",
  options: UseChatOptions = {},
): UseChatReturn {
  const apiBaseUrl = (options.apiBaseUrl || API_URL).replace(/\/$/, "");
  const persist = options.persist !== false;
  // Load messages from localStorage on mount
  const getStorageKey = () => `chat_messages_${chatbotId}_${sessionId}`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (persist && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(getStorageKey());
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
        }
      } catch (error) {
        console.error("Failed to load messages from localStorage:", error);
      }
    }
    return [];
  });

  const [agentExecutions, setAgentExecutions] = useState<AgentExecution[]>([]);
  const [detectedIntent, setDetectedIntent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [tokenUsage, setTokenUsage] = useState<{
    prompt: number;
    completion: number;
    total: number;
  } | null>(null);
  const currentResponseRef = useRef<string>("");
  const assistantMessageRef = useRef<string>("");

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (persist && typeof window !== "undefined" && messages.length > 0) {
      try {
        localStorage.setItem(getStorageKey(), JSON.stringify(messages));
      } catch (error) {
        console.error("Failed to save messages to localStorage:", error);
      }
    }
  }, [messages, chatbotId, sessionId, persist]);

  const {
    connect,
    disconnect,
    sendMessage: sendWsMessage,
    isConnected,
  } = useWebSocket({
    wsUrl: options.wsUrl,
    onAgentUpdate: (update) => {
      console.log("🔄 Agent update received:", update);
      setAgentExecutions((prev) => {
        const exists = prev.findIndex((e) => e.agent_id === update.agent_id);
        if (exists >= 0) {
          const updated = [...prev];
          updated[exists] = {
            ...updated[exists],
            ...update,
          };
          return updated;
        }
        return [
          ...prev,
          {
            ...update,
            started_at: new Date().toISOString(),
          } as AgentExecution,
        ];
      });

      // Extract intent when intent_classifier completes
      if (
        update.agent_id === "intent_classifier" &&
        update.status === "completed" &&
        update.output_data?.intent
      ) {
        setDetectedIntent(update.output_data.intent as string);
      }
    },
    onMessage: (message) => {
      console.log("💬 WebSocket message:", message.type, message);
      const msgType = (message as any).type;

      if (msgType === "chat_chunk") {
        // Handle streaming response chunks
        const chunk = (message as any).data?.chunk || "";
        currentResponseRef.current += chunk;

        // Update the pre-created assistant message
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (
            lastMessage?.role === "assistant" &&
            lastMessage.id === assistantMessageRef.current
          ) {
            // Update existing assistant message
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMessage,
              content: currentResponseRef.current,
            };
            return updated;
          }
          // If for some reason the assistant message doesn't exist, don't create a duplicate
          return prev;
        });
      } else if (msgType === "chat_complete") {
        // Handle complete response
        setIsLoading(false);
        setIsStreaming(false);

        const data = (message as any).data;
        const deduped = data.sources ? deduplicateSources(data.sources) : [];
        const sourceType = determineSourceType(deduped);

        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === "assistant") {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMessage,
              content: data.response || currentResponseRef.current,
              sources: deduped,
              source_type: sourceType,
              agent_executions: data.agent_executions,
              intent_confidence: data.intent_confidence,
              retrieval_confidence:
                data.retrieval_confidence ?? data.reranker_top_score,
              answer_source: data.answer_source,
              fallback_reason: data.fallback_reason,
              suggested_questions: data.suggested_questions || [],
            };
            return updated;
          }
          return prev;
        });

        if (data.agent_executions) {
          setAgentExecutions(data.agent_executions);
        }

        // Capture metrics if provided
        if (data.token_usage) {
          setTokenUsage(data.token_usage);
        }
        if (data.response_time_ms) {
          setResponseTime(Number(data.response_time_ms));
        }

        currentResponseRef.current = "";
        assistantMessageRef.current = "";
      } else if (msgType === "error") {
        setIsLoading(false);
        setIsStreaming(false);
        console.error("WebSocket error:", message.data);
      } else if (msgType === "response") {
        // Final response sent by backend (non-streaming)
        const resp = (message as any).response || "";
        const sources = (message as any).sources || [];
        const token_usage = (message as any).token_usage || null;
        const response_time_ms = (message as any).response_time_ms || null;
        const intent_confidence = (message as any).intent_confidence;
        const retrieval_confidence = (message as any).retrieval_confidence;
        const answer_source = (message as any).answer_source;
        const fallback_reason = (message as any).fallback_reason;
        const suggested_questions = (message as any).suggested_questions || [];

        setIsLoading(false);
        setIsStreaming(false);

        const deduped = deduplicateSources(sources);
        const sourceType = determineSourceType(deduped);

        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === "assistant") {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMessage,
              content: resp,
              sources: deduped,
              source_type: sourceType,
              intent_confidence,
              retrieval_confidence,
              answer_source,
              fallback_reason,
              suggested_questions,
            };
            return updated;
          }
          return prev;
        });

        if (token_usage) setTokenUsage(token_usage);
        if (response_time_ms) setResponseTime(Number(response_time_ms));
      } else if (msgType === "done") {
        // Finalization event may include metrics
        const data = message as any;
        if (data.token_usage) setTokenUsage(data.token_usage);
        if (data.response_time_ms)
          setResponseTime(Number(data.response_time_ms));

        // Backfill Intent label / Retrieval % if earlier events didn't carry them.
        // The backend broadcasts answer_source and reranker_top_score here.
        if (
          data.answer_source !== undefined ||
          data.reranker_top_score !== undefined
        ) {
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === "assistant") {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMessage,
                answer_source: lastMessage.answer_source ?? data.answer_source,
                fallback_reason:
                  lastMessage.fallback_reason ?? data.fallback_reason,
                retrieval_confidence:
                  lastMessage.retrieval_confidence ?? data.reranker_top_score,
                suggested_questions:
                  lastMessage.suggested_questions &&
                  lastMessage.suggested_questions.length > 0
                    ? lastMessage.suggested_questions
                    : data.suggested_questions || [],
              };
              return updated;
            }
            return prev;
          });
        }
      }
    },
  });

  // Initialize WebSocket connection on mount
  useEffect(() => {
    connect(chatbotId, sessionId);

    // Cleanup on unmount or when chatbot/session changes
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatbotId, sessionId]); // Removed 'connect' from dependencies to prevent reconnection loop

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setAgentExecutions([]);
      currentResponseRef.current = "";

      // Create assistant message ID for streaming updates
      const assistantId = crypto.randomUUID();
      assistantMessageRef.current = assistantId;

      // Create placeholder assistant message for streaming
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      try {
        if (isConnected) {
          // Use WebSocket for streaming
          setIsStreaming(true);
          sendWsMessage({
            type: "chat_message",
            session_id: sessionId,
            message: content,
          });
        } else {
          // Fallback to HTTP POST if WebSocket not connected
          const response = await fetch(`${apiBaseUrl}/chat/${chatbotId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: content,
              session_id: sessionId,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to send message");
          }

          const data = await response.json();

          // Update assistant message with complete response
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (
              lastMessage?.role === "assistant" &&
              lastMessage.id === assistantId
            ) {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMessage,
                content: data.response,
                sources: data.sources,
                agent_executions: data.agent_executions,
                answer_source: data.answer_source,
                fallback_reason: data.fallback_reason,
                suggested_questions: data.suggested_questions || [],
              };
              return updated;
            }
            return prev;
          });

          setAgentExecutions(data.agent_executions || []);
          // Capture metrics from HTTP fallback
          if (data.token_usage) setTokenUsage(data.token_usage);
          if (data.response_time_ms)
            setResponseTime(Number(data.response_time_ms));
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error sending message:", error);
        setIsLoading(false);
        setIsStreaming(false);

        // Update assistant message with error
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (
            lastMessage?.role === "assistant" &&
            lastMessage.id === assistantId
          ) {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMessage,
              content:
                "Sorry, there was an error processing your request. Please try again.",
            };
            return updated;
          }
          return prev;
        });
      }
    },
    [sessionId, isConnected, sendWsMessage, apiBaseUrl, chatbotId],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setAgentExecutions([]);
    setDetectedIntent(null);
    setResponseTime(null);
    setTokenUsage(null);

    // Clear from localStorage
    if (persist && typeof window !== "undefined") {
      try {
        localStorage.removeItem(getStorageKey());
      } catch (error) {
        console.error("Failed to clear messages from localStorage:", error);
      }
    }
  }, [chatbotId, sessionId, persist]);

  return {
    messages,
    agentExecutions,
    detectedIntent,
    isLoading,
    isStreaming,
    sendMessage,
    clearMessages,
    responseTime,
    tokenUsage,
  };
}
