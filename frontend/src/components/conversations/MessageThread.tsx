import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ConversationMessage } from '@/types/conversation';

interface MessageThreadProps {
  messages: ConversationMessage[];
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function SourceList({ sources }: { sources: ConversationMessage['sources'] }) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <span>{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
      </button>
      {expanded && (
        <div className="mt-1 space-y-1">
          {sources.map((source, idx) => (
            <div key={idx} className="text-xs opacity-80">
              <p className="truncate">{source.filename || source.source || 'Document'}</p>
              {source.relevance_score && (
                <p className="text-xs opacity-60">
                  Score: {(source.relevance_score * 100).toFixed(0)}%
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MessageThread({ messages }: MessageThreadProps) {
  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <div key={msg.message_id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-lg ${
              msg.role === 'user'
                ? 'bg-[#5B5EFF] text-white rounded-br-none'
                : 'bg-[#F5F5F7] text-[#1D1D1F] rounded-bl-none'
            }`}
          >
            <p className="text-sm break-words">{msg.content}</p>
            <div className="text-xs mt-1 opacity-70">
              {formatTime(msg.timestamp)}
            </div>

            {msg.sources && msg.sources.length > 0 && msg.role === 'assistant' && (
              <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                <SourceList sources={msg.sources} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
