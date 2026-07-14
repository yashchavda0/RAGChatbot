import { MessageCircle } from 'lucide-react';
import { ConversationDetail } from '@/types/conversation';
import { MessageThread } from './MessageThread';
import { useEffect, useRef, useState } from 'react';

interface ConversationDetailProps {
  conversation: ConversationDetail | null;
  isLoading: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ConversationDetailComponent({ conversation, isLoading }: ConversationDetailProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [prevSessionId, setPrevSessionId] = useState<string | null>(null);

  // Only auto-scroll when switching to a new conversation
  useEffect(() => {
    if (conversation && conversation.session_id !== prevSessionId) {
      setPrevSessionId(conversation.session_id);
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [conversation?.session_id, prevSessionId]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="p-6 border-b border-[#E5E5EA] bg-white">
          <div className="space-y-4 animate-pulse">
            <div className="h-6 bg-[#E5E5EA] rounded w-1/4" />
            <div className="h-4 bg-[#F5F5F7] rounded w-1/3" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFA]">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-[#F5F5F7] rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-[#D2D2D7] mx-auto mb-4" />
          <p className="text-[#86868B]">Select a conversation to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Thin info bar */}
      <div className="px-4 py-2.5 border-b border-[#E5E5EA] bg-white flex-shrink-0 flex items-center gap-2 text-xs text-[#86868B]">
        <MessageCircle className="w-3.5 h-3.5 text-[#5B5EFF]" />
        <span className="text-[#1D1D1F] font-medium">{conversation.message_count} messages</span>
        <span>·</span>
        <span>{formatDate(conversation.started_at)}</span>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#FAFAFA]">
        <MessageThread messages={conversation.messages} />
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
