import { MessageSquare, Clock } from 'lucide-react';
import { Conversation, ConversationPagination } from '@/types/conversation';

interface ConversationListProps {
  conversations: Conversation[];
  selectedSessionId: string | null;
  onSelect: (conversation: Conversation) => void;
  isLoading: boolean;
  pagination: ConversationPagination;
  onPageChange: (page: number) => void;
}

function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ConversationList({
  conversations,
  selectedSessionId,
  onSelect,
  isLoading,
  pagination,
  onPageChange,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="h-full border-r border-[#E5E5EA] overflow-y-auto">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 border-b border-[#F5F5F7] animate-pulse">
            <div className="h-4 bg-[#E5E5EA] rounded w-3/4 mb-2" />
            <div className="h-3 bg-[#F5F5F7] rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="h-full border-r border-[#E5E5EA] flex items-center justify-center p-4">
        <div className="text-center">
          <MessageSquare className="w-8 h-8 text-[#D2D2D7] mx-auto mb-2" />
          <p className="text-sm text-[#86868B]">No conversations yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full border-r border-[#E5E5EA] flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <button
            key={conv.session_id}
            onClick={() => onSelect(conv)}
            className={`w-full text-left p-4 border-b border-[#F5F5F7] transition hover:bg-[#F5F5F7] ${
              selectedSessionId === conv.session_id ? 'bg-[#5B5EFF]/10 border-l-2 border-l-[#5B5EFF]' : ''
            }`}
          >
            <p className="font-medium text-[#1D1D1F] truncate text-sm">{conv.first_message}</p>
            <div className="flex gap-2 mt-2 text-xs text-[#86868B]">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {conv.message_count} messages
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(conv.started_at))}
              </span>
            </div>
          </button>
        ))}
      </div>

      {pagination.pages > 1 && (
        <div className="p-4 border-t border-[#E5E5EA] flex gap-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="flex-1 px-3 py-2 rounded-lg border border-[#E5E5EA] text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <span className="px-3 py-2 text-sm text-[#86868B]">
            {pagination.page} / {pagination.pages}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="flex-1 px-3 py-2 rounded-lg border border-[#E5E5EA] text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
