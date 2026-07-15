'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  Download,
  Bot,
  Plus,
} from 'lucide-react';
import { ChatInput } from '@/components/chat/ChatInput';
import { DebugPanel } from '@/components/playground/DebugPanel';
import { ChatMessage, AgentExecution, Source } from '@/types';
import { cn } from '@/lib/utils';
import { MessageBubble, useChat } from '@ragchatbot/shared-ui';

const SESSION_KEY = (chatbotId: string) => `playground_session_${chatbotId}`;

function getOrCreateSessionId(chatbotId: string): string {
  if (typeof window === 'undefined') return `playground-${Date.now()}`;
  const stored = localStorage.getItem(SESSION_KEY(chatbotId));
  if (stored) return stored;
  const newId = `playground-${Date.now()}`;
  localStorage.setItem(SESSION_KEY(chatbotId), newId);
  return newId;
}

function PlaygroundContent({ chatbotId, sessionId }: { chatbotId: string; sessionId: string }) {
  const [showDebugPanel, setShowDebugPanel] = useState(true);

  const {
    messages,
    agentExecutions,
    detectedIntent,
    isLoading,
    isStreaming,
    sendMessage,
    clearMessages,
    responseTime,
    tokenUsage,
  } = useChat(chatbotId, sessionId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Determine query status based on agent execution
  const determineQueryStatus = (): 'analyzing' | 'intent' | 'retrieving' | 'processing' | 'generating' | 'completed' => {
    if (agentExecutions.length === 0) return 'analyzing';

    const agentIds = agentExecutions.map(e => e.agent_id);
    const hasRunningAgent = agentExecutions.some(e => e.status === 'running');

    // Check which stages have agents
    const hasIntent = agentIds.includes('intent_classifier');
    const hasRetrieval = agentIds.some(id => ['document_search', 'web_search', 'ocr', 'url_processing'].includes(id));
    const hasReranking = agentIds.includes('reranker');
    const hasSynthesis = agentIds.includes('response_synthesis');

    // Determine current stage based on which agents have run/are running
    if (hasSynthesis && !hasRunningAgent) return 'completed';
    if (hasSynthesis || (hasReranking && !agentExecutions.find(e => e.agent_id === 'response_synthesis')?.status)) return 'generating';
    if (hasReranking) return 'processing';
    if (hasRetrieval) return 'retrieving';
    if (hasIntent) return 'intent';

    return 'analyzing';
  };

  // Get current executing agent
  const currentExecutingAgent = agentExecutions.find(e => e.status === 'running') || null;

  // Get current debug state - real-time from agent executions during streaming
  const currentSources: Source[] = isStreaming 
    ? [] // Don't show sources until complete
    : ([...messages].reverse().find(m => m.role === 'assistant')?.sources || []);
  
  const queryStatus = determineQueryStatus();

  const handleSendMessage = async (content: string) => {
    await sendMessage(content);
  };

  const handleClearConversation = () => {
    clearMessages();
  };

  const handleNewChat = () => {
    clearMessages();
    const newId = `playground-${Date.now()}`;
    localStorage.setItem(SESSION_KEY(chatbotId), newId);
    window.location.reload();
  };

  const handleExportConversation = () => {
    const exportData = {
      chatbotId,
      exportedAt: new Date().toISOString(),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        sources: m.sources,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${chatbotId}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex rounded-2xl overflow-hidden border border-black/[0.06] bg-white shadow-apple">
      {/* Chat Section */}
      <div className={cn('flex flex-col transition-all duration-300', showDebugPanel ? 'w-1/2' : 'w-full')}>
        {/* Options Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] bg-[#F5F5F7]/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#5B5EFF]/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-[#5B5EFF]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#1D1D1F]">Playground</h2>
              <p className="text-xs text-[#6E6E73]">Test your chatbot</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5B5EFF] hover:bg-[#5B5EFF]/10 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>

            <button
              onClick={handleClearConversation}
              disabled={messages.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/[0.04] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>

            <button
              onClick={handleExportConversation}
              disabled={messages.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/[0.04] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/[0.04] rounded-lg transition-colors"
            >
              {showDebugPanel ? (
                <>
                  <PanelLeftClose className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hide Debug</span>
                </>
              ) : (
                <>
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Show Debug</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto scrollbar-apple p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-full bg-[#5B5EFF]/10 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-[#5B5EFF]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">Start Testing</h3>
              <p className="text-sm text-[#6E6E73] max-w-md">
                Send a message to test your chatbot. The debug panel will show you the execution flow,
                retrieved sources, and performance metrics in real-time.
              </p>

              {/* Quick test prompts */}
              <div className="mt-6 space-y-2">
                <p className="text-xs text-[#6E6E73] mb-3">Try these prompts:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    'How do I integrate the API?',
                    'Search the web for best practices',
                    'Analyze this complex requirement',
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSendMessage(prompt)}
                      className="px-3 py-1.5 text-xs bg-[#F5F5F7] text-[#1D1D1F] rounded-full hover:bg-[#5B5EFF]/10 hover:text-[#5B5EFF] transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  showSources={message.role === 'assistant'}
                  isLoading={isLoading && message.role === 'assistant' && !message.content}
                  onSuggestionClick={handleSendMessage}
                />
              ))}

              {/* Typing indicator - only when no streaming placeholder exists */}
              {isLoading && !messages.some(m => m.role === 'assistant' && !m.content) && (
                <div className="flex gap-3 message-animate">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white shadow-apple flex items-center justify-center border border-black/[0.04]">
                    <Bot className="w-4 h-4 text-[#5B5EFF]" />
                  </div>
                  <div className="bg-white text-[#1D1D1F] rounded-[22px] rounded-bl-[6px] shadow-apple border border-black/[0.04] px-4 py-3">
                    <div className="flex gap-1">
                      <span className="typing-dot w-2 h-2 rounded-full bg-[#5B5EFF]" />
                      <span className="typing-dot w-2 h-2 rounded-full bg-[#5B5EFF]" />
                      <span className="typing-dot w-2 h-2 rounded-full bg-[#5B5EFF]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>

      {/* Debug Panel */}
      {showDebugPanel && (
        <div className="w-1/2 border-l border-black/[0.06] animate-slide-in-right">
          <DebugPanel
            intent={detectedIntent}
            executions={agentExecutions}
            sources={currentSources}
            responseTime={responseTime}
            tokenUsage={tokenUsage}
            isStreaming={isStreaming}
            queryStatus={queryStatus}
            currentExecutingAgent={currentExecutingAgent}
          />
        </div>
      )}
    </div>
  );
}

export default function PlaygroundPage({ params }: { params: { chatbotId: string } }) {
  const { chatbotId } = params;
  const [sessionId] = useState(() => getOrCreateSessionId(chatbotId));

  return <PlaygroundContent key={sessionId} chatbotId={chatbotId} sessionId={sessionId} />;
}
