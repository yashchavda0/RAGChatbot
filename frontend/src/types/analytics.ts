// Analytics Types for Multi-Tenant RAG Chatbot SaaS

export type DateRange = '24h' | '7d' | '30d' | '90d' | '12m' | 'custom';

export interface DateRangeOption {
  value: DateRange;
  label: string;
  days: number | null; // null for custom
}

export interface AnalyticsMetrics {
  totalConversations: number;
  conversationsChange: number; // Percentage change from previous period
  totalMessages: number;
  messagesChange: number;
  avgResponseTime: number; // in milliseconds
  responseTimeChange: number;
  userSatisfaction: number; // 0-100 percentage
  satisfactionChange: number;
  resolutionRate: number; // Percentage of queries resolved
  resolutionChange: number;
  activeUsers: number;
  activeUsersChange: number;
}

export interface ConversationTrend {
  date: string; // ISO date string
  conversations: number;
  messages: number;
  avgResponseTime: number;
}

export interface TopQuery {
  id: string;
  query: string;
  count: number;
  category: string;
  satisfaction: number; // 0-100
  trend: 'up' | 'down' | 'stable';
}

export interface SatisfactionData {
  excellent: number; // Count
  good: number;
  neutral: number;
  poor: number;
}

export interface KnowledgeBaseUsage {
  sourceId: string;
  sourceName: string;
  sourceType: 'document' | 'qa' | 'url';
  usageCount: number;
  lastUsed: string;
  relevance: number; // Average relevance score
}

export interface AgentExecutionStats {
  agentId: string;
  agentName: string;
  executionCount: number;
  avgDuration: number; // milliseconds
  successRate: number; // percentage
  lastExecuted: string;
}

export interface ConversationSummary {
  id: string;
  chatbotId: string;
  userId?: string;
  startedAt: string;
  endedAt?: string;
  messageCount: number;
  resolved: boolean;
  satisfaction?: number;
  topIntent?: string;
}

export interface AnalyticsFilter {
  dateRange: DateRange;
  customStartDate?: string;
  customEndDate?: string;
  agentId?: string;
  intentType?: string;
}

export interface AnalyticsExportData {
  metrics: AnalyticsMetrics;
  trends: ConversationTrend[];
  topQueries: TopQuery[];
  satisfaction: SatisfactionData;
  knowledgeUsage: KnowledgeBaseUsage[];
  agentStats: AgentExecutionStats[];
  exportedAt: string;
  dateRange: {
    start: string;
    end: string;
  };
}

// Chart data types
export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
}

export interface DonutChartData {
  label: string;
  value: number;
  color: string;
}
