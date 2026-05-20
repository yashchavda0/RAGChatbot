// Chatbot Types for Multi-Tenant RAG Chatbot SaaS

export type ChatbotStatus = 'live' | 'draft' | 'inactive';

export interface Chatbot {
  id: string;
  name: string;
  description: string;
  status: ChatbotStatus;
  createdAt: string;
  updatedAt: string;
  userId: string;

  // Configuration
  welcomeMessage?: string;
  avatarUrl?: string;
  theme: ChatbotTheme;
  settings: ChatbotSettings;

  // Stats (computed)
  conversationCount: number;
  messageCount: number;
  lastActiveAt?: string;
}

export interface ChatbotTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  fontFamily: string;
}

export interface ChatbotSettings {
  modelName: string;
  temperature: number;
  maxTokens: number;
  rateLimit: number; // requests per minute
  enableWebSearch: boolean;
  enableOCR: boolean;
  enableDocumentSearch: boolean;
}

export interface CreateChatbotRequest {
  name: string;
  description: string;
  welcomeMessage?: string;
  theme?: Partial<ChatbotTheme>;
  settings?: Partial<ChatbotSettings>;
}

export interface UpdateChatbotRequest extends Partial<CreateChatbotRequest> {
  status?: ChatbotStatus;
}

export interface ChatbotListItem {
  id: string;
  name: string;
  description: string;
  status: ChatbotStatus;
  conversationCount: number;
  lastActiveAt?: string;
  createdAt: string;
}
