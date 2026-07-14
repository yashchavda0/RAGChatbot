'use client';

import React, { useState } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WidgetPreviewProps {
  config: WidgetConfig;
  onConfigChange?: (config: WidgetConfig) => void;
}

export interface WidgetConfig {
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  buttonText: string;
  welcomeMessage: string;
  placeholder: string;
  showBranding: boolean;
}

const defaultConfig: WidgetConfig = {
  primaryColor: '#5B5EFF',
  position: 'bottom-right',
  buttonText: 'Chat with us',
  welcomeMessage: 'Hi! How can I help you today?',
  placeholder: 'Type a message...',
  showBranding: true,
};

export function WidgetPreview({ config = defaultConfig, onConfigChange }: WidgetPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: config.welcomeMessage },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    setInput('');
    setIsTyping(true);

    // Simulate response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Thanks for your message! This is a preview of how your chatbot widget will behave. In production, it will connect to your actual RAG chatbot.',
        },
      ]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative h-[500px] bg-[#F5F5F7] rounded-2xl border border-black/[0.08] overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #6E6E73 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Preview container label */}
      <div className="absolute top-4 left-4 z-10">
        <span className="px-3 py-1.5 bg-white rounded-full text-xs font-medium text-[#6E6E73] shadow-apple">
          Live Preview
        </span>
      </div>

      {/* Widget */}
      <div
        className={cn(
          'absolute bottom-4 z-10',
          config.position === 'bottom-right' ? 'right-4' : 'left-4'
        )}
      >
        {/* Chat Window */}
        {isOpen && (
          <div
            className="absolute bottom-16 w-[320px] h-[400px] bg-white rounded-2xl shadow-apple-lg overflow-hidden flex flex-col animate-scale-in origin-bottom-right"
            style={{
              right: config.position === 'bottom-right' ? 0 : 'auto',
              left: config.position === 'bottom-left' ? 0 : 'auto',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ backgroundColor: config.primaryColor }}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-white text-sm font-semibold">AI Assistant</h3>
                  <p className="text-white/70 text-xs">Online</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-apple">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  {msg.role === 'assistant' && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${config.primaryColor}20` }}
                    >
                      <Bot className="w-3 h-3" style={{ color: config.primaryColor }} />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[75%] px-3 py-2 rounded-xl text-sm',
                      msg.role === 'user'
                        ? 'text-white rounded-br-md'
                        : 'bg-[#F5F5F7] text-[#1D1D1F] rounded-bl-md'
                    )}
                    style={msg.role === 'user' ? { backgroundColor: config.primaryColor } : {}}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-[#6E6E73] flex items-center justify-center flex-shrink-0">
                      <User className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${config.primaryColor}20` }}
                  >
                    <Bot className="w-3 h-3" style={{ color: config.primaryColor }} />
                  </div>
                  <div className="bg-[#F5F5F7] px-3 py-2 rounded-xl rounded-bl-md">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#6E6E73] animate-typing-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-[#6E6E73] animate-typing-bounce" style={{ animationDelay: '200ms' }} />
                      <span className="w-2 h-2 rounded-full bg-[#6E6E73] animate-typing-bounce" style={{ animationDelay: '400ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-black/[0.06]">
              <div className="flex items-center gap-2 bg-[#F5F5F7] rounded-xl px-3 py-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={config.placeholder}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#6E6E73]"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className={cn(
                    'p-1.5 rounded-lg transition-all',
                    input.trim()
                      ? 'text-white'
                      : 'bg-transparent text-[#6E6E73]/40'
                  )}
                  style={input.trim() ? { backgroundColor: config.primaryColor } : {}}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Branding */}
            {config.showBranding && (
              <div className="px-4 py-2 border-t border-black/[0.04] bg-[#F5F5F7]/50">
                <p className="text-center text-[10px] text-[#6E6E73]">
                  Powered by <span className="font-semibold" style={{ color: config.primaryColor }}>RAG Chatbot</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Call-out tooltip when closed */}
        {!isOpen && (
          <div
            className={cn(
              'absolute bottom-full mb-2 z-20',
              config.position === 'bottom-right' ? 'right-0' : 'left-0'
            )}
          >
            <div
              className="px-4 py-2 bg-white rounded-xl shadow-apple text-sm animate-fade-in whitespace-nowrap"
              style={{ animationDelay: '500ms' }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: config.primaryColor }} />
                <span className="text-[#1D1D1F]">{config.buttonText}</span>
              </div>
            </div>
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full shadow-apple-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: config.primaryColor }}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <MessageCircle className="w-6 h-6 text-white" />
          )}
        </button>

        {/* Pulse ring when closed */}
        {!isOpen && (
          <div
            className="absolute inset-0 rounded-full animate-pulse-ring pointer-events-none"
            style={{ border: `2px solid ${config.primaryColor}` }}
          />
        )}
      </div>
    </div>
  );
}

export { defaultConfig };
