import type { ChatMessage, Source } from '@ragchatbot/shared-types';
import type { ConversationMessage, ConversationSource } from '@/types/conversation';

function mapSource(source: ConversationSource): Source {
  const isWeb = source.type === 'web';

  return {
    type: (source.type as Source['type']) || 'document',
    filename: source.filename,
    document_name: source.filename,
    document_id: source.document_id,
    similarity_score: source.relevance_score ?? source.score,
    content_preview: source.content,
    url: isWeb ? source.source : undefined,
    title: isWeb ? source.source : undefined,
  };
}

function deriveAnswerSource(sources: Source[]): ChatMessage['answer_source'] {
  if (sources.some((s) => s.type === 'web')) return 'web';
  if (sources.some((s) => s.type === 'document')) return 'documents';
  return undefined;
}

function deriveRetrievalConfidence(sources: Source[]): number | undefined {
  const scores = sources
    .filter((s) => s.type === 'document' && typeof s.similarity_score === 'number')
    .map((s) => s.similarity_score as number);

  return scores.length > 0 ? Math.max(...scores) : undefined;
}

export function mapConversationMessage(message: ConversationMessage): ChatMessage {
  const sources = (message.sources || []).map(mapSource);

  return {
    id: message.message_id,
    role: message.role,
    content: message.content,
    timestamp: new Date(message.timestamp),
    sources,
    answer_source: deriveAnswerSource(sources),
    retrieval_confidence: deriveRetrievalConfidence(sources),
  };
}
