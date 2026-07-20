'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ChatbotAvatar } from '@/components/shared/ChatbotAvatar';
import { TrendBadge } from '@/components/shared/TrendBadge';
import { ChatbotCardMenu } from '@/components/dashboard/ChatbotCardMenu';
import { formatRelativeTime, formatNumber } from '@/lib/utils/formatters';
import type { ChatbotListItem } from '@/types/chatbot';

interface ChatbotCardProps {
  chatbot: ChatbotListItem;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onToggleActive?: (chatbot: ChatbotListItem) => void;
}

export function ChatbotCard({ chatbot, onDelete, onDuplicate, onToggleActive }: ChatbotCardProps) {
  const router = useRouter();
  const href = `/chatbot/${chatbot.id}/analytics`;
  const isLive = chatbot.status === 'live';

  return (
    <Link href={href}>
      <GlassCard hover className="group h-full relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <ChatbotAvatar id={chatbot.id} icon={chatbot.icon} isLive={isLive} />
            <div>
              <h3 className="font-semibold text-[#1D1D1F] group-hover:text-[#5B5EFF] transition-colors">
                {chatbot.name}
              </h3>
              <p className="text-sm text-[#86868B] line-clamp-1">{chatbot.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={chatbot.status} size="sm" />
            <ChatbotCardMenu
              isLive={isLive}
              onOpen={() => router.push(href)}
              onDuplicate={() => onDuplicate?.(chatbot.id)}
              onToggleActive={() => onToggleActive?.(chatbot)}
              onDelete={() => onDelete?.(chatbot.id)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-4 border-t border-[#E5E5EA]/50">
          <span className="text-sm text-[#86868B]">
            <span className="font-medium text-[#1D1D1F]">{formatNumber(chatbot.conversationCount)}</span>{' '}
            conversations &middot;{' '}
            {chatbot.lastActiveAt ? `active ${formatRelativeTime(chatbot.lastActiveAt)}` : 'never active'}
          </span>
          <TrendBadge trend={chatbot.trend} />
        </div>
      </GlassCard>
    </Link>
  );
}
