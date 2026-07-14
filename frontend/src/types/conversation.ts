// Conversation Types for Conversations History Page

export interface ConversationMessage {
  message_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: ConversationSource[];
  agent_executions?: AgentExecution[];
  timestamp: string;
}

export interface ConversationSource {
  type: string;
  document_id?: string;
  filename?: string;
  relevance_score?: number;
  content?: string;
  source?: string;
  score?: number;
}

export interface AgentExecution {
  agent_id: string;
  agent_name?: string;
  status: string;
  duration_ms?: number;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  error_message?: string;
}

export interface Conversation {
  session_id: string;
  chatbot_id: string;
  first_message: string;
  last_message: string;
  message_count: number;
  user_messages: number;
  assistant_messages: number;
  started_at: string;
  last_activity: string;
  duration_seconds?: number;
}

export interface ConversationDetail {
  session_id: string;
  chatbot_id: string;
  messages: ConversationMessage[];
  started_at: string;
  last_activity: string;
  message_count: number;
}

export interface ConversationFilters {
  search: string;
  sortBy: 'newest' | 'oldest';
}

export interface ConversationPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

