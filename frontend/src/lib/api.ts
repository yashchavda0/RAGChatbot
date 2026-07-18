const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ChatbotResponse {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  status: string;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  settings: Record<string, any> | null;
  created_at: string | null;
}

export interface ChatbotListResponse {
  chatbots: ChatbotResponse[];
  total: number;
}

export interface CreateChatbotRequest {
  name: string;
  description?: string;
  system_prompt?: string;
}

export interface UpdateChatbotRequest {
  name?: string;
  description?: string;
  system_prompt?: string;
  settings?: Record<string, any>;
}

export interface DocumentResponse {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "processing" | "indexed" | "error";
  uploadDate: string;
  chunks?: number;
  error?: string;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    let message = `Request failed with status ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      message = errorJson.detail || errorJson.message || message;
    } catch {
      if (errorText) message = errorText;
    }
    throw new ApiError(response.status, message);
  }
  return response.json();
}

export interface CrawledPage {
  url: string;
  text: string;
  title: string;
  description: string;
}

export interface CrawlResponse {
  source_url: string;
  discovered_links: CrawledPage[];
  total_discovered: number;
  pages_visited: number;
  crawl_depth_reached: number;
}

export const chatApi = {
  getHistory: async (chatbotId: string, sessionId: string) => {
    const params = new URLSearchParams({ session_id: sessionId, limit: "100" });
    const response = await fetch(
      `${API_URL}/chat/${chatbotId}/history?${params}`,
    );
    return handleResponse<{
      session_id: string;
      chatbot_id: string;
      messages: any[];
    }>(response);
  },
};

export const chatbotApi = {
  list: async (
    status?: string,
    limit: number = 50,
  ): Promise<ChatbotListResponse> => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    params.append("limit", String(limit));

    const response = await fetch(`${API_URL}/chatbots?${params}`);
    return handleResponse<ChatbotListResponse>(response);
  },

  get: async (id: string): Promise<ChatbotResponse> => {
    const response = await fetch(`${API_URL}/chatbots/${id}`);
    return handleResponse<ChatbotResponse>(response);
  },

  create: async (data: CreateChatbotRequest): Promise<ChatbotResponse> => {
    const response = await fetch(`${API_URL}/chatbots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<ChatbotResponse>(response);
  },

  update: async (
    id: string,
    data: UpdateChatbotRequest,
  ): Promise<ChatbotResponse> => {
    const response = await fetch(`${API_URL}/chatbots/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<ChatbotResponse>(response);
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/chatbots/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new ApiError(response.status, "Failed to delete chatbot");
    }
  },

  activate: async (id: string): Promise<ChatbotResponse> => {
    const response = await fetch(`${API_URL}/chatbots/${id}/activate`, {
      method: "POST",
    });
    return handleResponse<ChatbotResponse>(response);
  },

  getStatus: async (id: string) => {
    const response = await fetch(`${API_URL}/chatbots/${id}/status`);
    return handleResponse(response);
  },
};

export const documentApi = {
  list: async (chatbotId: string) => {
    const response = await fetch(`${API_URL}/chatbots/${chatbotId}/documents`);
    return handleResponse<{ documents: any[] }>(response);
  },

  get: async (chatbotId: string, documentId: string) => {
    const response = await fetch(
      `${API_URL}/chatbots/${chatbotId}/documents/${documentId}`,
    );
    return handleResponse<{ download_url?: string }>(response);
  },

  delete: async (chatbotId: string, documentId: string) => {
    const response = await fetch(
      `${API_URL}/chatbots/${chatbotId}/documents/${documentId}`,
      {
        method: "DELETE",
      },
    );
    return handleResponse(response);
  },

  upload: async (chatbotId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_URL}/chatbots/${chatbotId}/documents`, {
      method: "POST",
      body: formData,
    });
    return handleResponse<{ document_id: string }>(response);
  },

  addUrl: async (chatbotId: string, url: string) => {
    const response = await fetch(`${API_URL}/chatbots/${chatbotId}/urls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    return handleResponse<{ document_id: string }>(response);
  },

  addText: async (chatbotId: string, text: string, sourceName?: string) => {
    const response = await fetch(`${API_URL}/chatbots/${chatbotId}/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, source_name: sourceName }),
    });
    return handleResponse<{ document_id: string }>(response);
  },

  crawlUrl: async (
    chatbotId: string,
    url: string,
    options?: {
      maxDepth?: number;
      maxLinks?: number;
      sameDomainOnly?: boolean;
    },
  ): Promise<CrawlResponse> => {
    const response = await fetch(
      `${API_URL}/chatbots/${chatbotId}/urls/crawl`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          max_depth: options?.maxDepth ?? 2,
          max_links: options?.maxLinks ?? 100,
          same_domain_only: options?.sameDomainOnly ?? true,
        }),
      },
    );
    return handleResponse<CrawlResponse>(response);
  },

  scrapeUrls: async (chatbotId: string, urls: string[], sourceUrl?: string) => {
    const response = await fetch(
      `${API_URL}/chatbots/${chatbotId}/urls/scrape`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls, source_url: sourceUrl }),
      },
    );
    return handleResponse(response);
  },
};

export interface CustomizationResponse {
  id: string;
  chatbot_id: string;
  primary_color: string;
  position: string;
  size: string;
  border_radius: number;
  font_family: string;
  greeting: string;
  welcome_message: string;
  placeholder: string;
  bot_name: string;
  avatar_url: string | null;
  auto_open: boolean;
  show_typing_indicator: boolean;
  collect_user_info: boolean;
  input_max_chars: number;
  button_text: string;
  show_branding: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export const customizationApi = {
  get: async (chatbotId: string): Promise<CustomizationResponse> => {
    const response = await fetch(
      `${API_URL}/chatbots/${chatbotId}/customization`,
    );
    return handleResponse<CustomizationResponse>(response);
  },

  update: async (
    chatbotId: string,
    data: Partial<CustomizationResponse>,
  ): Promise<CustomizationResponse> => {
    const response = await fetch(
      `${API_URL}/chatbots/${chatbotId}/customization`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    return handleResponse<CustomizationResponse>(response);
  },
};

export { ApiError };
