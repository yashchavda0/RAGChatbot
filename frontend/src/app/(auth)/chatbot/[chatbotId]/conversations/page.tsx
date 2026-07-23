'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
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
    <div className="h-full flex flex-col gap-4 animate-fade-in">
      {/* Page Header */}
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-[#1D1D1F]">Conversation History</h1>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-xl text-[#FF3B30] text-sm flex-shrink-0">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Two-pane Layout */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Conversation List */}
        <GlassCard variant="default" padding="none" className="w-full max-w-sm flex flex-col overflow-hidden min-h-0">
          <div className="p-4 border-b border-black/[0.06] flex-shrink-0">
            <p className="text-xs text-[#6E6E73] mb-3">{pagination.total} conversation{pagination.total !== 1 ? 's' : ''}</p>
            <ConversationFiltersComponent
              filters={filters}
              onFiltersChange={(newFilters) => {
                setFilters(newFilters);
                setPagination({ ...pagination, page: 1 });
              }}
            />
          </div>
          <ConversationList
            conversations={conversations}
            selectedSessionId={selectedConversation?.session_id || null}
            onSelect={handleSelectConversation}
            isLoading={isLoading}
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </GlassCard>

        {/* Conversation Detail */}
        <GlassCard variant="default" padding="none" className="flex-1 flex flex-col overflow-hidden min-h-0">
          <ConversationDetailComponent
            conversation={selectedConversation}
            isLoading={isLoadingDetail}
          />
        </GlassCard>
      </div>
    </div>
  );
}

