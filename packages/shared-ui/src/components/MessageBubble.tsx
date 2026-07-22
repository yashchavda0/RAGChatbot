'use client';

import { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot, Copy, Check, ExternalLink } from 'lucide-react';
import type { ChatMessage } from '@ragchatbot/shared-types';
import { formatTimestamp, cn } from '../utils';
import { SourceFooter } from './SourceFooter';

interface MessageBubbleProps {
  message: ChatMessage;
  showSources?: boolean;
  isLoading?: boolean;
  assistantAvatarUrl?: string;
  assistantName?: string;
  alwaysShowTimestamp?: boolean;
  compact?: boolean;
  onSuggestionClick?: (question: string) => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  showSources = true,
  isLoading = false,
  assistantAvatarUrl,
  assistantName = 'Assistant',
  alwaysShowTimestamp = false,
  compact = false,
  onSuggestionClick,
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

  const isEmpty = !message.content || message.content.trim() === '';

  return (
    <div
      className={cn(
        'flex gap-3 group animate-message-in',
        compact && isUser && 'pl-6',
        compact && !isUser && 'pr-6',
        isUser ? 'justify-end' : 'justify-start'
      )}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        assistantAvatarUrl ? (
          <img
            src={assistantAvatarUrl}
            alt={assistantName}
            className="flex-shrink-0 h-8 w-8 rounded-full border border-black/5 object-cover shadow-sm"
          />
        ) : (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shadow-sm">
            <Bot className="w-4 h-4 text-primary" />
          </div>
        )
      )}

      <div
        className={cn(
          'flex flex-col min-w-0 max-w-[var(--message-max-width,85%)]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            'relative px-4 py-3 text-sm leading-relaxed min-w-0 overflow-hidden',
            isUser
              ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md shadow-sm'
              : 'bg-card text-card-foreground rounded-2xl rounded-bl-md shadow-card border'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-all">{message.content}</p>
          ) : isEmpty && isLoading ? (
            <div className="flex gap-1.5 py-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
            </div>
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
          {!isUser && !isEmpty && (
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

        {/* Meta Footer */}
        {(!isUser && !isEmpty && showSources) && (
          <div className="w-full mt-1.5 px-1 space-y-1">
            {message.suggested_questions && message.suggested_questions.length > 0 && onSuggestionClick && (
              <div className="flex flex-wrap gap-2">
                {message.suggested_questions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => onSuggestionClick(question)}
                    className="max-w-full break-all rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 text-left"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}

            {/* Row 1: Sources (collapsible) */}
            {message.sources && message.sources.length > 0 && (
              <SourceFooter sources={message.sources} />
            )}

            {/* Row 2: Intent label + Retrieval % left, timestamp right */}
            {(message.answer_source !== undefined || message.retrieval_confidence !== undefined || message.sources?.length) ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  {message.answer_source !== undefined && (
                    <span className="inline-flex items-center gap-1">
                      <span className="font-medium">Intent:</span>
                      <span>
                        {message.answer_source === 'web'
                          ? 'Web Search'
                          : message.answer_source === 'fallback'
                            ? 'Fallback'
                            : 'Data'}
                      </span>
                    </span>
                  )}
                  {message.retrieval_confidence !== undefined && message.answer_source !== 'web' && message.answer_source !== 'fallback' && (
                    <span className="inline-flex items-center gap-1">
                      <span className="font-medium">Retrieval:</span>
                      <span>{(message.retrieval_confidence * 100).toFixed(0)}%</span>
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] text-muted-foreground flex-shrink-0 transition-opacity duration-200',
                    showTimestamp || alwaysShowTimestamp ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
            ) : null}
          </div>
        )}

        {/* User timestamp (right-aligned) */}
        {isUser && (
          <span
            className={cn(
              'text-[10px] text-muted-foreground mt-1.5 px-1 transition-opacity duration-200',
              showTimestamp || alwaysShowTimestamp ? 'opacity-100' : 'opacity-0'
            )}
          >
            {formatTimestamp(message.timestamp)}
          </span>
        )}
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
