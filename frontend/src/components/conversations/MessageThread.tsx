'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot, ChevronDown, ExternalLink, FileText, Globe, ScanLine } from 'lucide-react';
import { ConversationMessage, ConversationSource } from '@/types/conversation';
import { cn } from '@/lib/utils';

interface MessageThreadProps {
  messages: ConversationMessage[];
  isLoading?: boolean;
}

// Format timestamp to readable time
const formatTime = (date: Date): string => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

// Format duration in seconds to readable string
const formatDuration = (messages: ConversationMessage[]): string => {
  if (messages.length < 2) return 'Instant';
  const start = new Date(messages[0].timestamp).getTime();
  const end = new Date(messages[messages.length - 1].timestamp).getTime();
  const durationMs = end - start;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

// Source Icon Component
const SourceIcon = ({ type }: { type: ConversationSource['type'] }) => {
  switch (type) {
    case 'document':
      return <FileText className="w-3 h-3" />;
    case 'web':
      return <Globe className="w-3 h-3" />;
    case 'ocr':
      return <ScanLine className="w-3 h-3" />;
    default:
      return <FileText className="w-3 h-3" />;
  }
};

// Source Card Component
const SourceCard = ({ source }: { source: ConversationSource }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white/80 border border-black/[0.06] rounded-lg overflow-hidden text-xs">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-black/[0.02] transition-colors"
      >
        <span className="text-[#5B5EFF]">
          <SourceIcon type={source.type} />
        </span>
        <span className="flex-1 text-left text-[#1D1D1F] font-medium truncate">
          {source.title}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-[#6E6E73] transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>
      {isExpanded && (
        <div className="px-2.5 pb-2.5 pt-1 border-t border-black/[0.04]">
          <p className="text-[#6E6E73] leading-relaxed">{source.snippet}</p>
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-[#5B5EFF] hover:underline"
            >
              View source
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export function MessageThread({ messages, isLoading = false }: MessageThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#F5F5F7] flex items-center justify-center">
            <Bot className="w-8 h-8 text-[#6E6E73]" />
          </div>
          <h3 className="text-base font-medium text-[#1D1D1F] mb-1">No messages yet</h3>
          <p className="text-sm text-[#6E6E73]">Select a conversation to view the message thread</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-apple p-4 space-y-4">
      {/* Duration indicator */}
      {messages.length > 1 && (
        <div className="flex justify-center">
          <span className="px-3 py-1 text-xs text-[#6E6E73] bg-[#F5F5F7] rounded-full">
            Duration: {formatDuration(messages)}
          </span>
        </div>
      )}

      {messages.map((message, index) => {
        const isUser = message.role === 'user';
        const showAvatar = index === 0 || messages[index - 1].role !== message.role;

        return (
          <div
            key={message.id}
            className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
            onMouseEnter={() => setHoveredMessage(message.id)}
            onMouseLeave={() => setHoveredMessage(null)}
          >
            {/* Bot Avatar */}
            {!isUser && showAvatar && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center border border-black/[0.04]">
                <Bot className="w-4 h-4 text-[#5B5EFF]" />
              </div>
            )}
            {!isUser && !showAvatar && <div className="w-8" />}

            {/* Message Content */}
            <div className={cn('flex flex-col max-w-[70%]', isUser ? 'items-end' : 'items-start')}>
              {/* Message Bubble */}
              <div
                className={cn(
                  'px-4 py-3 text-[14px] leading-[1.55]',
                  isUser
                    ? 'bg-[#5B5EFF] text-white rounded-[18px] rounded-br-[4px]'
                    : 'bg-white text-[#1D1D1F] rounded-[18px] rounded-bl-[4px] shadow-sm border border-black/[0.04]'
                )}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                ) : (
                  <ReactMarkdown
                    className="prose-apple max-w-none"
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="mb-2 list-disc list-inside">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-2 list-decimal list-inside">{children}</ol>,
                      code: ({ children }) => (
                        <code className="bg-[#5B5EFF]/[0.08] px-1.5 py-0.5 rounded-md text-[13px] font-mono text-[#5B5EFF]">
                          {children}
                        </code>
                      ),
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#5B5EFF] hover:underline">
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>

              {/* Source Citations */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-2 space-y-1.5 w-full">
                  {message.sources.map((source) => (
                    <SourceCard key={source.id} source={source} />
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <span
                className={cn(
                  'text-[11px] text-[#6E6E73] mt-1 px-1 transition-opacity duration-200',
                  hoveredMessage === message.id ? 'opacity-100' : 'opacity-0'
                )}
              >
                {formatTime(message.timestamp)}
              </span>
            </div>

            {/* User Avatar */}
            {isUser && showAvatar && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#5B5EFF] flex items-center justify-center shadow-sm">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
            {isUser && !showAvatar && <div className="w-8" />}
          </div>
        );
      })}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex gap-3 justify-start">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center border border-black/[0.04]">
            <Bot className="w-4 h-4 text-[#5B5EFF]" />
          </div>
          <div className="px-4 py-3 bg-white rounded-[18px] rounded-bl-[4px] shadow-sm border border-black/[0.04]">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-[#5B5EFF]/40 rounded-full typing-dot" />
              <span className="w-2 h-2 bg-[#5B5EFF]/40 rounded-full typing-dot" />
              <span className="w-2 h-2 bg-[#5B5EFF]/40 rounded-full typing-dot" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
