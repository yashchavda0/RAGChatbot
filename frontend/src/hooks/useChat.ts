'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, AgentExecution, Source } from '@/types';
import { useWebSocket } from './useWebSocket';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface UseChatReturn {
  messages: ChatMessage[];
  agentExecutions: AgentExecution[];
  isLoading: boolean;
  isStreaming: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export function useChat(sessionId: string = 'default'): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentExecutions, setAgentExecutions] = useState<AgentExecution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const currentResponseRef = useRef<string>('');
  const assistantMessageRef = useRef<string>('');

  const { connect, disconnect, sendMessage: sendWsMessage, isConnected } = useWebSocket({
    onAgentUpdate: (update) => {
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
    },
    onMessage: (message) => {
      if (message.type === 'chat_chunk') {
        // Handle streaming response chunks
        const chunk = (message as any).data?.chunk || '';
        currentResponseRef.current += chunk;

        // Update or create assistant message
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'assistant') {
            // Update existing assistant message
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMessage,
              content: currentResponseRef.current,
            };
            return updated;
          } else {
            // Create new assistant message
            return [
              ...prev,
              {
                id: assistantMessageRef.current || crypto.randomUUID(),
                role: 'assistant',
                content: currentResponseRef.current,
                timestamp: new Date(),
              } as ChatMessage,
            ];
          }
        });
      } else if (message.type === 'chat_complete') {
        // Handle complete response
        setIsLoading(false);
        setIsStreaming(false);

        const data = (message as any).data;
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'assistant') {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMessage,
              content: data.response || currentResponseRef.current,
              sources: data.sources,
              agent_executions: data.agent_executions,
            };
            return updated;
          }
          return prev;
        });

        if (data.agent_executions) {
          setAgentExecutions(data.agent_executions);
        }

        currentResponseRef.current = '';
        assistantMessageRef.current = '';
      } else if (message.type === 'error') {
        setIsLoading(false);
        setIsStreaming(false);
        console.error('WebSocket error:', message.data);
      }
    },
  });

  // Initialize WebSocket connection on mount
  useEffect(() => {
    if (!isConnected && sessionId) {
      connect(sessionId);
    }
  }, [sessionId, isConnected, connect]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setAgentExecutions([]);
    currentResponseRef.current = '';

    // Create assistant message ID for streaming updates
    const assistantId = crypto.randomUUID();
    assistantMessageRef.current = assistantId;

    // Create placeholder assistant message for streaming
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      if (isConnected) {
        // Use WebSocket for streaming
        setIsStreaming(true);
        sendWsMessage({
          type: 'chat_message',
          session_id: sessionId,
          message: content,
        });
      } else {
        // Fallback to HTTP POST if WebSocket not connected
        const response = await fetch(`${API_URL}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            session_id: sessionId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const data = await response.json();

        // Update assistant message with complete response
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'assistant' && lastMessage.id === assistantId) {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMessage,
              content: data.response,
              sources: data.sources,
              agent_executions: data.agent_executions,
            };
            return updated;
          }
          return prev;
        });

        setAgentExecutions(data.agent_executions || []);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      setIsStreaming(false);

      // Update assistant message with error
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.role === 'assistant' && lastMessage.id === assistantId) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...lastMessage,
            content: 'Sorry, there was an error processing your request. Please try again.',
          };
          return updated;
        }
        return prev;
      });
    }
  }, [sessionId, isConnected, sendWsMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setAgentExecutions([]);
    currentResponseRef.current = '';
    assistantMessageRef.current = '';
  }, []);

  return {
    messages,
    agentExecutions,
    isLoading,
    isStreaming,
    sendMessage,
    clearMessages,
  };
}
