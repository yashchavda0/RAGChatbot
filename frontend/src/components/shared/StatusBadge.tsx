'use client';

import { cn } from '@/lib/utils';
import type { ChatbotStatus } from '@/types/chatbot';
import type { Conversation } from '@/types/conversation';

interface StatusBadgeProps {
  status: ChatbotStatus | Conversation['status'] | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  live: { label: 'Live', color: '#30D158' },
  draft: { label: 'Draft', color: '#0A84FF' },
  inactive: { label: 'Inactive', color: '#8E8E93' },
  resolved: { label: 'Resolved', color: '#34C759' },
  unresolved: { label: 'Unresolved', color: '#FF9F0A' },
  flagged: { label: 'Flagged', color: '#FF3B30' },
  active: { label: 'Active', color: '#30D158' },
  training: { label: 'Training', color: '#FF9F0A' },
  error: { label: 'Error', color: '#FF3B30' },
};

export function StatusBadge({
  status,
  size = 'md',
  showDot = true,
  className,
}: StatusBadgeProps) {
  const normalizedStatus = String(status).toLowerCase();
  const config =
    STATUS_CONFIG[normalizedStatus] || {
      label: normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1),
      color: '#8E8E93',
    };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        sizes[size],
        className
      )}
      style={{
        backgroundColor: `${config.color}15`,
        color: config.color,
      }}
    >
      {showDot && (
        <span
          className={cn('rounded-full', dotSizes[size])}
          style={{ backgroundColor: config.color }}
        />
      )}
      {config.label}
    </span>
  );
}
