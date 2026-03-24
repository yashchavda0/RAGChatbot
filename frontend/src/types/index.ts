// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sources?: Source[];
  agent_executions?: AgentExecution[];
}

export interface Source {
  type: 'document' | 'web' | 'ocr';
  filename?: string;
  chunk_id?: string;
  url?: string;
  title?: string;
  snippet?: string;
}

export interface AgentExecution {
  agent_id: string;
  agent_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  execution_time_ms?: number;
}

// Agent Types
export interface Agent {
  agent_id: string;
  agent_name: string;
  agent_type: 'orchestration' | 'execution' | 'indexing';
  description: string;
  capabilities: string[];
  is_active: boolean;
}

export interface AgentStatus extends Agent {
  current_status?: 'idle' | 'running';
  last_execution?: AgentExecution;
}

// Document Types
export interface Document {
  document_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
  indexed_at?: string;
  metadata?: Record<string, unknown>;
}

export interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'indexing' | 'complete' | 'error';
  error?: string;
}

// WebSocket Message Types
export interface WSMessage {
  type: 'agent_update' | 'chat_chunk' | 'chat_complete' | 'error';
  session_id?: string;
  data: unknown;
}

export interface AgentUpdateMessage extends WSMessage {
  type: 'agent_update';
  data: {
    agent_id: string;
    agent_name: string;
    status: 'running' | 'completed' | 'failed';
    output_data?: Record<string, unknown>;
    error?: string;
  };
}

export interface ChatChunkMessage extends WSMessage {
  type: 'chat_chunk';
  data: {
    chunk: string;
  };
}

export interface ChatCompleteMessage extends WSMessage {
  type: 'chat_complete';
  data: {
    response: string;
    sources: Source[];
    agent_executions: AgentExecution[];
  };
}

export interface ErrorMessage extends WSMessage {
  type: 'error';
  data: {
    message: string;
    details?: string;
  };
}

// WebSocket message sending types
export interface WSChatMessage {
  type: 'chat_message';
  session_id: string;
  message: string;
}

// Workflow Graph Types
export interface WorkflowNode {
  id: string;
  label: string;
  type: 'entry' | 'orchestration' | 'execution' | 'exit';
  status: 'idle' | 'running' | 'completed' | 'failed';
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}
