'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { use } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  Download,
  Settings,
  Bot,
} from 'lucide-react';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { DebugPanel } from '@/components/playground/DebugPanel';
import { ChatMessage, AgentExecution, Source } from '@/types';
import { cn, formatTimestamp } from '@/lib/utils';

// Mock data for demonstration
const mockAgentExecutions: AgentExecution[] = [
  {
    agent_id: 'intent_classifier',
    agent_name: 'Intent Classifier',
    status: 'completed',
    started_at: new Date(Date.now() - 1500).toISOString(),
    completed_at: new Date(Date.now() - 1450).toISOString(),
    execution_time_ms: 50,
  },
  {
    agent_id: 'document_search',
    agent_name: 'Document Search',
    status: 'completed',
    started_at: new Date(Date.now() - 1400).toISOString(),
    completed_at: new Date(Date.now() - 800).toISOString(),
    execution_time_ms: 600,
    output_data: { documents_found: 3 },
  },
  {
    agent_id: 'reranker',
    agent_name: 'Reranker',
    status: 'completed',
    started_at: new Date(Date.now() - 750).toISOString(),
    completed_at: new Date(Date.now() - 600).toISOString(),
    execution_time_ms: 150,
  },
  {
    agent_id: 'response_synthesis',
    agent_name: 'Response Synthesis',
    status: 'completed',
    started_at: new Date(Date.now() - 550).toISOString(),
    completed_at: new Date(Date.now() - 100).toISOString(),
    execution_time_ms: 450,
  },
];

const mockSources: Source[] = [
  {
    type: 'document',
    filename: 'product_manual.pdf',
    chunk_id: 'chunk_123',
    snippet: 'The product supports multiple integration methods including REST API and webhooks...',
  },
  {
    type: 'document',
    filename: 'api_docs.md',
    chunk_id: 'chunk_456',
    snippet: 'Authentication is handled via Bearer tokens with automatic refresh...',
  },
  {
    type: 'web',
    url: 'https://docs.example.com/integration',
    title: 'Integration Guide',
    snippet: 'Step-by-step guide for setting up the integration with your existing systems...',
  },
];

const mockResponses = [
  {
    intent: 'DOCUMENT_SEARCH',
    response: `Based on the documentation, here are the key integration methods available:

1. **REST API** - The primary method for programmatic access
   - Supports JSON request/response format
   - Includes rate limiting and authentication

2. **Webhooks** - For real-time event notifications
   - Configurable endpoints
   - Automatic retry logic for failed deliveries

3. **SDK Libraries** - Available for popular languages
   - JavaScript/TypeScript
   - Python
   - Go

For your specific use case, I recommend starting with the REST API approach, as it provides the most flexibility and is well-documented in the integration guide.

**Sources:**`,
    sources: mockSources,
    executions: mockAgentExecutions,
    tokenUsage: { prompt: 245, completion: 180, total: 425 },
    responseTime: 1250,
  },
  {
    intent: 'WEB_SEARCH',
    response: `I found several relevant resources about this topic:

**Key Findings:**
- The latest update introduced new security features
- Performance improvements of up to 40% have been reported
- The community has created extensive tutorials

Would you like me to dive deeper into any of these areas?`,
    sources: [
      { type: 'web' as const, url: 'https://example.com/article1', title: 'Latest Security Updates' },
      { type: 'web' as const, url: 'https://example.com/article2', title: 'Performance Benchmarks' },
    ],
    executions: mockAgentExecutions.slice(0, 3),
    tokenUsage: { prompt: 180, completion: 120, total: 300 },
    responseTime: 980,
  },
  {
    intent: 'COMPLEX',
    response: `This is a complex query that requires multiple steps. Let me break down the analysis:

**Phase 1: Understanding the Request**
I've analyzed your query and identified several key components that need to be addressed.

**Phase 2: Information Gathering**
I searched through both internal documents and external sources to compile relevant information.

**Phase 3: Synthesis**
Based on all gathered data, here's my comprehensive response:

The solution involves a multi-step approach that balances efficiency with maintainability. I recommend implementing the core functionality first, then iterating based on user feedback.

**Next Steps:**
1. Review the technical requirements
2. Set up the development environment
3. Implement the MVP
4. Test and iterate

Let me know if you need more details on any specific aspect!`,
    sources: mockSources.slice(0, 2),
    executions: mockAgentExecutions,
    tokenUsage: { prompt: 380, completion: 290, total: 670 },
    responseTime: 2100,
  },
];

export default function PlaygroundPage({ params }: { params: Promise<{ chatbotId: string }> }) {
  const { chatbotId } = use(params);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(true);
  const [currentIntent, setCurrentIntent] = useState<string | null>(null);
  const [currentExecutions, setCurrentExecutions] = useState<AgentExecution[]>([]);
  const [currentSources, setCurrentSources] = useState<Source[]>([]);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [tokenUsage, setTokenUsage] = useState<{ prompt: number; completion: number; total: number } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear debug state when starting new message
  const resetDebugState = useCallback(() => {
    setCurrentIntent(null);
    setCurrentExecutions([]);
    setCurrentSources([]);
    setResponseTime(null);
    setTokenUsage(null);
  }, []);

  // Simulate agent execution updates
  const simulateAgentExecution = useCallback(async (responseIndex: number) => {
    const mockData = mockResponses[responseIndex % mockResponses.length];
    const startTime = Date.now();

    // Simulate intent detection
    await new Promise((resolve) => setTimeout(resolve, 100));
    setCurrentIntent(mockData.intent);

    // Simulate each agent execution
    for (const exec of mockData.executions) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setCurrentExecutions((prev) => [
        ...prev,
        { ...exec, status: 'running' },
      ]);

      await new Promise((resolve) => setTimeout(resolve, exec.execution_time_ms || 200));
      setCurrentExecutions((prev) =>
        prev.map((e) => (e.agent_id === exec.agent_id ? { ...e, status: 'completed' as const } : e))
      );
    }

    // Set final metrics
    setResponseTime(Date.now() - startTime);
    setTokenUsage(mockData.tokenUsage);
    setCurrentSources(mockData.sources);

    return mockData;
  }, []);

  const handleSendMessage = async (content: string) => {
    resetDebugState();

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Select a random response pattern based on query
    const responseIndex = content.toLowerCase().includes('complex')
      ? 2
      : content.toLowerCase().includes('web') || content.toLowerCase().includes('search')
      ? 1
      : 0;

    // Simulate execution and get response
    const mockResponse = await simulateAgentExecution(responseIndex);

    // Add assistant message
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: mockResponse.response,
      timestamp: new Date(),
      sources: mockResponse.sources,
      agent_executions: mockResponse.executions,
    };
    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handleClearConversation = () => {
    setMessages([]);
    resetDebugState();
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
    <div className="h-[calc(100vh-120px)] flex rounded-2xl overflow-hidden border border-black/[0.06] bg-white shadow-apple">
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
                <MessageBubble key={message.id} message={message} showSources={message.role === 'assistant'} />
              ))}

              {/* Typing indicator */}
              {isLoading && (
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
            intent={currentIntent}
            executions={currentExecutions}
            sources={currentSources}
            responseTime={responseTime}
            tokenUsage={tokenUsage}
            isStreaming={isLoading}
          />
        </div>
      )}
    </div>
  );
}
