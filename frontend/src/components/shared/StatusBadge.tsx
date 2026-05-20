'use client';

import { cn } from '@/lib/utils';
import { CHATBOT_STATUS } from '@/lib/utils/constants';
import type { ChatbotStatus } from '@/types/chatbot';

interface StatusBadgeProps {
  status: ChatbotStatus;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  size = 'md',
  showDot = true,
  className,
}: StatusBadgeProps) {
  const config = CHATBOT_STATUS[status];

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
