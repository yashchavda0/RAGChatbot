'use client';

import React, { memo } from 'react';
import { AgentStatus } from '@/types';
import { cn } from '@/lib/utils';

interface AgentListProps {
  agents: AgentStatus[];
  onSelectAgent: (agent: AgentStatus) => void;
  selectedAgent: AgentStatus | null;
}

export const AgentList = memo(function AgentList({
  agents,
  onSelectAgent,
  selectedAgent,
}: AgentListProps) {
  if (agents.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No agents available</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {agents.map((agent, index) => {
        const isSelected = selectedAgent?.agent_id === agent.agent_id;
        const isOrchestration = agent.agent_type === 'orchestration';
        const accentColor = isOrchestration ? 'primary' : 'success';

        return (
          <button
            key={agent.agent_id}
            onClick={() => onSelectAgent(agent)}
            className={cn(
              'w-full text-left px-4 py-3 rounded-xl transition-all duration-200 group',
              'hover:bg-muted/50',
              isSelected && 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
            )}
            style={{
              animationDelay: `${index * 30}ms`,
            }}
          >
            <div className="flex items-center gap-3">
              {/* Color Indicator */}
              <div
                className={cn(
                  'w-1.5 h-8 rounded-full transition-colors',
                  isSelected
                    ? 'bg-primary-foreground/30'
                    : isOrchestration
                    ? 'bg-primary'
                    : 'bg-success'
                )}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3
                    className={cn(
                      'text-sm font-semibold truncate transition-colors',
                      isSelected
                        ? 'text-primary-foreground'
                        : 'text-foreground group-hover:text-foreground'
                    )}
                  >
                    {agent.agent_name}
                  </h3>
                  {/* Status Dot */}
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full flex-shrink-0',
                      agent.is_active
                        ? isSelected
                          ? 'bg-primary-foreground'
                          : 'bg-success'
                        : 'bg-muted-foreground/40'
                    )}
                  />
                </div>
                <p
                  className={cn(
                    'text-xs line-clamp-1 leading-relaxed transition-colors',
                    isSelected
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  )}
                >
                  {agent.description}
                </p>
              </div>

              {/* Arrow */}
              <div
                className={cn(
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  isSelected && 'opacity-100'
                )}
              >
                <svg
                  className={cn(
                    'w-4 h-4',
                    isSelected
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
});
