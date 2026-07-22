'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { ChatMessage } from '@ragchatbot/shared-types';
import { useChat } from '../hooks/useChat';
import { MessageList } from './MessageList';
import { hexToHslTriplet } from '../utils';

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

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
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

  const wsUrl = useMemo(() => deriveWsUrl(apiBaseUrl), [apiBaseUrl]);
  const primaryHsl = useMemo(() => hexToHslTriplet(settings.primaryColor), [settings.primaryColor]);

  // Preview mode stacks the mock browser background, the widget panel, a gap, and the
  // launcher button — size the container to fit all of it so the panel is never clipped.
  const previewStackHeight = panel.height + 8 + 56;
  const previewContainerHeight = Math.max(600, previewStackHeight + 48);

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

  const surfaceMessages = useMemo<ChatMessage[]>(() => {
    if (messages.length > 0) return messages;
    return [
      {
        id: 'widget-welcome',
        role: 'assistant',
        content: `${settings.greeting}\n\n${settings.welcomeMessage}`,
        timestamp: new Date(),
      },
    ];
  }, [messages, settings.greeting, settings.welcomeMessage]);

  const handleSend = (content: string) => {
    if (!content.trim() || isLoading) return;
    void sendMessage(content);
  };

  const containerStyle: React.CSSProperties = preview
    ? {
        position: 'relative',
        width: '100%',
        height: previewContainerHeight,
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

  // Without this, the panel + launcher button sit in a plain (non-flex) box that
  // shrink-to-fits to its widest child — the ~420px panel when open vs. the 56px
  // button when closed — so the button visually jumps side to side as it opens
  // and closes. Re-applying the same flex/alignItems as the fixed-position
  // container keeps both children independently anchored to the correct side.
  const widgetStackStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: settings.position === 'bottom-right' ? 'flex-end' : 'flex-start',
    gap: 8,
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
    <div
      className="rag-widget-surface"
      style={{
        ...containerStyle,
        '--primary': primaryHsl,
        '--primary-foreground': '0 0% 100%',
      } as React.CSSProperties}
    >
      <style>{`
        @keyframes ragchatbot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-3px); opacity: 1; }
        }
        .rag-widget-surface *:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px hsl(var(--primary) / 0.4);
        }
        .rag-widget-surface .rag-widget-input-shell:focus-within {
          box-shadow: 0 0 0 2px hsl(var(--primary) / 0.4);
        }
        .rag-widget-surface .rag-widget-input-shell textarea:focus,
        .rag-widget-surface .rag-widget-input-shell textarea:focus-visible {
          outline: none;
          box-shadow: none;
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

      <div style={preview ? previewWidgetAnchorStyle : widgetStackStyle}>
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
                <CloseIcon />
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', background: '#FFFFFF' }}>
              <MessageList
                messages={surfaceMessages}
                agentExecutions={[]}
                showAgentExecutions={false}
                isLoading={(isLoading || isStreaming) && settings.showTypingIndicator}
                assistantAvatarUrl={settings.avatarUrl}
                assistantName={settings.botName}
                compact
                showMessageMeta
                onSuggestionClick={handleSend}
              />
            </div>

            <div style={{ padding: 12, borderTop: '1px solid rgba(15,23,42,0.06)', background: 'rgba(255,255,255,0.96)' }}>
              <div
                className="rag-widget-input-shell"
                style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(15,23,42,0.1)', borderRadius: 999, background: '#FFFFFF', padding: '4px 4px 4px 14px' }}
              >
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
                    height: 36,
                    padding: '8px 0',
                    margin: 0,
                    display: 'block',
                    resize: 'none',
                    overflow: 'hidden',
                    border: 0,
                    outline: 'none',
                    background: 'transparent',
                    color: '#1D1D1F',
                    fontFamily: resolvedFont,
                    fontSize: 14,
                    lineHeight: 1.3,
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
              {inputValue.length > settings.inputMaxChars * 0.8 && (
                <p style={{ margin: '4px 14px 0', fontSize: 11, textAlign: 'right', color: inputValue.length >= settings.inputMaxChars ? '#FF3B30' : '#6E6E73' }}>
                  {inputValue.length}/{settings.inputMaxChars}
                </p>
              )}
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
          style={{
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
          }}
          aria-label={isOpen ? `Close ${settings.botName}` : settings.buttonText || `Open ${settings.botName}`}
        >
          <BubbleIcon color="#FFFFFF" />
        </button>
      </div>
    </div>
  );
}
