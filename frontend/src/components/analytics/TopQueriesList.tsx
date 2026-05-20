'use client';

import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/shared/GlassCard';
import { formatNumber, formatPercentage } from '@/lib/utils/formatters';
import type { TopQuery } from '@/types/analytics';

interface TopQueriesListProps {
  queries: TopQuery[];
  isLoading?: boolean;
  maxItems?: number;
}

export function TopQueriesList({
  queries,
  isLoading = false,
  maxItems = 10,
}: TopQueriesListProps) {
  const getTrendIcon = (trend: TopQuery['trend']) => {
    switch (trend) {
      case 'up':
        return (
          <svg className="w-4 h-4 text-[#34C759]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-4 h-4 text-[#FF3B30]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-[#86868B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        );
    }
  };

  const getSatisfactionColor = (satisfaction: number): string => {
    if (satisfaction >= 80) return 'text-[#34C759]';
    if (satisfaction >= 60) return 'text-[#FF9500]';
    return 'text-[#FF3B30]';
  };

  const displayedQueries = queries.slice(0, maxItems);
  const maxCount = Math.max(...queries.map((q) => q.count));

  if (isLoading) {
    return (
      <GlassCard>
        <div className="h-6 w-32 rounded bg-gray-200/50 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="h-4 w-6 rounded bg-gray-200/50" />
              <div className="h-4 flex-1 rounded bg-gray-200/50" />
            </div>
          ))}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[#1D1D1F]">Top Queries</h3>
          <p className="text-sm text-[#86868B]">Most frequently asked questions</p>
        </div>
      </div>

      <div className="space-y-3">
        {displayedQueries.map((query, index) => (
          <div
            key={query.id}
            className="group relative flex items-center gap-4 p-3 rounded-xl hover:bg-[#F5F5F7] transition-colors"
          >
            {/* Rank */}
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[#5B5EFF]/10 text-[#5B5EFF] font-semibold text-sm">
              {index + 1}
            </div>

            {/* Query content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1D1D1F] truncate">{query.query}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-[#86868B]">{query.category}</span>
                <span className={cn('text-xs font-medium', getSatisfactionColor(query.satisfaction))}>
                  {formatPercentage(query.satisfaction)} satisfaction
                </span>
              </div>
            </div>

            {/* Count and trend */}
            <div className="flex items-center gap-3">
              <div className="w-24 h-2 bg-[#E5E5EA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#5B5EFF] to-[#8B7FFF] rounded-full"
                  style={{ width: `${(query.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-[#1D1D1F] w-12 text-right">
                {formatNumber(query.count)}
              </span>
              {getTrendIcon(query.trend)}
            </div>
          </div>
        ))}
      </div>

      {queries.length > maxItems && (
        <button className="w-full mt-4 py-2 text-sm font-medium text-[#5B5EFF] hover:text-[#3D3DD9] transition-colors">
          View all {queries.length} queries
        </button>
      )}
    </GlassCard>
  );
}
