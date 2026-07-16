import { MessageBubble } from '@ragchatbot/shared-ui';
import { ConversationMessage } from '@/types/conversation';
import { mapConversationMessage } from './mapConversationMessage';

interface MessageThreadProps {
  messages: ConversationMessage[];
}

export function MessageThread({ messages }: MessageThreadProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {messages.map((msg) => (
        <MessageBubble key={msg.message_id} message={mapConversationMessage(msg)} showSources alwaysShowTimestamp />
      ))}
    </div>
  );
}
