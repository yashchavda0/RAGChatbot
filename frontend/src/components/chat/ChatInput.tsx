'use client';

import React, { useState, useRef, KeyboardEvent, useEffect, memo } from 'react';
import { Send, Paperclip, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  compact?: boolean;
  showAttachment?: boolean;
  showHint?: boolean;
}

export const ChatInput = memo(function ChatInput({
  onSendMessage,
  isLoading = false,
  disabled = false,
  placeholder = 'Type a message...',
  maxLength,
  compact = false,
  showAttachment = true,
  showHint = true,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerLimitWarning = () => {
    if (!maxLength) return;
    setShowLimitWarning(true);
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    warningTimeoutRef.current = setTimeout(() => {
      setShowLimitWarning(false);
      warningTimeoutRef.current = null;
    }, 1800);
  };

  useEffect(() => {
    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      // Max 5 rows (approx 120px)
      textarea.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !isLoading && !disabled) {
      onSendMessage(input.trim());
      setInput('');
      setAttachedFile(null);
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      maxLength &&
      input.length >= maxLength &&
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      triggerLimitWarning();
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      // TODO: Implement file upload logic
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const canSend = input.trim().length > 0 && !isLoading && !disabled;

  return (
    <div className={cn('flex-shrink-0', compact ? 'px-3 pb-2 pt-2' : 'px-4 pb-4 pt-3 lg:px-6')}>
      <div className={cn('relative', compact ? 'mx-auto max-w-none' : 'mx-auto max-w-3xl')}>
        {/* Attached File Preview */}
        {showAttachment && attachedFile && (
          <div className="mb-2 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-sm">
              <Paperclip className="w-4 h-4 text-muted-foreground" />
              <span className="truncate max-w-[200px]">{attachedFile.name}</span>
              <button
                onClick={handleRemoveFile}
                className="p-0.5 rounded hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Input Container */}
        <div
          className={cn(
            'flex items-center gap-2 overflow-hidden',
            compact
              ? 'rounded-full border border-black/10 bg-background shadow-none pl-3'
              : 'rounded-2xl border bg-card shadow-card',
            'transition-all duration-200',
            compact
              ? 'focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/15'
              : 'focus-within:shadow-card-hover focus-within:border-primary/30',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {/* Attach Button */}
          {showAttachment && (
            <button
              type="button"
              onClick={handleFileAttach}
              disabled={disabled || isLoading}
              className={cn(
                'flex-shrink-0 rounded-xl text-muted-foreground transition-colors border-0 bg-transparent appearance-none self-center',
                compact ? 'p-2.5' : 'p-3',
                'hover:text-foreground hover:bg-muted',
                'disabled:opacity-30 disabled:pointer-events-none'
              )}
              title="Attach file"
            >
              <Paperclip className={cn(compact ? 'w-4 h-4' : 'w-5 h-5')} />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              if (maxLength && e.target.value.length > maxLength) {
                triggerLimitWarning();
              }
              const nextValue = maxLength ? e.target.value.slice(0, maxLength) : e.target.value;
              setInput(nextValue);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading || disabled}
            maxLength={maxLength}
            rows={1}
            className={cn(
              'scrollbar-hidden flex-1 min-w-0 w-full bg-transparent text-sm leading-relaxed outline-none resize-none border-0 appearance-none m-0 self-center overflow-y-auto',
              compact ? 'py-1.5 break-all [overflow-wrap:anywhere]' : 'py-2',
              'focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none',
              'placeholder:text-muted-foreground/60',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'min-h-[24px] max-h-[120px]'
            )}
            style={{ height: 'auto' }}
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              'flex-shrink-0 rounded-full flex items-center justify-center',
              compact ? 'm-1 h-8 w-8' : 'm-2 h-9 w-9',
              'transition-all duration-200',
              canSend
                ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:scale-105 active:scale-95'
                : 'bg-muted text-muted-foreground/40 cursor-not-allowed'
            )}
            title="Send message"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Hint */}
        {showHint && (
          <p className={cn('text-center text-[10px] text-muted-foreground/50', compact ? 'mt-1' : 'mt-2')}>
            Press <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Enter</kbd> to send,{' '}
            <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Shift+Enter</kbd> for new line
          </p>
        )}

        {showLimitWarning && maxLength && (
          <p className="pointer-events-none absolute -bottom-5 left-2 right-2 text-center text-[10px] font-medium text-[#FF3B30]">
            Character limit reached ({maxLength})
          </p>
        )}
      </div>
    </div>
  );
});
