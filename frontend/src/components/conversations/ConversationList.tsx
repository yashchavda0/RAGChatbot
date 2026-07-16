import { MessageSquare, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
      <div className="flex-1 overflow-y-auto">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 border-b border-black/[0.04] animate-pulse">
            <div className="h-4 bg-black/[0.06] rounded w-3/4 mb-2" />
            <div className="h-3 bg-[#F5F5F7] rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#5B5EFF]/10 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-[#5B5EFF]" />
          </div>
          <p className="text-sm font-medium text-[#1D1D1F]">No conversations yet</p>
          <p className="text-xs text-[#6E6E73] mt-1">Conversations will show up here once users start chatting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {conversations.map((conv) => (
          <button
            key={conv.session_id}
            onClick={() => onSelect(conv)}
            className={cn(
              'w-full text-left p-3 rounded-xl transition-colors duration-150',
              selectedSessionId === conv.session_id
                ? 'bg-[#5B5EFF]/10'
                : 'hover:bg-[#F5F5F7]'
            )}
          >
            <p
              className={cn(
                'truncate text-sm',
                selectedSessionId === conv.session_id
                  ? 'font-semibold text-[#5B5EFF]'
                  : 'font-medium text-[#1D1D1F]'
              )}
            >
              {conv.first_message}
            </p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-[#6E6E73]">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {conv.message_count}
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
        <div className="p-3 border-t border-black/[0.06] flex items-center justify-between gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            Prev
          </Button>
          <span className="text-xs text-[#6E6E73]">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
          >
            Next
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
