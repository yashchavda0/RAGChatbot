'use client';

import React from 'react';
import { Mail, Globe, Key, Star, MessageSquare, Flag, CheckCircle, Clock } from 'lucide-react';
import { Conversation } from '@/types/conversation';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  isLoading?: boolean;
}

// Format relative time
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

// User Identifier Icon
const UserIdentifierIcon = ({ type }: { type: 'email' | 'ip' | 'session' }) => {
  switch (type) {
    case 'email':
      return <Mail className="w-3.5 h-3.5" />;
    case 'ip':
      return <Globe className="w-3.5 h-3.5" />;
    case 'session':
      return <Key className="w-3.5 h-3.5" />;
    default:
      return <Mail className="w-3.5 h-3.5" />;
  }
};

// Status Badge Component
const StatusBadge = ({ status }: { status: Conversation['status'] }) => {
  const statusConfig = {
    resolved: {
      icon: CheckCircle,
      bg: 'bg-[#34C759]/10',
      text: 'text-[#34C759]',
      label: 'Resolved',
    },
    unresolved: {
      icon: Clock,
      bg: 'bg-[#FF9500]/10',
      text: 'text-[#FF9500]',
      label: 'Unresolved',
    },
    flagged: {
      icon: Flag,
      bg: 'bg-[#FF3B30]/10',
      text: 'text-[#FF3B30]',
      label: 'Flagged',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
        config.bg,
        config.text
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

// Rating Stars Component
const RatingStars = ({ rating }: { rating?: number }) => {
  if (!rating) return null;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'w-3 h-3',
            star <= rating ? 'text-[#FF9500] fill-[#FF9500]' : 'text-[#E5E5EA]'
          )}
        />
      ))}
    </div>
  );
};

// Loading Skeleton
const ConversationSkeleton = () => (
  <div className="p-4 border-b border-black/[0.04] animate-pulse">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-[#F5F5F7]" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 w-32 bg-[#F5F5F7] rounded" />
          <div className="h-3 w-12 bg-[#F5F5F7] rounded" />
        </div>
        <div className="h-3 w-full bg-[#F5F5F7] rounded mb-2" />
        <div className="flex items-center gap-2">
          <div className="h-5 w-16 bg-[#F5F5F7] rounded-full" />
          <div className="h-3 w-8 bg-[#F5F5F7] rounded" />
        </div>
      </div>
    </div>
  </div>
);

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading = false,
}: ConversationListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="divide-y divide-black/[0.04]">
        {Array.from({ length: 8 }).map((_, i) => (
          <ConversationSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#F5F5F7] flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-[#6E6E73]" />
          </div>
          <h3 className="text-base font-medium text-[#1D1D1F] mb-1">No conversations found</h3>
          <p className="text-sm text-[#6E6E73]">Try adjusting your filters or search query</p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-black/[0.04]">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          onClick={() => onSelect(conversation)}
          className={cn(
            'w-full p-4 text-left transition-all duration-200 hover:bg-[#5B5EFF]/[0.03]',
            selectedId === conversation.id && 'bg-[#5B5EFF]/[0.05] border-l-2 border-l-[#5B5EFF]'
          )}
        >
          <div className="flex items-start gap-3">
            {/* User Avatar */}
            <div
              className={cn(
                'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm',
                conversation.user.type === 'email'
                  ? 'bg-[#5B5EFF]'
                  : conversation.user.type === 'ip'
                  ? 'bg-[#34C759]'
                  : 'bg-[#FF9500]'
              )}
            >
              {conversation.user.identifier.charAt(0).toUpperCase()}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header Row */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[#6E6E73]">
                    <UserIdentifierIcon type={conversation.user.type} />
                  </span>
                  <span className="text-sm font-medium text-[#1D1D1F] truncate">
                    {conversation.user.identifier}
                  </span>
                </div>
                <span className="flex-shrink-0 text-xs text-[#6E6E73]">
                  {formatRelativeTime(conversation.startedAt)}
                </span>
              </div>

              {/* Preview */}
              <p className="text-sm text-[#6E6E73] truncate mb-2 line-clamp-2">
                {conversation.preview}
              </p>

              {/* Footer Row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={conversation.status} />
                  {conversation.rating && <RatingStars rating={conversation.rating} />}
                </div>
                <div className="flex items-center gap-1 text-xs text-[#6E6E73]">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {conversation.messageCount}
                </div>
              </div>

              {/* Tags */}
              {conversation.tags.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {conversation.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#F5F5F7] text-[#6E6E73]"
                    >
                      {tag}
                    </span>
                  ))}
                  {conversation.tags.length > 3 && (
                    <span className="text-[11px] text-[#6E6E73]">
                      +{conversation.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
