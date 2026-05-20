'use client';

import React from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { AgentExecution } from '@/types';
import { formatExecutionTime, cn } from '@/lib/utils';

interface AgentExecutionCardProps {
  execution: AgentExecution;
}

export function AgentExecutionCard({ execution }: AgentExecutionCardProps) {
  const getStatusConfig = () => {
    switch (execution.status) {
      case 'running':
        return {
          bg: 'bg-[#5B5EFF]/[0.08]',
          text: 'text-[#5B5EFF]',
          border: 'border-[#5B5EFF]/20',
          icon: <Loader2 className="w-3 h-3 animate-spin text-[#5B5EFF]" />,
          label: 'Running'
        };
      case 'completed':
        return {
          bg: 'bg-[#34C759]/[0.1]',
          text: 'text-[#34C759]',
          border: 'border-[#34C759]/20',
          icon: <CheckCircle2 className="w-3 h-3 text-[#34C759]" />,
          label: 'Done'
        };
      case 'failed':
        return {
          bg: 'bg-[#FF3B30]/[0.1]',
          text: 'text-[#FF3B30]',
          border: 'border-[#FF3B30]/20',
          icon: <XCircle className="w-3 h-3 text-[#FF3B30]" />,
          label: 'Failed'
        };
      default:
        return {
          bg: 'bg-[#6E6E73]/[0.08]',
          text: 'text-[#6E6E73]',
          border: 'border-[#6E6E73]/20',
          icon: <div className="w-1.5 h-1.5 rounded-full bg-[#6E6E73]" />,
          label: 'Pending'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium border',
        config.bg,
        config.text,
        config.border
      )}
    >
      {execution.status === 'running' && (
        <div className="relative">
          <div className="w-1.5 h-1.5 rounded-full bg-[#5B5EFF] absolute" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#5B5EFF] agent-running" />
        </div>
      )}
      {execution.status !== 'running' && config.icon}
      <span className="whitespace-nowrap">{execution.agent_name}</span>
      {execution.status === 'completed' && execution.execution_time_ms && (
        <span className="text-[10px] text-[#6E6E73]/60 ml-0.5">
          {formatExecutionTime(execution.execution_time_ms)}
        </span>
      )}
    </div>
  );
}
