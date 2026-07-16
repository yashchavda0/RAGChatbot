import { MessageCircle } from 'lucide-react';
import { ScrollArea } from '@ragchatbot/shared-ui';
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
        <div className="px-4 py-3 border-b border-black/[0.06] bg-[#F5F5F7]/50">
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-black/[0.06]" />
            <div className="space-y-2">
              <div className="h-3.5 bg-black/[0.06] rounded w-32" />
              <div className="h-3 bg-black/[0.04] rounded w-24" />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-[#F5F5F7]/30">
          <div className="space-y-3 max-w-3xl mx-auto">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-white rounded-2xl" />
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
          <div className="w-16 h-16 rounded-full bg-[#5B5EFF]/10 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-7 h-7 text-[#5B5EFF]" />
          </div>
          <p className="text-sm font-medium text-[#1D1D1F]">Select a conversation</p>
          <p className="text-xs text-[#6E6E73] mt-1">Choose a conversation from the list to view its messages.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.06] bg-[#F5F5F7]/50 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-[#5B5EFF]/10 flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-[#5B5EFF]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#1D1D1F]">Conversation</h2>
          <p className="text-xs text-[#6E6E73]">
            {conversation.message_count} messages · {formatDate(conversation.started_at)}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 bg-[#F5F5F7]/30">
        <ScrollArea className="h-full w-full scrollbar-thin">
          <MessageThread messages={conversation.messages} />
          <div ref={messagesEndRef} />
        </ScrollArea>
      </div>
    </div>
  );
}
