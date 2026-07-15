// Chat wire-protocol types now live in @ragchatbot/shared-types (shared with
// packages/widget) — re-exported here so existing `@/types` imports keep working.
export type {
  ChatMessage,
  Source,
  AgentExecution,
  WSMessage,
  AgentUpdateMessage,
  ChatChunkMessage,
  ChatCompleteMessage,
  ErrorMessage,
  WSChatMessage,
} from "@ragchatbot/shared-types";

// Agent Types
export interface Agent {
  agent_id: string;
  agent_name: string;
  agent_type: "orchestration" | "execution" | "indexing";
  description?: string;
  capabilities?: string[];
  is_active?: boolean;
}

export interface AgentStatus extends Agent {
  current_status?: "idle" | "running";
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
  status: "uploading" | "processing" | "indexing" | "complete" | "error";
  error?: string;
}

// Workflow Graph Types
export interface WorkflowNode {
  id: string;
  label: string;
  type: "entry" | "orchestration" | "execution" | "exit";
  status: "idle" | "running" | "completed" | "failed";
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

// Re-export Conversation Types
export type {
  ConversationMessage,
  ConversationSource,
  Conversation,
  ConversationFilters,
  ConversationPagination,
} from "./conversation";
