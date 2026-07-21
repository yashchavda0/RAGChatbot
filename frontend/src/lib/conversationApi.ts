import {
  Conversation,
  ConversationDetail,
  ConversationFilters,
  ConversationPagination,
  ConversationListResponse,
} from "@/types/conversation";

const API_URL = "/api";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.text();
    throw new ApiError(
      response.status,
      error || `API error: ${response.status}`,
    );
  }
  return response.json();
}

export const conversationApi = {
  async listConversations(
    chatbotId: string,
    filters?: ConversationFilters,
    pagination?: ConversationPagination,
  ): Promise<ConversationListResponse> {
    const params = new URLSearchParams();
    params.append("page", String(pagination?.page || 1));
    params.append("limit", String(pagination?.limit || 20));
    params.append("order", filters?.sortBy === "oldest" ? "asc" : "desc");

    if (filters?.search) {
      params.append("search", filters.search);
    }

    const url = `${API_URL}/chatbots/${chatbotId}/conversations?${params.toString()}`;
    const response = await fetch(url);
    return handleResponse<ConversationListResponse>(response);
  },

  async getConversation(
    chatbotId: string,
    sessionId: string,
  ): Promise<ConversationDetail> {
    const url = `${API_URL}/chatbots/${chatbotId}/conversations/${sessionId}`;
    const response = await fetch(url);
    return handleResponse<ConversationDetail>(response);
  },
};
