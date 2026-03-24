'use client';

import React from 'react';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { AgentExecution } from '@/types';
import { formatExecutionTime, cn } from '@/lib/utils';

interface AgentExecutionCardProps {
  execution: AgentExecution;
}

export function AgentExecutionCard({ execution }: AgentExecutionCardProps) {
  const getStatusIcon = () => {
    switch (execution.status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (execution.status) {
      case 'running':
        return 'border-blue-500/50 bg-blue-500/10';
      case 'completed':
        return 'border-green-500/50 bg-green-500/10';
      case 'failed':
        return 'border-red-500/50 bg-red-500/10';
      default:
        return 'border-muted bg-muted/30';
    }
  };

  return (
    <div className={cn(
      'text-sm p-3 rounded-lg border',
      getStatusColor()
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium">{execution.agent_name}</span>
        </div>
        {execution.execution_time_ms && (
          <span className="text-xs text-muted-foreground">
            {formatExecutionTime(execution.execution_time_ms)}
          </span>
        )}
      </div>

      {execution.error_message && (
        <p className="text-xs text-red-500 mt-2">{execution.error_message}</p>
      )}

      {execution.output_data && Object.keys(execution.output_data).length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium">Output:</span>{' '}
          {JSON.stringify(execution.output_data)}
        </div>
      )}
    </div>
  );
}
