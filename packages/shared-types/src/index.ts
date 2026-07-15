// Chat wire-protocol types shared between the dashboard (frontend) and the
// standalone embeddable widget (packages/widget).

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  sources?: Source[];
  agent_executions?: AgentExecution[];
  source_type?: "document" | "web" | "mixed";
  intent_confidence?: number;
  retrieval_confidence?: number;
  answer_source?: "documents" | "web" | "fallback";
  fallback_reason?: string;
  suggested_questions?: string[];
}

export interface Source {
  type: "document" | "web" | "ocr" | "url";
  filename?: string;
  document_name?: string;
  document_id?: string;
  chunk_id?: string;
  chunk_number?: number;
  page_number?: number;
  similarity_score?: number;
  content_preview?: string;
  url?: string;
  title?: string;
  snippet?: string;
}

export interface AgentExecution {
  agent_id: string;
  agent_name: string;
  status: "pending" | "running" | "completed" | "failed";
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  execution_time_ms?: number;
}

// WebSocket Message Types
export interface WSMessage {
  type: "agent_update" | "chat_chunk" | "chat_complete" | "error";
  session_id?: string;
  data: unknown;
}

export interface AgentUpdateMessage extends WSMessage {
  type: "agent_update";
  data: {
    agent_id: string;
    agent_name: string;
    status: "running" | "completed" | "failed";
    output_data?: Record<string, unknown>;
    error?: string;
  };
}

export interface ChatChunkMessage extends WSMessage {
  type: "chat_chunk";
  data: {
    chunk: string;
  };
}

export interface ChatCompleteMessage extends WSMessage {
  type: "chat_complete";
  data: {
    response: string;
    sources: Source[];
    agent_executions: AgentExecution[];
  };
}

export interface ErrorMessage extends WSMessage {
  type: "error";
  data: {
    message: string;
    details?: string;
  };
}

// WebSocket message sending types
export interface WSChatMessage {
  type: "chat_message";
  session_id: string;
  message: string;
}
