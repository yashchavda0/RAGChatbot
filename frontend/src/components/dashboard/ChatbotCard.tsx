'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatRelativeTime, formatNumber } from '@/lib/utils/formatters';
import type { ChatbotListItem } from '@/types/chatbot';

interface ChatbotCardProps {
  chatbot: ChatbotListItem;
  onDelete?: (id: string) => void;
}

export function ChatbotCard({ chatbot, onDelete }: ChatbotCardProps) {
  return (
    <Link href={`/chatbot/${chatbot.id}/analytics`}>
      <GlassCard hover className="group h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5B5EFF] to-[#8B7FFF] flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[#1D1D1F] group-hover:text-[#5B5EFF] transition-colors">
                {chatbot.name}
              </h3>
              <p className="text-sm text-[#86868B] line-clamp-1">{chatbot.description}</p>
            </div>
          </div>
          <StatusBadge status={chatbot.status} size="sm" />
        </div>

        <div className="flex items-center gap-6 pt-4 border-t border-[#E5E5EA]/50">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#86868B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="text-sm text-[#86868B]">
              <span className="font-medium text-[#1D1D1F]">{formatNumber(chatbot.conversationCount)}</span> conversations
            </span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#86868B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-[#86868B]">
              {chatbot.lastActiveAt ? `Active ${formatRelativeTime(chatbot.lastActiveAt)}` : 'Never active'}
            </span>
          </div>
        </div>

        {/* Hover overlay with quick actions */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#5B5EFF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Arrow indicator */}
        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-[#5B5EFF] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
