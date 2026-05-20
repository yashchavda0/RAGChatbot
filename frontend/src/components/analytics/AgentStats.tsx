'use client';

import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/shared/GlassCard';
import { formatResponseTime, formatRelativeTime } from '@/lib/utils/formatters';
import type { AgentExecutionStats } from '@/types/analytics';

interface AgentStatsProps {
  stats: AgentExecutionStats[];
  isLoading?: boolean;
}

export function AgentStats({ stats, isLoading = false }: AgentStatsProps) {
  const getSuccessRateColor = (rate: number): string => {
    if (rate >= 95) return 'text-[#34C759]';
    if (rate >= 80) return 'text-[#FF9500]';
    return 'text-[#FF3B30]';
  };

  const getSuccessRateBg = (rate: number): string => {
    if (rate >= 95) return 'bg-[#34C759]';
    if (rate >= 80) return 'bg-[#FF9500]';
    return 'bg-[#FF3B30]';
  };

  if (isLoading) {
    return (
      <GlassCard className="animate-pulse">
        <div className="h-6 w-48 rounded bg-gray-200/50 mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gray-200/30">
              <div className="h-4 flex-1 rounded bg-gray-200/50" />
              <div className="h-4 w-20 rounded bg-gray-200/50" />
            </div>
          ))}
        </div>
      </GlassCard>
    );
  }

  const maxExecutions = Math.max(...stats.map((s) => s.executionCount));

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[#1D1D1F]">Agent Performance</h3>
          <p className="text-sm text-[#86868B]">Execution stats by agent</p>
        </div>
      </div>

      <div className="space-y-3">
        {stats.map((agent) => (
          <div
            key={agent.agentId}
            className="p-4 rounded-xl bg-[#F5F5F7]/50 hover:bg-[#F5F5F7] transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5B5EFF]/20 to-[#5B5EFF]/5 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-[#5B5EFF]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-[#1D1D1F]">{agent.agentName}</p>
                  <p className="text-xs text-[#86868B]">
                    Last run: {formatRelativeTime(agent.lastExecuted)}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className={cn('text-lg font-bold', getSuccessRateColor(agent.successRate))}>
                  {agent.successRate.toFixed(1)}%
                </p>
                <p className="text-xs text-[#86868B]">success rate</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-[#86868B] text-xs mb-1">Executions</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[#E5E5EA] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#5B5EFF] rounded-full"
                      style={{ width: `${(agent.executionCount / maxExecutions) * 100}%` }}
                    />
                  </div>
                  <span className="font-medium text-[#1D1D1F]">{agent.executionCount}</span>
                </div>
              </div>

              <div>
                <p className="text-[#86868B] text-xs mb-1">Avg Duration</p>
                <p className="font-medium text-[#1D1D1F]">{formatResponseTime(agent.avgDuration)}</p>
              </div>

              <div>
                <p className="text-[#86868B] text-xs mb-1">Status</p>
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      getSuccessRateBg(agent.successRate)
                    )}
                  />
                  <span className="font-medium text-[#1D1D1F]">
                    {agent.successRate >= 95 ? 'Healthy' : agent.successRate >= 80 ? 'Warning' : 'Issues'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
