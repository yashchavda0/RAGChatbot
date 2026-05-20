'use client';

import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/shared/GlassCard';
import { formatCompactNumber, formatPercentage } from '@/lib/utils/formatters';

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  format?: 'number' | 'percentage' | 'time' | 'raw';
  invertChange?: boolean; // For metrics where negative change is good
  className?: string;
  isLoading?: boolean;
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  icon,
  format = 'number',
  invertChange = false,
  className,
  isLoading = false,
}: MetricCardProps) {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    switch (format) {
      case 'number':
        return formatCompactNumber(val);
      case 'percentage':
        return `${val}%`;
      case 'time':
        return val < 1000 ? `${Math.round(val)}ms` : `${(val / 1000).toFixed(1)}s`;
      default:
        return val.toString();
    }
  };

  const getChangeColor = (changeVal: number): string => {
    const isPositive = invertChange ? changeVal < 0 : changeVal > 0;
    return isPositive ? 'text-[#34C759]' : changeVal < 0 ? 'text-[#FF3B30]' : 'text-[#86868B]';
  };

  const getChangeIcon = (changeVal: number): string => {
    if (changeVal > 0) return '\u2191'; // up arrow
    if (changeVal < 0) return '\u2193'; // down arrow
    return '\u2192'; // right arrow (no change)
  };

  if (isLoading) {
    return (
      <GlassCard className={cn('animate-pulse', className)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 w-24 rounded bg-gray-200/50" />
            <div className="mt-3 h-8 w-20 rounded bg-gray-200/50" />
          </div>
          <div className="h-10 w-10 rounded-xl bg-gray-200/50" />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard hover className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#86868B] truncate">{title}</p>
          <p className="mt-2 text-3xl font-bold text-[#1D1D1F] tracking-tight">
            {formatValue(value)}
          </p>
          {change !== undefined && (
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex items-center text-sm font-medium',
                  getChangeColor(change)
                )}
              >
                <span className="mr-0.5">{getChangeIcon(change)}</span>
                {formatPercentage(Math.abs(change))}
              </span>
              <span className="text-xs text-[#86868B]">{changeLabel}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#5B5EFF]/10 to-[#5B5EFF]/5 text-[#5B5EFF]">
              {icon}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
