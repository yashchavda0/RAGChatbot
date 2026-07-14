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
  showAgentExecutions?: boolean;
  assistantAvatarUrl?: string;
  assistantName?: string;
  compact?: boolean;
  showMessageMeta?: boolean;
  onSuggestionClick?: (question: string) => void;
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
  showAgentExecutions = true,
  assistantAvatarUrl,
  assistantName = 'Assistant',
  compact = false,
  showMessageMeta = true,
  onSuggestionClick,
}: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(0);
  const hasPendingAssistantMessage =
    isLoading &&
    messages.some(
      (message) => message.role === 'assistant' && message.content.trim().length === 0,
    );

  // Always scroll on a new user message; otherwise only auto-scroll when near bottom.
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLDivElement | null;

    if (!viewport) return;

    const lastMessage = messages[messages.length - 1];
    const messageCountIncreased = messages.length > previousMessageCountRef.current;
    const isNewUserMessage = messageCountIncreased && lastMessage?.role === 'user';
    previousMessageCountRef.current = messages.length;

    if (isNewUserMessage) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    const isNearBottom = distanceFromBottom < 96;

    if (isNearBottom || messages.length <= 2) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, agentExecutions]);

  return (
    <ScrollArea ref={scrollAreaRef} className="h-full w-full scrollbar-thin">
      <div
        className={cn(
          'mx-auto',
          compact ? 'max-w-none px-3 py-3 space-y-3' : 'max-w-3xl px-4 py-6 lg:px-6 space-y-5'
        )}
      >
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
        {messages.map((message, index) => {
          const previousMessage = index > 0 ? messages[index - 1] : null;
          const roleChanged = previousMessage ? previousMessage.role !== message.role : false;

          return (
          <div
            key={message.id}
            className={cn(
              'animate-message-in',
              compact && roleChanged && 'pt-1'
            )}
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <MessageBubble
              message={message}
              isLoading={
                isLoading &&
                message.role === 'assistant' &&
                message.content.trim().length === 0 &&
                index === messages.length - 1
              }
              showSources={showMessageMeta}
              alwaysShowTimestamp={compact}
              compact={compact}
              assistantAvatarUrl={assistantAvatarUrl}
              assistantName={assistantName}
              onSuggestionClick={onSuggestionClick}
            />
          </div>
        )})}

        {/* Agent Executions */}
        {showAgentExecutions && agentExecutions.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1 animate-slide-up">
            {agentExecutions.map((execution, idx) => (
              <AgentExecutionCard key={idx} execution={execution} />
            ))}
          </div>
        )}

        {/* Typing Indicator */}
        {isLoading && !hasPendingAssistantMessage && (
          <div className="flex items-center gap-3 animate-slide-up">
            {assistantAvatarUrl ? (
              <img
                src={assistantAvatarUrl}
                alt={assistantName}
                className="flex-shrink-0 h-8 w-8 rounded-full border border-black/5 object-cover shadow-sm"
              />
            ) : (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-card shadow-card flex items-center justify-center border">
                <Bot className="w-4 h-4 text-primary animate-pulse" />
              </div>
            )}
            <div className="bg-card rounded-2xl rounded-bl-md shadow-card border px-5 py-4">
              <div className="flex gap-1.5">
                <div
                  className="w-2 h-2 bg-primary/40 rounded-full animate-typing-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-2 h-2 bg-primary/40 rounded-full animate-typing-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-2 h-2 bg-primary/40 rounded-full animate-typing-bounce"
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
