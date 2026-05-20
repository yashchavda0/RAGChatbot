'use client';

import { use, useState, useMemo, useCallback } from 'react';
import {
  ConversationList,
  ConversationDetail,
  ConversationFilters,
} from '@/components/conversations';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Conversation, ConversationFilters as Filters } from '@/types/conversation';
import { cn } from '@/lib/utils';
import {
  mockConversations,
  filterConversations,
  sortConversations,
  paginateConversations,
} from '@/lib/mock-conversations';

interface ConversationsPageProps {
  params: Promise<{ chatbotId: string }>;
}

const ITEMS_PER_PAGE = 20;

export default function ConversationsPage({ params }: ConversationsPageProps) {
  const { chatbotId } = use(params);

  // State
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    dateRange: { start: undefined, end: undefined },
    sortBy: 'newest',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);

  // Filtered and sorted conversations
  const filteredConversations = useMemo(() => {
    const filtered = filterConversations(conversations, {
      search: filters.search,
      status: filters.status,
      dateStart: filters.dateRange.start,
      dateEnd: filters.dateRange.end,
    });
    return sortConversations(filtered, filters.sortBy);
  }, [conversations, filters]);

  // Paginated conversations
  const { conversations: paginatedConversations, pagination } = useMemo(() => {
    return paginateConversations(filteredConversations, currentPage, ITEMS_PER_PAGE);
  }, [filteredConversations, currentPage]);

  // Handlers
  const handleFiltersChange = useCallback((newFilters: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
  }, []);

  const handleUpdateStatus = useCallback(
    (id: string, status: Conversation['status']) => {
      setConversations((prev) =>
        prev.map((conv) => (conv.id === id ? { ...conv, status } : conv))
      );
      // Update selected conversation if it's the one being updated
      setSelectedConversation((prev) =>
        prev?.id === id ? { ...prev, status } : prev
      );
    },
    []
  );

  const handleDelete = useCallback((id: string) => {
    setConversations((prev) => prev.filter((conv) => conv.id !== id));
    // Clear selection if deleted conversation was selected
    setSelectedConversation((prev) => (prev?.id === id ? null : prev));
  }, []);

  const handleExport = useCallback((conversation: Conversation) => {
    // Create export data
    const exportData = {
      id: conversation.id,
      user: conversation.user,
      status: conversation.status,
      rating: conversation.rating,
      feedback: conversation.feedback,
      tags: conversation.tags,
      notes: conversation.notes,
      startedAt: conversation.startedAt,
      endedAt: conversation.endedAt,
      messageCount: conversation.messageCount,
      messages: conversation.messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    };

    // Create and download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conversation.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleUpdateNotes = useCallback((id: string, notes: string) => {
    setConversations((prev) =>
      prev.map((conv) => (conv.id === id ? { ...conv, notes } : conv))
    );
    // Update selected conversation
    setSelectedConversation((prev) =>
      prev?.id === id ? { ...prev, notes } : prev
    );
  }, []);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
      {/* Page Header */}
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-[#1D1D1F]">Conversations</h1>
        <p className="text-[#86868B] mt-1">
          Review and manage all chatbot conversations
        </p>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0">
        <ConversationFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          totalResults={filteredConversations.length}
        />
      </div>

      {/* Main Content - Master-Detail Layout */}
      <div className="flex-1 min-h-0 flex gap-4">
        {/* Left Panel - Conversation List */}
        <div
          className={cn(
            'flex-shrink-0 transition-all duration-300 ease-out',
            'w-full',
            selectedConversation ? 'hidden md:flex md:w-[380px] lg:w-[420px]' : 'flex'
          )}
        >
          <div className="w-full bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-apple overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <ConversationList
                conversations={paginatedConversations}
                selectedId={selectedConversation?.id || null}
                onSelect={handleSelectConversation}
                isLoading={isLoading}
              />
            </ScrollArea>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex-shrink-0 p-3 border-t border-black/[0.04] bg-white/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6E6E73]">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={cn(
                        'px-2.5 py-1 text-xs font-medium rounded-lg transition-colors',
                        currentPage === 1
                          ? 'text-[#6E6E73]/40 cursor-not-allowed'
                          : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                      )}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={currentPage === pagination.totalPages}
                      className={cn(
                        'px-2.5 py-1 text-xs font-medium rounded-lg transition-colors',
                        currentPage === pagination.totalPages
                          ? 'text-[#6E6E73]/40 cursor-not-allowed'
                          : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                      )}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Conversation Detail */}
        <div
          className={cn(
            'flex-1 min-w-0 transition-all duration-300 ease-out',
            selectedConversation ? 'flex' : 'hidden md:flex'
          )}
        >
          <div className="w-full bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-apple overflow-hidden">
            <ConversationDetail
              conversation={selectedConversation}
              onUpdateStatus={handleUpdateStatus}
              onDelete={handleDelete}
              onExport={handleExport}
              onUpdateNotes={handleUpdateNotes}
            />
          </div>
        </div>

        {/* Mobile Back Button (when conversation is selected) */}
        {selectedConversation && (
          <button
            onClick={() => setSelectedConversation(null)}
            className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-[#5B5EFF] text-white text-sm font-medium rounded-full shadow-apple-lg flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to List
          </button>
        )}
      </div>
    </div>
  );
}
