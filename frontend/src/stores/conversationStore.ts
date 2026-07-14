import { create } from 'zustand';
import { Conversation, ConversationDetail, ConversationFilters, ConversationPagination } from '@/types/conversation';

interface ConversationState {
  conversations: Conversation[];
  selectedConversation: ConversationDetail | null;
  filters: ConversationFilters;
  pagination: ConversationPagination;
  isLoading: boolean;
  isLoadingDetail: boolean;
  error: string | null;

  // Actions
  setConversations: (conversations: Conversation[]) => void;
  selectConversation: (conversation: ConversationDetail | null) => void;
  setFilters: (filters: ConversationFilters) => void;
  setPagination: (pagination: ConversationPagination) => void;
  setLoading: (isLoading: boolean) => void;
  setLoadingDetail: (isLoadingDetail: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialFilters: ConversationFilters = {
  search: '',
  sortBy: 'newest',
};

const initialPagination: ConversationPagination = {
  page: 1,
  limit: 20,
  total: 0,
  pages: 0,
};

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  selectedConversation: null,
  filters: initialFilters,
  pagination: initialPagination,
  isLoading: false,
  isLoadingDetail: false,
  error: null,

  setConversations: (conversations) => set({ conversations }),
  selectConversation: (conversation) => set({ selectedConversation: conversation }),
  setFilters: (filters) => set({ filters }),
  setPagination: (pagination) => set({ pagination }),
  setLoading: (isLoading) => set({ isLoading }),
  setLoadingDetail: (isLoadingDetail) => set({ isLoadingDetail }),
  setError: (error) => set({ error }),
  reset: () => set({
    conversations: [],
    selectedConversation: null,
    filters: initialFilters,
    pagination: initialPagination,
    isLoading: false,
    isLoadingDetail: false,
    error: null,
  }),
}));
