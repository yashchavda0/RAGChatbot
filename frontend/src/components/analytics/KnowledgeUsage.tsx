'use client';

import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/shared/GlassCard';
import { formatNumber, formatRelativeTime } from '@/lib/utils/formatters';
import type { KnowledgeBaseUsage } from '@/types/analytics';

interface KnowledgeUsageProps {
  data: KnowledgeBaseUsage[];
  isLoading?: boolean;
}

export function KnowledgeUsage({ data, isLoading = false }: KnowledgeUsageProps) {
  const getSourceIcon = (type: KnowledgeBaseUsage['sourceType']) => {
    switch (type) {
      case 'document':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case 'qa':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'url':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        );
    }
  };

  const getSourceTypeLabel = (type: KnowledgeBaseUsage['sourceType']): string => {
    switch (type) {
      case 'document':
        return 'Document';
      case 'qa':
        return 'Q&A Pair';
      case 'url':
        return 'URL';
    }
  };

  const maxUsage = Math.max(...data.map((d) => d.usageCount));

  if (isLoading) {
    return (
      <GlassCard className="animate-pulse">
        <div className="h-6 w-40 rounded bg-gray-200/50 mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
              <div className="h-10 w-10 rounded-xl bg-gray-200/50" />
              <div className="flex-1 h-4 rounded bg-gray-200/50" />
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
          <h3 className="text-lg font-semibold text-[#1D1D1F]">Knowledge Base Usage</h3>
          <p className="text-sm text-[#86868B]">Most referenced sources</p>
        </div>
      </div>

      <div className="space-y-2">
        {data.slice(0, 8).map((source) => (
          <div
            key={source.sourceId}
            className="group flex items-center gap-3 p-3 rounded-xl hover:bg-[#F5F5F7] transition-colors"
          >
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                source.sourceType === 'document' && 'bg-[#5B5EFF]/10 text-[#5B5EFF]',
                source.sourceType === 'qa' && 'bg-[#4ECDC4]/10 text-[#4ECDC4]',
                source.sourceType === 'url' && 'bg-[#FF9500]/10 text-[#FF9500]'
              )}
            >
              {getSourceIcon(source.sourceType)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[#1D1D1F] truncate">{source.sourceName}</p>
                <span className="text-xs px-1.5 py-0.5 rounded bg-[#E5E5EA] text-[#86868B]">
                  {getSourceTypeLabel(source.sourceType)}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-xs text-[#86868B]">
                  Relevance: {source.relevance.toFixed(2)}
                </span>
                <span className="text-xs text-[#86868B]">
                  Used: {formatRelativeTime(source.lastUsed)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-20 h-1.5 bg-[#E5E5EA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#5B5EFF] to-[#8B7FFF] rounded-full"
                  style={{ width: `${(source.usageCount / maxUsage) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-[#1D1D1F] w-12 text-right">
                {formatNumber(source.usageCount)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {data.length > 8 && (
        <button className="w-full mt-4 py-2 text-sm font-medium text-[#5B5EFF] hover:text-[#3D3DD9] transition-colors">
          View all {data.length} sources
        </button>
      )}
    </GlassCard>
  );
}
