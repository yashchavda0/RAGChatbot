'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Network,
  RefreshCw,
  MessageSquare,
  Cpu,
  Zap,
  Search,
  FileText,
  Globe,
  Image as ImageIcon,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { AgentStatus } from '@/types';
import { WorkflowGraph } from '@/components/agents/WorkflowGraph';
import { AgentList } from '@/components/agents/AgentList';
import { cn } from '@/lib/utils';

const API_URL = '/api';

// Icon mapping for agents
const agentIcons: Record<string, React.ReactNode> = {
  intent_classifier: <Search className="w-4 h-4" />,
  plan_generator: <Cpu className="w-4 h-4" />,
  plan_validator: <Zap className="w-4 h-4" />,
  document_search: <FileText className="w-4 h-4" />,
  web_search: <Globe className="w-4 h-4" />,
  ocr: <ImageIcon className="w-4 h-4" />,
  url_processing: <Globe className="w-4 h-4" />,
  reranker: <BarChart3 className="w-4 h-4" />,
  response_synthesis: <Sparkles className="w-4 h-4" />,
};

// Default agent list for display (when API is not available)
const defaultAgents: AgentStatus[] = [
  {
    agent_id: 'intent_classifier',
    agent_name: 'Intent Classifier',
    agent_type: 'orchestration',
    description: 'Classifies user queries to determine routing',
    capabilities: ['classification', 'intent', 'routing'],
    is_active: true,
    current_status: 'idle',
  },
  {
    agent_id: 'plan_generator',
    agent_name: 'Plan Generator',
    agent_type: 'orchestration',
    description: 'Creates execution plans for complex queries',
    capabilities: ['planning', 'generation', 'orchestration'],
    is_active: true,
    current_status: 'idle',
  },
  {
    agent_id: 'plan_validator',
    agent_name: 'Plan Validator',
    agent_type: 'orchestration',
    description: 'Validates generated execution plans',
    capabilities: ['validation', 'planning'],
    is_active: true,
    current_status: 'idle',
  },
  {
    agent_id: 'document_search',
    agent_name: 'Document Search',
    agent_type: 'execution',
    description: 'Searches uploaded documents using multi-model embeddings',
    capabilities: ['search', 'milvus', 'documents', 'retrieval'],
    is_active: true,
    current_status: 'idle',
  },
  {
    agent_id: 'web_search',
    agent_name: 'Web Search',
    agent_type: 'execution',
    description: 'Searches the web using Tavily API',
    capabilities: ['search', 'web', 'tavily', 'internet'],
    is_active: true,
    current_status: 'idle',
  },
  {
    agent_id: 'ocr',
    agent_name: 'OCR Agent',
    agent_type: 'execution',
    description: 'Extracts text from images using PaddleOCR',
    capabilities: ['ocr', 'paddleocr', 'image_processing', 'text_extraction'],
    is_active: true,
    current_status: 'idle',
  },
  {
    agent_id: 'url_processing',
    agent_name: 'URL Processing',
    agent_type: 'execution',
    description: 'Processes URL content and extracts text',
    capabilities: ['url', 'web', 'scraping', 'content_extraction'],
    is_active: true,
    current_status: 'idle',
  },
  {
    agent_id: 'reranker',
    agent_name: 'Reranker',
    agent_type: 'execution',
    description: 'Reranks results using BAAI reranker',
    capabilities: ['reranking', 'ranking', 'merging', 'baai'],
    is_active: true,
    current_status: 'idle',
  },
  {
    agent_id: 'response_synthesis',
    agent_name: 'Response Synthesis',
    agent_type: 'execution',
    description: 'Synthesizes final response using Gemini LLM',
    capabilities: ['synthesis', 'generation', 'llm', 'gemini'],
    is_active: true,
    current_status: 'idle',
  },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentStatus | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/agents`);
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 5000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  const displayAgents = agents.length > 0 ? agents : defaultAgents;
  const orchestrationAgents = displayAgents.filter(
    (a) => a.agent_type === 'orchestration'
  );
  const executionAgents = displayAgents.filter(
    (a) => a.agent_type === 'execution'
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-heavy border-b">
        <div className="container-responsive h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                <Network className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-tight">
                  Agent Workflow
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {displayAgents.length} agents active
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAgents}
              disabled={isLoading}
              className="btn-ghost btn-sm gap-2"
            >
              <RefreshCw
                className={cn('w-4 h-4', isLoading && 'animate-spin')}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link href="/chat" className="btn-primary btn-sm gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 py-6 lg:py-8">
        <div className="container-responsive">
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Agent Lists - Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Orchestration Agents */}
              <div className="card animate-slide-up">
                <div className="p-5 sm:p-6 border-b">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <h2 className="text-sm font-semibold tracking-tight">
                      Orchestration Agents
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Manage workflow and routing
                  </p>
                </div>
                <div className="p-3">
                  <AgentList
                    agents={orchestrationAgents}
                    onSelectAgent={setSelectedAgent}
                    selectedAgent={selectedAgent}
                  />
                </div>
              </div>

              {/* Execution Agents */}
              <div
                className="card animate-slide-up"
                style={{ animationDelay: '100ms' }}
              >
                <div className="p-5 sm:p-6 border-b">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-success" />
                    <h2 className="text-sm font-semibold tracking-tight">
                      Execution Agents
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Perform specific tasks
                  </p>
                </div>
                <div className="p-3">
                  <AgentList
                    agents={executionAgents}
                    onSelectAgent={setSelectedAgent}
                    selectedAgent={selectedAgent}
                  />
                </div>
              </div>
            </div>

            {/* Workflow Graph + Details - Right Column */}
            <div className="lg:col-span-3 space-y-6">
              {/* Workflow Graph */}
              <div
                className="card animate-slide-up"
                style={{ animationDelay: '50ms' }}
              >
                <div className="p-5 sm:p-6 border-b">
                  <h2 className="text-sm font-semibold tracking-tight mb-1">
                    Agent Workflow
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Visual representation of agent interactions
                  </p>
                </div>
                <div className="p-4">
                  <WorkflowGraph agents={displayAgents} />
                </div>
              </div>

              {/* Selected Agent Details */}
              {selectedAgent && (
                <div
                  className="card animate-scale-in overflow-hidden"
                  key={selectedAgent.agent_id}
                >
                  <div className="p-5 sm:p-6 border-b bg-muted/30">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center',
                            selectedAgent.agent_type === 'orchestration'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-success/10 text-success'
                          )}
                        >
                          {agentIcons[selectedAgent.agent_id] || (
                            <Cpu className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <h2 className="text-base font-semibold tracking-tight">
                            {selectedAgent.agent_name}
                          </h2>
                          <p className="text-xs text-muted-foreground font-mono">
                            {selectedAgent.agent_id}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'badge',
                          selectedAgent.agent_type === 'orchestration'
                            ? 'badge-default'
                            : 'badge-success'
                        )}
                      >
                        {selectedAgent.agent_type}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 space-y-5">
                    {/* Description */}
                    {selectedAgent.description && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Description
                        </p>
                        <p className="text-sm leading-relaxed">
                          {selectedAgent.description}
                        </p>
                      </div>
                    )}

                    {/* Capabilities */}
                    {selectedAgent.capabilities && selectedAgent.capabilities.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Capabilities
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedAgent.capabilities.map((cap) => (
                            <span
                              key={cap}
                              className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-lg"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Status */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Status
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-2.5 h-2.5 rounded-full',
                            selectedAgent.is_active
                              ? 'bg-success'
                              : 'bg-muted-foreground/40'
                          )}
                        />
                        <span className="text-sm font-medium">
                          {selectedAgent.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
