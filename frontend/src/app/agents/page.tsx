'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Network, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AgentStatus } from '@/types';
import { WorkflowGraph } from '@/components/agents/WorkflowGraph';
import { AgentList } from '@/components/agents/AgentList';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentStatus | null>(null);

  const fetchAgents = async () => {
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
  };

  useEffect(() => {
    fetchAgents();
    // Refresh every 5 seconds
    const interval = setInterval(fetchAgents, 5000);
    return () => clearInterval(interval);
  }, []);

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

  const displayAgents = agents.length > 0 ? agents : defaultAgents;

  const orchestrationAgents = displayAgents.filter(a => a.agent_type === 'orchestration');
  const executionAgents = displayAgents.filter(a => a.agent_type === 'execution');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-primary" />
              <h1 className="font-semibold">Agents</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAgents}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link href="/chat">
              <Button variant="outline" size="sm">
                Go to Chat
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Agent List */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Orchestration Agents</CardTitle>
                <CardDescription>
                  Agents that manage workflow and routing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AgentList
                  agents={orchestrationAgents}
                  onSelectAgent={setSelectedAgent}
                  selectedAgent={selectedAgent}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Execution Agents</CardTitle>
                <CardDescription>
                  Agents that perform specific tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AgentList
                  agents={executionAgents}
                  onSelectAgent={setSelectedAgent}
                  selectedAgent={selectedAgent}
                />
              </CardContent>
            </Card>
          </div>

          {/* Workflow Graph */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Agent Workflow</CardTitle>
                <CardDescription>
                  Visual representation of agent interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorkflowGraph agents={displayAgents} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Selected Agent Details */}
        {selectedAgent && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{selectedAgent.agent_name}</CardTitle>
              <CardDescription>ID: {selectedAgent.agent_id}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                  <p className="text-sm">{selectedAgent.description}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Type</h4>
                  <p className="text-sm capitalize">{selectedAgent.agent_type}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Capabilities</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgent.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-md"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        selectedAgent.is_active ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                    <span className="text-sm">
                      {selectedAgent.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
