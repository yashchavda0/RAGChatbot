'use client';

import { MetricsGrid } from '@/components/analytics/MetricsGrid';
import { ConversationChart } from '@/components/analytics/ConversationChart';
import { TopQueriesList } from '@/components/analytics/TopQueriesList';
import { SatisfactionChart } from '@/components/analytics/SatisfactionChart';
import { KnowledgeUsage } from '@/components/analytics/KnowledgeUsage';
import { AgentStats } from '@/components/analytics/AgentStats';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { ExportButton } from '@/components/analytics/ExportButton';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AnalyticsPageProps {
  params: { chatbotId: string };
}

export default function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { chatbotId } = params;

  const {
    metrics,
    trends,
    topQueries,
    satisfaction,
    knowledgeUsage,
    agentStats,
    isLoading,
    error,
    dateRange,
    setDateRange,
    exportData,
  } = useAnalytics(chatbotId);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FF3B30]/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[#FF3B30]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">Failed to load analytics</h3>
          <p className="text-[#86868B] mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#5B5EFF] text-white rounded-xl hover:bg-[#3D3DD9] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Analytics</h1>
          <p className="text-[#86868B] mt-1">
            Monitor your chatbot performance and user interactions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <ExportButton onExport={exportData} isLoading={isLoading} />
        </div>
      </div>

      {/* Metrics Grid */}
      {metrics && <MetricsGrid metrics={metrics} isLoading={isLoading} />}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConversationChart data={trends} isLoading={isLoading} height={300} />
        <SatisfactionChart
          data={satisfaction || { excellent: 0, good: 0, neutral: 0, poor: 0 }}
          isLoading={isLoading}
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopQueriesList queries={topQueries} isLoading={isLoading} maxItems={10} />
        <AgentStats stats={agentStats} isLoading={isLoading} />
      </div>

      {/* Knowledge Usage */}
      <KnowledgeUsage data={knowledgeUsage} isLoading={isLoading} />
    </div>
  );
}
