'use client';

import React, { useEffect, useRef, memo } from 'react';
import { Bot, Sparkles, MessageSquare, FileText, Globe, Image as ImageIcon } from 'lucide-react';
import { ChatMessage, AgentExecution } from '@/types';
import { MessageBubble } from './MessageBubble';
import { AgentExecutionCard } from './AgentExecutionCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: ChatMessage[];
  agentExecutions: AgentExecution[];
  isLoading?: boolean;
}

const quickActions = [
  { icon: <FileText className="w-4 h-4" />, label: 'Search documents', query: 'What documents do you have?' },
  { icon: <Globe className="w-4 h-4" />, label: 'Web search', query: 'Search the web for recent AI news' },
  { icon: <ImageIcon className="w-4 h-4" />, label: 'Analyze image', query: 'Help me analyze an image' },
  { icon: <Sparkles className="w-4 h-4" />, label: 'General query', query: 'What can you help me with?' },
];

export const MessageList = memo(function MessageList({
  messages,
  agentExecutions,
  isLoading = false,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentExecutions]);

  return (
    <ScrollArea className="flex-1 scrollbar-thin">
      <div ref={scrollRef} className="px-4 lg:px-6 py-6 max-w-3xl mx-auto space-y-5">
        {/* Empty State */}
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center text-center py-16 sm:py-24 animate-fade-in">
            {/* Icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-primary" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-success" />
              </div>
            </div>

            {/* Text */}
            <h3 className="text-xl sm:text-2xl font-semibold tracking-tight mb-2">
              Start a conversation
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground max-w-sm leading-relaxed mb-8">
              Ask about your documents, search the web, process images, or explore any topic you like.
            </p>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-lg">
              {quickActions.map((action, index) => (
                <button
                  key={action.label}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border bg-card hover:bg-muted transition-colors text-center',
                    'animate-slide-up'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {action.icon}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message, index) => (
          <div
            key={message.id}
            className="animate-message-in"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <MessageBubble message={message} />
          </div>
        ))}

        {/* Agent Executions */}
        {agentExecutions.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1 animate-slide-up">
            {agentExecutions.map((execution, idx) => (
              <AgentExecutionCard key={idx} execution={execution} />
            ))}
          </div>
        )}

        {/* Typing Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 animate-slide-up">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-card shadow-card flex items-center justify-center border">
              <Bot className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div className="bg-card rounded-2xl rounded-bl-md shadow-card border px-5 py-4">
              <div className="flex gap-1.5">
                <div
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>
    </ScrollArea>
  );
});
