'use client';

import React, { useState, useRef, KeyboardEvent, useEffect, memo } from 'react';
import { Send, Paperclip, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput = memo(function ChatInput({
  onSendMessage,
  isLoading = false,
  disabled = false,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    <div className="px-4 lg:px-6 pb-4 pt-3 flex-shrink-0">
      <div className="max-w-3xl mx-auto">
        {/* Attached File Preview */}
        {attachedFile && (
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
            'flex items-end gap-2 bg-card rounded-2xl border shadow-card',
            'transition-all duration-200',
            'focus-within:shadow-card-hover focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/5',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {/* Attach Button */}
          <button
            type="button"
            onClick={handleFileAttach}
            disabled={disabled || isLoading}
            className={cn(
              'flex-shrink-0 p-3 rounded-xl text-muted-foreground transition-colors',
              'hover:text-foreground hover:bg-muted',
              'disabled:opacity-30 disabled:pointer-events-none'
            )}
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
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
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading || disabled}
            rows={1}
            className={cn(
              'flex-1 bg-transparent text-sm py-3 leading-relaxed outline-none resize-none',
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
              'flex-shrink-0 m-2 w-9 h-9 rounded-full flex items-center justify-center',
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
        <p className="text-center text-[10px] text-muted-foreground/50 mt-2">
          Press <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Enter</kbd> to send,{' '}
          <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
});
