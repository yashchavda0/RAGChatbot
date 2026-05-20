// Conversation Types for Conversations History Page

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: ConversationSource[];
}

export interface ConversationSource {
  id: string;
  type: 'document' | 'web' | 'ocr';
  title: string;
  url?: string;
  snippet?: string;
}

export interface ConversationUser {
  identifier: string; // email, IP, or session ID
  type: 'email' | 'ip' | 'session';
  userAgent?: string;
  device?: string;
  browser?: string;
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
}

export interface Conversation {
  id: string;
  chatbotId: string;
  user: ConversationUser;
  messages: ConversationMessage[];
  status: 'resolved' | 'unresolved' | 'flagged';
  rating?: number; // 1-5 stars
  feedback?: string;
  tags: string[];
  notes?: string;
  startedAt: Date;
  endedAt?: Date;
  duration?: number; // in seconds
  messageCount: number;
  preview: string; // first message preview
}

export interface ConversationFilters {
  search: string;
  status: 'all' | 'unresolved' | 'flagged' | 'resolved' | 'with_feedback';
  dateRange: {
    start?: Date;
    end?: Date;
  };
  sortBy: 'newest' | 'oldest' | 'longest' | 'shortest';
}

export interface ConversationPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
