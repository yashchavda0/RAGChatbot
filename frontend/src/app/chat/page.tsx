'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Network,
  MessageSquare,
  Trash2,
  ChevronLeft,
  Menu,
  Upload,
  Sparkles,
  Settings,
  X,
  MoreVertical,
} from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState('default');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const {
    messages,
    agentExecutions,
    isLoading,
    sendMessage,
    clearMessages,
  } = useChat(sessionId);

  // Generate session ID on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('chat_session_id');
    if (savedSession) {
      setSessionId(savedSession);
    } else {
      const newSession = crypto.randomUUID();
      localStorage.setItem('chat_session_id', newSession);
      setSessionId(newSession);
    }
  }, []);

  // Close sidebar on route change or escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setShowMobileMenu(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSendMessage = async (content: string) => {
    await sendMessage(content);
  };

  const handleClearChat = useCallback(() => {
    if (messages.length > 0) {
      clearMessages();
    }
  }, [messages.length, clearMessages]);

  const handleNewSession = useCallback(() => {
    const newSession = crypto.randomUUID();
    localStorage.setItem('chat_session_id', newSession);
    setSessionId(newSession);
    clearMessages();
    setSidebarOpen(false);
  }, [clearMessages]);

  const runningAgents = agentExecutions.filter((e) => e.status === 'running');
  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:relative inset-y-0 left-0 z-50 w-[280px] flex flex-col',
          'bg-card/95 backdrop-blur-xl border-r',
          'transition-transform duration-300 ease-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 group"
              onClick={() => setSidebarOpen(false)}
            >
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <Network className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold tracking-tight">
                RAG Chatbot
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 -mr-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              aria-label="Close sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewSession}
            className="w-full btn-primary btn-md gap-2"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          <div className="mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Current Session
            </p>
          </div>

          {/* Active Session */}
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-primary/10 text-primary">
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              {hasMessages
                ? messages[0].content.slice(0, 28) + '...'
                : 'New conversation'}
            </span>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Quick Actions
            </p>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Documents
            </button>
            <Link
              href="/agents"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <Network className="w-4 h-4" />
              View Agent Workflow
            </Link>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t">
          {showUpload && (
            <div className="mb-3 animate-slide-up">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Upload Files
                </span>
                <button
                  onClick={() => setShowUpload(false)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <DocumentUpload />
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <header className="h-14 flex items-center justify-between px-4 lg:px-6 glass-heavy border-b flex-shrink-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Title */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-success" />
                <div className="absolute inset-0 rounded-full bg-success animate-ping opacity-30" />
              </div>
              <h1 className="text-sm font-semibold tracking-tight">Chat</h1>
            </div>

            {/* Agent Status */}
            {runningAgents.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">
                  {runningAgents[0]?.agent_name} running...
                </span>
              </div>
            )}
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1">
            {/* Clear Button */}
            <button
              onClick={handleClearChat}
              disabled={!hasMessages}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                hasMessages
                  ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  : 'text-muted-foreground/40 cursor-not-allowed'
              )}
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>

            {/* Desktop: Agents Link */}
            <Link
              href="/agents"
              className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Network className="w-4 h-4" />
              Agents
            </Link>

            {/* Mobile: More Menu */}
            <div className="lg:hidden relative">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                aria-label="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMobileMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 py-1 rounded-lg bg-card border shadow-lg animate-scale-in z-50">
                  <Link
                    href="/agents"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <Network className="w-4 h-4" />
                    View Agents
                  </Link>
                  <Link
                    href="/"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <Settings className="w-4 h-4" />
                    Home
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <MessageList
            messages={messages}
            agentExecutions={agentExecutions}
            isLoading={isLoading}
            onSuggestionClick={handleSendMessage}
          />
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </main>
      </div>
    </div>
  );
}
