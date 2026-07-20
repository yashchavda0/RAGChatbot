'use client';

import { cn } from '@/lib/utils';
import type { ChatbotTrend } from '@/lib/utils/trend';

interface TrendBadgeProps {
  trend: ChatbotTrend;
  className?: string;
}

const TREND_CONFIG: Record<Exclude<ChatbotTrend['direction'], 'none'>, { color: string; bg: string }> = {
  up: { color: '#34C759', bg: 'rgba(52,199,89,0.15)' },
  down: { color: '#FF3B30', bg: 'rgba(255,59,48,0.12)' },
  new: { color: '#5B5EFF', bg: 'rgba(91,94,255,0.12)' },
};

export function TrendBadge({ trend, className }: TrendBadgeProps) {
  if (trend.direction === 'none') return null;

  const { color, bg } = TREND_CONFIG[trend.direction];
  const label =
    trend.direction === 'new'
      ? 'New'
      : `${trend.direction === 'up' ? '▲' : '▼'} ${trend.percent}%`;

  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold', className)}
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  );
}
