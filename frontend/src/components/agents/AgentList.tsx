'use client';

import React from 'react';
import { AgentStatus } from '@/types';
import { cn } from '@/lib/utils';

interface AgentListProps {
  agents: AgentStatus[];
  onSelectAgent: (agent: AgentStatus) => void;
  selectedAgent: AgentStatus | null;
}

export function AgentList({ agents, onSelectAgent, selectedAgent }: AgentListProps) {
  return (
    <div className="space-y-2">
      {agents.map((agent) => (
        <button
          key={agent.agent_id}
          onClick={() => onSelectAgent(agent)}
          className={cn(
            'w-full text-left p-3 rounded-lg border transition-all hover:shadow-md',
            selectedAgent?.agent_id === agent.agent_id
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/50'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">{agent.agent_name}</h3>
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    agent.is_active ? 'bg-green-500' : 'bg-gray-400'
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {agent.description}
              </p>
            </div>
            <div className="text-xs text-muted-foreground capitalize">
              {agent.agent_type}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
