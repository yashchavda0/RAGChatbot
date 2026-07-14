'use client';

import { useEffect } from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { conversationApi } from '@/lib/conversationApi';
import { ConversationFiltersComponent } from '@/components/conversations/ConversationFilters';
import { ConversationList } from '@/components/conversations/ConversationList';
import { ConversationDetailComponent } from '@/components/conversations/ConversationDetail';

interface ConversationsPageProps {
  params: { chatbotId: string };
}

export default function ConversationsPage({ params }: ConversationsPageProps) {
  const { chatbotId } = params;

  const {
    conversations,
    selectedConversation,
    filters,
    pagination,
    isLoading,
    isLoadingDetail,
    error,
    setConversations,
    selectConversation,
    setFilters,
    setPagination,
    setLoading,
    setLoadingDetail,
    setError,
  } = useConversationStore();

  // Fetch conversations list
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await conversationApi.listConversations(
          chatbotId,
          filters,
          pagination
        );
        setConversations(response.conversations);
        setPagination({
          page: response.pagination.page,
          limit: response.pagination.limit,
          total: response.pagination.total,
          pages: response.pagination.pages,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [chatbotId, filters, pagination.page, setConversations, setPagination, setLoading, setError]);

  // Fetch selected conversation detail
  useEffect(() => {
    if (!selectedConversation && conversations.length > 0) {
      handleSelectConversation(conversations[0]);
    }
  }, [conversations, selectedConversation]);

  const handleSelectConversation = async (conversation: any) => {
    try {
      setLoadingDetail(true);
      const detail = await conversationApi.getConversation(chatbotId, conversation.session_id);
      selectConversation(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
      selectConversation(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination({
      ...pagination,
      page,
    });
  };

  return (
    <div className="h-[calc(100vh-108px)] flex flex-col space-y-2">
      {/* Title + Filters inline */}
      <div className="flex items-center justify-between gap-4 flex-shrink-0">
        <h1 className="text-lg font-semibold text-[#1D1D1F]">Conversations</h1>
        <ConversationFiltersComponent
          filters={filters}
          onFiltersChange={(newFilters) => {
            setFilters(newFilters);
            setPagination({ ...pagination, page: 1 });
          }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Two-pane Layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Conversation List */}
        <div className="w-1/3 bg-white rounded-xl border border-[#E5E5EA] overflow-hidden">
          <ConversationList
            conversations={conversations}
            selectedSessionId={selectedConversation?.session_id || null}
            onSelect={handleSelectConversation}
            isLoading={isLoading}
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </div>

        {/* Conversation Detail */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-[#E5E5EA] overflow-hidden">
          <ConversationDetailComponent
            conversation={selectedConversation}
            isLoading={isLoadingDetail}
          />
        </div>
      </div>
    </div>
  );
}

