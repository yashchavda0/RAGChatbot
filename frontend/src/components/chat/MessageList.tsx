'use client';

import React, { useEffect, useRef } from 'react';
import { ChatMessage, AgentExecution } from '@/types';
import { MessageBubble } from './MessageBubble';
import { AgentExecutionCard } from './AgentExecutionCard';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MessageListProps {
  messages: ChatMessage[];
  agentExecutions: AgentExecution[];
  isLoading?: boolean;
}

export function MessageList({ messages, agentExecutions, isLoading = false }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentExecutions]);

  return (
    <ScrollArea className="flex-1">
      <div ref={scrollRef} className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
            <p className="text-muted-foreground max-w-md">
              Ask me anything about your uploaded documents, current events, or upload images for OCR processing.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {agentExecutions.length > 0 && (
          <div className="space-y-2 border-l-2 border-primary/20 pl-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Agent Executions</p>
            {agentExecutions.map((execution, idx) => (
              <AgentExecutionCard key={idx} execution={execution} />
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-muted-foreground rounded-full typing-dot" />
              <div className="w-2 h-2 bg-muted-foreground rounded-full typing-dot" />
              <div className="w-2 h-2 bg-muted-foreground rounded-full typing-dot" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
