'use client';

import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot, Copy, Check, ExternalLink } from 'lucide-react';
import { ChatMessage } from '@/types';
import { formatTimestamp } from '@/lib/utils';
import { SourceCitation } from './SourceCitation';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: ChatMessage;
  showSources?: boolean;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  showSources = true,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div
      className={cn(
        'flex gap-3 group animate-message-in',
        isUser ? 'justify-end' : 'justify-start'
      )}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shadow-sm">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}

      <div
        className={cn(
          'flex flex-col max-w-[var(--message-max-width,85%)]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            'relative px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md shadow-sm'
              : 'bg-card text-card-foreground rounded-2xl rounded-bl-md shadow-card border'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="prose-apple">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-2 list-disc list-outside ml-4 space-y-0.5">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-2 list-decimal list-outside ml-4 space-y-0.5">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code
                        className="bg-primary/10 px-1.5 py-0.5 rounded text-primary text-xs font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code
                        className="block bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono overflow-x-auto my-2"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => <>{children}</>,
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-0.5"
                    >
                      {children}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary pl-3 my-2 text-muted-foreground italic">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Copy Button (for assistant messages) */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className={cn(
                'absolute -right-1 -top-1 p-1.5 rounded-full bg-card border shadow-sm',
                'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                'hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
              title={copied ? 'Copied!' : 'Copy message'}
            >
              {copied ? (
                <Check className="w-3 h-3 text-success" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          )}
        </div>

        {/* Source Citations */}
        {showSources && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.sources.map((source, idx) => (
              <SourceCitation key={idx} source={source} index={idx + 1} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span
          className={cn(
            'text-[10px] text-muted-foreground mt-1.5 px-1 transition-opacity duration-200',
            showTimestamp ? 'opacity-100' : 'opacity-0'
          )}
        >
          {formatTimestamp(message.timestamp)}
        </span>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm">
          <User className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
});
