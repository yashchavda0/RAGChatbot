'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check } from 'lucide-react';
import type { ChatMessage, Source } from '@/types';
import { useChat } from '@/hooks/useChat';

export interface WidgetSurfaceSettings {
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  size: 'compact' | 'default' | 'large';
  borderRadius: number;
  fontFamily: string;
  greeting: string;
  welcomeMessage: string;
  placeholder: string;
  botName: string;
  avatarUrl: string;
  autoOpen: boolean;
  showTypingIndicator: boolean;
  inputMaxChars: number;
  buttonText: string;
  showBranding: boolean;
}

interface WidgetChatSurfaceProps {
  chatbotId: string;
  sessionId: string;
  settings: WidgetSurfaceSettings;
  apiBaseUrl?: string;
  preview?: boolean;
}

export const DEFAULT_WIDGET_SETTINGS: WidgetSurfaceSettings = {
  primaryColor: '#5B5EFF',
  position: 'bottom-right',
  size: 'default',
  borderRadius: 18,
  fontFamily: 'Inter',
  greeting: 'Hello!',
  welcomeMessage: 'How can I help you today? Feel free to ask any questions.',
  placeholder: 'Type your message...',
  botName: 'AI Assistant',
  avatarUrl: '',
  autoOpen: false,
  showTypingIndicator: true,
  inputMaxChars: 2000,
  buttonText: 'Chat with us',
  showBranding: true,
};

const FONT_FAMILIES: Record<string, string> = {
  Inter: "'Inter', 'Segoe UI', Arial, sans-serif",
  'SF Pro': "'SF Pro Display', 'SF Pro Text', -apple-system, 'Segoe UI', sans-serif",
  Roboto: "'Roboto', 'Segoe UI', Arial, sans-serif",
  'Open Sans': "'Open Sans', 'Segoe UI', Arial, sans-serif",
  Lato: "'Lato', 'Trebuchet MS', 'Segoe UI', sans-serif",
};

export function normalizeWidgetSettings(data: Record<string, any>): WidgetSurfaceSettings {
  return {
    primaryColor: data.primary_color || DEFAULT_WIDGET_SETTINGS.primaryColor,
    position: data.position === 'bottom-left' ? 'bottom-left' : 'bottom-right',
    size: data.size === 'compact' || data.size === 'large' ? data.size : 'default',
    borderRadius: data.border_radius ?? DEFAULT_WIDGET_SETTINGS.borderRadius,
    fontFamily: data.font_family || DEFAULT_WIDGET_SETTINGS.fontFamily,
    greeting: data.greeting || DEFAULT_WIDGET_SETTINGS.greeting,
    welcomeMessage: data.welcome_message || DEFAULT_WIDGET_SETTINGS.welcomeMessage,
    placeholder: data.placeholder || DEFAULT_WIDGET_SETTINGS.placeholder,
    botName: data.bot_name || DEFAULT_WIDGET_SETTINGS.botName,
    avatarUrl: data.avatar_url || DEFAULT_WIDGET_SETTINGS.avatarUrl,
    autoOpen: data.auto_open ?? DEFAULT_WIDGET_SETTINGS.autoOpen,
    showTypingIndicator: data.show_typing_indicator ?? DEFAULT_WIDGET_SETTINGS.showTypingIndicator,
    inputMaxChars: data.input_max_chars ?? DEFAULT_WIDGET_SETTINGS.inputMaxChars,
    buttonText: data.button_text || DEFAULT_WIDGET_SETTINGS.buttonText,
    showBranding: data.show_branding ?? DEFAULT_WIDGET_SETTINGS.showBranding,
  };
}

function getPanelDimensions(size: WidgetSurfaceSettings['size']) {
  if (size === 'compact') return { width: 360, height: 500 };
  if (size === 'large') return { width: 480, height: 640 };
  return { width: 420, height: 580 };
}

// Converts an http(s) API base URL into the matching ws(s) URL for the chat socket.
function deriveWsUrl(apiBaseUrl?: string): string | undefined {
  if (!apiBaseUrl) return undefined;
  return apiBaseUrl.replace(/\/$/, '').replace(/^http/i, 'ws');
}

function sourceLabel(source: Source) {
  if (source.document_name) return source.document_name;
  if (source.filename) return source.filename;
  if (source.title) return source.title;
  if (source.url) {
    try {
      return new URL(source.url).hostname;
    } catch {
      return source.url;
    }
  }
  return 'Source';
}

function BubbleIcon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m22 2-7 20-4-9-9-4Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 2 11 13" />
    </svg>
  );
}

function AvatarFallback({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
    </svg>
  );
}

export function WidgetChatSurface({
  chatbotId,
  sessionId,
  settings,
  apiBaseUrl,
  preview = false,
}: WidgetChatSurfaceProps) {
  const panel = getPanelDimensions(settings.size);
  const resolvedFont = FONT_FAMILIES[settings.fontFamily] || FONT_FAMILIES.Inter;
  const [isOpen, setIsOpen] = useState(preview ? true : settings.autoOpen);
  const [inputValue, setInputValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wsUrl = useMemo(() => deriveWsUrl(apiBaseUrl), [apiBaseUrl]);

  const { messages, isLoading, isStreaming, sendMessage } = useChat(chatbotId, sessionId, {
    apiBaseUrl,
    wsUrl,
    persist: !preview,
  });

  useEffect(() => {
    if (preview) {
      setIsOpen(true);
      return;
    }
    setIsOpen(settings.autoOpen);
  }, [preview, settings.autoOpen]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const surfaceMessages = useMemo<ChatMessage[]>(() => {
    if (messages.length > 0) return messages;
    return [
      {
        id: 'widget-welcome',
        role: 'assistant',
        content: `${settings.greeting}\n\n${settings.welcomeMessage}`,
        timestamp: new Date(0),
      },
    ];
  }, [messages, settings.greeting, settings.welcomeMessage]);

  const handleSend = (content: string) => {
    if (!content.trim() || isLoading) return;
    void sendMessage(content);
  };

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2000);
    } catch {
      // Ignore clipboard failures (e.g. insecure context on a customer site).
    }
  };

  const mdComponents = useMemo(
    () => ({
      p: ({ children }: any) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
      ul: ({ children }: any) => <ul style={{ margin: '0 0 8px 0', paddingLeft: 18 }}>{children}</ul>,
      ol: ({ children }: any) => <ol style={{ margin: '0 0 8px 0', paddingLeft: 18 }}>{children}</ol>,
      li: ({ children }: any) => <li style={{ marginBottom: 2 }}>{children}</li>,
      strong: ({ children }: any) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
      code: ({ className, children }: any) => {
        const isInline = !className;
        return isInline ? (
          <code
            style={{
              background: `${settings.primaryColor}1A`,
              color: settings.primaryColor,
              padding: '1px 5px',
              borderRadius: 4,
              fontSize: 12,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}
          >
            {children}
          </code>
        ) : (
          <code
            style={{
              display: 'block',
              background: '#0F172A',
              color: '#E2E8F0',
              borderRadius: 8,
              padding: 10,
              fontSize: 12,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              overflowX: 'auto',
              margin: '6px 0',
            }}
          >
            {children}
          </code>
        );
      },
      pre: ({ children }: any) => <>{children}</>,
      a: ({ href, children }: any) => (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: settings.primaryColor, textDecoration: 'underline' }}>
          {children}
        </a>
      ),
      blockquote: ({ children }: any) => (
        <blockquote style={{ borderLeft: `2px solid ${settings.primaryColor}`, margin: '6px 0', padding: '0 0 0 10px', color: '#6E6E73', fontStyle: 'italic' }}>
          {children}
        </blockquote>
      ),
    }),
    [settings.primaryColor],
  );

  const containerStyle: React.CSSProperties = preview
    ? {
        position: 'relative',
        width: '100%',
        height: 600,
        borderRadius: 16,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #E8E8ED 0%, #D1D1D6 100%)',
        fontFamily: resolvedFont,
      }
    : {
        position: 'fixed',
        bottom: 24,
        zIndex: 999999,
        left: settings.position === 'bottom-left' ? 24 : undefined,
        right: settings.position === 'bottom-right' ? 24 : undefined,
        display: 'flex',
        flexDirection: 'column',
        alignItems: settings.position === 'bottom-right' ? 'flex-end' : 'flex-start',
        gap: 8,
        maxWidth: 'calc(100vw - 16px)',
        fontFamily: resolvedFont,
      };

  const previewWidgetAnchorStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 24,
    left: settings.position === 'bottom-left' ? 24 : undefined,
    right: settings.position === 'bottom-right' ? 24 : undefined,
    display: 'flex',
    flexDirection: 'column',
    alignItems: settings.position === 'bottom-right' ? 'flex-end' : 'flex-start',
    gap: 8,
    maxWidth: 'calc(100% - 48px)',
  };

  const panelStyle: React.CSSProperties = {
    width: panel.width,
    height: panel.height,
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    borderRadius: Math.max(12, Math.min(36, settings.borderRadius)),
    overflow: 'hidden',
    background: '#FFFFFF',
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
    maxWidth: 'calc(100vw - 16px)',
    maxHeight: 'calc(100vh - 120px)',
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes ragchatbot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>

      {preview && (
        <>
          <div style={{ position: 'absolute', inset: 0 }}>
            <div style={{ position: 'absolute', top: 16, left: 16, right: 16, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.5)' }} />
            <div style={{ position: 'absolute', top: 80, left: 16, right: 16, display: 'grid', gap: 12 }}>
              <div style={{ height: 16, width: '75%', borderRadius: 6, background: 'rgba(255,255,255,0.35)' }} />
              <div style={{ height: 16, width: '50%', borderRadius: 6, background: 'rgba(255,255,255,0.35)' }} />
              <div style={{ height: 16, width: '66%', borderRadius: 6, background: 'rgba(255,255,255,0.35)' }} />
            </div>
          </div>
          <div style={{ position: 'absolute', top: 12, left: 12, borderRadius: 8, background: 'rgba(0,0,0,0.45)', padding: '6px 10px', color: '#FFFFFF', fontSize: 12, fontWeight: 600 }}>
            Live Preview
          </div>
        </>
      )}

      <div style={preview ? previewWidgetAnchorStyle : undefined}>
        {isOpen && (
          <section style={panelStyle} aria-label={`${settings.botName} chat widget`}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                color: '#FFFFFF',
                background: settings.primaryColor,
              }}
            >
              {settings.avatarUrl ? (
                <img
                  src={settings.avatarUrl}
                  alt={settings.botName}
                  style={{ width: 40, height: 40, borderRadius: 999, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.18)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <AvatarFallback color="#FFFFFF" />
                </div>
              )}

              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {settings.botName}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.82)' }}>Online</p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  border: 0,
                  background: 'rgba(255,255,255,0.12)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                }}
                aria-label="Close chat"
              >
                x
              </button>
            </div>

            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', background: '#FFFFFF', padding: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {surfaceMessages.map((message, idx) => {
                  const isLastMessage = idx === surfaceMessages.length - 1;
                  const isEmpty = !message.content || message.content.trim() === '';
                  const isPending =
                    isLastMessage &&
                    message.role === 'assistant' &&
                    isEmpty &&
                    (isLoading || isStreaming) &&
                    settings.showTypingIndicator;
                  const isAssistant = message.role === 'assistant';

                  return (
                    <div
                      key={message.id}
                      onMouseEnter={() => isAssistant && setHoveredId(message.id)}
                      onMouseLeave={() => isAssistant && setHoveredId((prev) => (prev === message.id ? null : prev))}
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'flex-end',
                        justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      {isAssistant && (
                        settings.avatarUrl ? (
                          <img
                            src={settings.avatarUrl}
                            alt={settings.botName}
                            style={{ width: 28, height: 28, borderRadius: 999, objectFit: 'cover', flexShrink: 0 }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 999,
                              background: '#F1F1F4',
                              display: 'grid',
                              placeItems: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <AvatarFallback color={settings.primaryColor} />
                          </div>
                        )
                      )}

                      <div
                        style={{
                          position: 'relative',
                          maxWidth: '82%',
                          padding: '11px 14px',
                          borderRadius: 18,
                          borderBottomLeftRadius: isAssistant ? 8 : 18,
                          borderBottomRightRadius: message.role === 'user' ? 8 : 18,
                          background: message.role === 'user' ? settings.primaryColor : '#F5F5F7',
                          color: message.role === 'user' ? '#FFFFFF' : '#1D1D1F',
                          fontSize: 14,
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                        }}
                      >
                        {isPending ? (
                          <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(91,94,255,0.45)', animation: 'ragchatbot-bounce 1.1s infinite ease-in-out' }} />
                            <span style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(91,94,255,0.45)', animation: 'ragchatbot-bounce 1.1s 0.15s infinite ease-in-out' }} />
                            <span style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(91,94,255,0.45)', animation: 'ragchatbot-bounce 1.1s 0.3s infinite ease-in-out' }} />
                          </div>
                        ) : message.role === 'user' ? (
                          <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
                        ) : (
                          <ReactMarkdown components={mdComponents}>{message.content}</ReactMarkdown>
                        )}

                        {isAssistant && !isEmpty && !isPending && hoveredId === message.id && (
                          <button
                            type="button"
                            onClick={() => handleCopy(message.id, message.content)}
                            title={copiedId === message.id ? 'Copied!' : 'Copy message'}
                            style={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              width: 22,
                              height: 22,
                              borderRadius: 999,
                              border: '1px solid rgba(15,23,42,0.08)',
                              background: '#FFFFFF',
                              color: copiedId === message.id ? '#34C759' : '#6E6E73',
                              cursor: 'pointer',
                              display: 'grid',
                              placeItems: 'center',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                            }}
                          >
                            {copiedId === message.id ? <Check size={11} /> : <Copy size={11} />}
                          </button>
                        )}

                        {isAssistant && message.sources && message.sources.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                            {message.sources.slice(0, 4).map((source, srcIdx) => (
                              <span
                                key={`${message.id}-src-${srcIdx}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  borderRadius: 999,
                                  fontSize: 11,
                                  lineHeight: 1.2,
                                  background: 'rgba(91,94,255,0.08)',
                                  color: settings.primaryColor,
                                  padding: '6px 10px',
                                }}
                              >
                                {sourceLabel(source)}
                              </span>
                            ))}
                          </div>
                        )}

                        {isAssistant && message.suggested_questions && message.suggested_questions.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                            {message.suggested_questions.slice(0, 3).map((question, qIdx) => (
                              <button
                                key={`${message.id}-q-${qIdx}`}
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleSend(question)}
                                style={{
                                  borderRadius: 999,
                                  border: `1px solid ${settings.primaryColor}33`,
                                  background: '#FFFFFF',
                                  color: '#1D1D1F',
                                  fontSize: 11,
                                  lineHeight: 1.2,
                                  padding: '7px 10px',
                                  cursor: isLoading ? 'default' : 'pointer',
                                  opacity: isLoading ? 0.5 : 1,
                                }}
                              >
                                {question}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: 12, borderTop: '1px solid rgba(15,23,42,0.06)', background: 'rgba(255,255,255,0.96)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, border: '1px solid rgba(15,23,42,0.1)', borderRadius: 999, background: '#FFFFFF', padding: '8px 8px 8px 14px' }}>
                <textarea
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSend(inputValue);
                      setInputValue('');
                    }
                  }}
                  placeholder={settings.placeholder}
                  maxLength={settings.inputMaxChars}
                  rows={1}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    minHeight: 24,
                    maxHeight: 120,
                    resize: 'none',
                    border: 0,
                    outline: 'none',
                    background: 'transparent',
                    color: '#1D1D1F',
                    fontFamily: resolvedFont,
                    fontSize: 14,
                    lineHeight: 1.45,
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    handleSend(inputValue);
                    setInputValue('');
                  }}
                  disabled={isLoading || !inputValue.trim()}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: 0,
                    background: settings.primaryColor,
                    color: '#FFFFFF',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: isLoading || !inputValue.trim() ? 'default' : 'pointer',
                    opacity: isLoading || !inputValue.trim() ? 0.45 : 1,
                  }}
                  aria-label="Send message"
                >
                  <SendIcon />
                </button>
              </div>
            </div>

            {settings.showBranding && (
              <div style={{ borderTop: '1px solid rgba(15,23,42,0.04)', background: 'rgba(245,245,247,0.7)', padding: '6px 12px', textAlign: 'center', fontSize: 10, lineHeight: 1.2, color: '#6E6E73' }}>
                Powered by <strong style={{ color: settings.primaryColor }}>RAG Chatbot</strong>
              </div>
            )}
          </section>
        )}

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          style={
            preview
              ? {
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  border: 0,
                  background: settings.primaryColor,
                  color: '#FFFFFF',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                }
              : {
                  border: 0,
                  borderRadius: 999,
                  background: settings.primaryColor,
                  color: '#FFFFFF',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  fontFamily: resolvedFont,
                  fontSize: 14,
                  fontWeight: 600,
                  maxWidth: 'calc(100vw - 16px)',
                }
          }
          aria-label={isOpen ? `Close ${settings.botName}` : settings.buttonText || `Open ${settings.botName}`}
        >
          <BubbleIcon color="#FFFFFF" />
          {!preview && <span>{settings.buttonText || 'Chat with us'}</span>}
        </button>
      </div>
    </div>
  );
}
