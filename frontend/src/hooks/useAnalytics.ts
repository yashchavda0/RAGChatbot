import { useState, useEffect, useCallback } from 'react';
import type {
  AnalyticsMetrics,
  ConversationTrend,
  TopQuery,
  SatisfactionData,
  KnowledgeBaseUsage,
  AgentExecutionStats,
  DateRange,
  AnalyticsFilter,
} from '@/types/analytics';

interface UseAnalyticsReturn {
  // Data
  metrics: AnalyticsMetrics | null;
  trends: ConversationTrend[];
  topQueries: TopQuery[];
  satisfaction: SatisfactionData | null;
  knowledgeUsage: KnowledgeBaseUsage[];
  agentStats: AgentExecutionStats[];

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  refetch: () => Promise<void>;
  setDateRange: (range: DateRange, customStart?: string, customEnd?: string) => void;
  dateRange: DateRange;
  exportData: (format: 'csv' | 'json') => Promise<void>;
}

// Mock data generator for development
function generateMockData(filter: AnalyticsFilter) {
  const days = filter.dateRange === 'custom'
    ? 30
    : filter.dateRange === '24h'
      ? 1
      : filter.dateRange === '7d'
        ? 7
        : filter.dateRange === '30d'
          ? 30
          : 90;

  // Generate trends
  const trends: ConversationTrend[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    trends.push({
      date: date.toISOString(),
      conversations: Math.floor(Math.random() * 100) + 20,
      messages: Math.floor(Math.random() * 500) + 100,
      avgResponseTime: Math.floor(Math.random() * 2000) + 500,
    });
  }

  // Generate metrics
  const totalConversations = trends.reduce((sum, t) => sum + t.conversations, 0);
  const metrics: AnalyticsMetrics = {
    totalConversations,
    conversationsChange: (Math.random() * 40 - 10),
    totalMessages: trends.reduce((sum, t) => sum + t.messages, 0),
    messagesChange: (Math.random() * 30 - 5),
    avgResponseTime: trends.reduce((sum, t) => sum + t.avgResponseTime, 0) / trends.length,
    responseTimeChange: (Math.random() * 20 - 15),
    userSatisfaction: Math.floor(Math.random() * 20) + 75,
    satisfactionChange: (Math.random() * 15 - 5),
    resolutionRate: Math.floor(Math.random() * 15) + 80,
    resolutionChange: (Math.random() * 10 - 3),
    activeUsers: Math.floor(Math.random() * 500) + 100,
    activeUsersChange: (Math.random() * 25 - 5),
  };

  // Generate top queries
  const topQueries: TopQuery[] = [
    { id: '1', query: 'How do I reset my password?', count: 847, category: 'Account', satisfaction: 92, trend: 'up' },
    { id: '2', query: 'What are your pricing plans?', count: 623, category: 'Sales', satisfaction: 88, trend: 'stable' },
    { id: '3', query: 'How to integrate the API?', count: 512, category: 'Technical', satisfaction: 85, trend: 'up' },
    { id: '4', query: 'Can I export my data?', count: 445, category: 'Features', satisfaction: 91, trend: 'stable' },
    { id: '5', query: 'What models do you support?', count: 398, category: 'Technical', satisfaction: 94, trend: 'up' },
    { id: '6', query: 'How to upgrade my plan?', count: 356, category: 'Billing', satisfaction: 89, trend: 'down' },
    { id: '7', query: 'Is my data secure?', count: 312, category: 'Security', satisfaction: 96, trend: 'stable' },
    { id: '8', query: 'How to add team members?', count: 289, category: 'Account', satisfaction: 87, trend: 'up' },
    { id: '9', query: 'What file formats are supported?', count: 267, category: 'Features', satisfaction: 93, trend: 'stable' },
    { id: '10', query: 'How to contact support?', count: 234, category: 'Support', satisfaction: 82, trend: 'down' },
  ];

  // Generate satisfaction data
  const satisfaction: SatisfactionData = {
    excellent: Math.floor(Math.random() * 300) + 400,
    good: Math.floor(Math.random() * 200) + 250,
    neutral: Math.floor(Math.random() * 100) + 50,
    poor: Math.floor(Math.random() * 50) + 20,
  };

  // Generate knowledge base usage
  const knowledgeUsage: KnowledgeBaseUsage[] = [
    { sourceId: '1', sourceName: 'Product Documentation.pdf', sourceType: 'document', usageCount: 1247, lastUsed: '2024-01-15T10:30:00Z', relevance: 0.92 },
    { sourceId: '2', sourceName: 'API Reference Guide', sourceType: 'document', usageCount: 983, lastUsed: '2024-01-15T11:45:00Z', relevance: 0.88 },
    { sourceId: '3', sourceName: 'Pricing FAQ', sourceType: 'qa', usageCount: 756, lastUsed: '2024-01-15T09:20:00Z', relevance: 0.95 },
    { sourceId: '4', sourceName: 'Getting Started Guide', sourceType: 'document', usageCount: 654, lastUsed: '2024-01-15T10:15:00Z', relevance: 0.91 },
    { sourceId: '5', sourceName: 'https://docs.example.com', sourceType: 'url', usageCount: 523, lastUsed: '2024-01-15T08:50:00Z', relevance: 0.87 },
    { sourceId: '6', sourceName: 'Troubleshooting Guide', sourceType: 'document', usageCount: 489, lastUsed: '2024-01-14T16:30:00Z', relevance: 0.93 },
    { sourceId: '7', sourceName: 'Security Whitepaper', sourceType: 'document', usageCount: 412, lastUsed: '2024-01-14T14:20:00Z', relevance: 0.96 },
    { sourceId: '8', sourceName: 'Integration Examples', sourceType: 'qa', usageCount: 378, lastUsed: '2024-01-14T11:10:00Z', relevance: 0.89 },
  ];

  // Generate agent stats
  const agentStats: AgentExecutionStats[] = [
    { agentId: 'intent_classifier', agentName: 'Intent Classifier', executionCount: 5234, avgDuration: 145, successRate: 99.2, lastExecuted: '2024-01-15T12:00:00Z' },
    { agentId: 'document_search', agentName: 'Document Search', executionCount: 4128, avgDuration: 234, successRate: 98.7, lastExecuted: '2024-01-15T12:00:00Z' },
    { agentId: 'web_search', agentName: 'Web Search', executionCount: 1893, avgDuration: 1567, successRate: 96.4, lastExecuted: '2024-01-15T11:58:00Z' },
    { agentId: 'reranker', agentName: 'Reranker', executionCount: 3856, avgDuration: 89, successRate: 99.8, lastExecuted: '2024-01-15T12:00:00Z' },
    { agentId: 'response_synthesis', agentName: 'Response Synthesis', executionCount: 5234, avgDuration: 2345, successRate: 97.3, lastExecuted: '2024-01-15T12:00:00Z' },
  ];

  return { metrics, trends, topQueries, satisfaction, knowledgeUsage, agentStats };
}

export function useAnalytics(chatbotId: string): UseAnalyticsReturn {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [trends, setTrends] = useState<ConversationTrend[]>([]);
  const [topQueries, setTopQueries] = useState<TopQuery[]>([]);
  const [satisfaction, setSatisfaction] = useState<SatisfactionData | null>(null);
  const [knowledgeUsage, setKnowledgeUsage] = useState<KnowledgeBaseUsage[]>([]);
  const [agentStats, setAgentStats] = useState<AgentExecutionStats[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRangeState] = useState<DateRange>('7d');
  const [customStart, setCustomStart] = useState<string | undefined>();
  const [customEnd, setCustomEnd] = useState<string | undefined>();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // In production, this would be an actual API call
      // const response = await apiClient.get(`/chatbots/${chatbotId}/analytics`, {
      //   params: { dateRange, startDate: customStart, endDate: customEnd }
      // });

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      const filter: AnalyticsFilter = {
        dateRange,
        customStartDate: customStart,
        customEndDate: customEnd,
      };

      const data = generateMockData(filter);

      setMetrics(data.metrics);
      setTrends(data.trends);
      setTopQueries(data.topQueries);
      setSatisfaction(data.satisfaction);
      setKnowledgeUsage(data.knowledgeUsage);
      setAgentStats(data.agentStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  }, [chatbotId, dateRange, customStart, customEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setDateRange = useCallback((range: DateRange, start?: string, end?: string) => {
    setDateRangeState(range);
    setCustomStart(start);
    setCustomEnd(end);
  }, []);

  const exportData = useCallback(async (format: 'csv' | 'json') => {
    const exportPayload = {
      metrics,
      trends,
      topQueries,
      satisfaction,
      knowledgeUsage,
      agentStats,
      exportedAt: new Date().toISOString(),
      dateRange: {
        start: customStart || dateRange,
        end: customEnd || dateRange,
      },
    };

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(exportPayload, null, 2);
      filename = `analytics-${chatbotId}-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else {
      // Simple CSV conversion
      const rows = [
        ['Date', 'Conversations', 'Messages', 'Avg Response Time'],
        ...trends.map((t) => [
          t.date.split('T')[0],
          t.conversations.toString(),
          t.messages.toString(),
          t.avgResponseTime.toString(),
        ]),
      ];
      content = rows.map((row) => row.join(',')).join('\n');
      filename = `analytics-${chatbotId}-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [chatbotId, metrics, trends, topQueries, satisfaction, knowledgeUsage, agentStats, customStart, customEnd, dateRange]);

  return {
    metrics,
    trends,
    topQueries,
    satisfaction,
    knowledgeUsage,
    agentStats,
    isLoading,
    error,
    refetch: fetchData,
    setDateRange,
    dateRange,
    exportData,
  };
}
