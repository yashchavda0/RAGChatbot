'use client';

import { useMemo } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { formatNumber, formatPercentage } from '@/lib/utils/formatters';
import type { SatisfactionData } from '@/types/analytics';

interface SatisfactionChartProps {
  data: SatisfactionData;
  isLoading?: boolean;
}

export function SatisfactionChart({ data, isLoading = false }: SatisfactionChartProps) {
  const chartData = useMemo(() => {
    const total = data.excellent + data.good + data.neutral + data.poor;
    if (total === 0) return { segments: [], total: 0 };

    const segments = [
      {
        label: 'Excellent',
        value: data.excellent,
        percentage: (data.excellent / total) * 100,
        color: '#34C759',
      },
      {
        label: 'Good',
        value: data.good,
        percentage: (data.good / total) * 100,
        color: '#4ECDC4',
      },
      {
        label: 'Neutral',
        value: data.neutral,
        percentage: (data.neutral / total) * 100,
        color: '#FF9500',
      },
      {
        label: 'Poor',
        value: data.poor,
        percentage: (data.poor / total) * 100,
        color: '#FF3B30',
      },
    ];

    return { segments, total };
  }, [data]);

  if (isLoading) {
    return (
      <GlassCard className="animate-pulse">
        <div className="h-6 w-40 rounded bg-gray-200/50 mb-6" />
        <div className="flex items-center gap-8">
          <div className="w-32 h-32 rounded-full bg-gray-200/50" />
          <div className="flex-1 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 w-full rounded bg-gray-200/50" />
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  const radius = 80;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;
  const segmentsWithOffset = chartData.segments.map((segment) => {
    const offset = cumulativeOffset;
    cumulativeOffset += segment.percentage;
    return { ...segment, offset };
  });

  return (
    <GlassCard>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[#1D1D1F]">User Satisfaction</h3>
        <p className="text-sm text-[#86868B]">Feedback breakdown by sentiment</p>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Donut Chart */}
        <div className="relative w-48 h-48 flex-shrink-0">
          <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#E5E5EA"
              strokeWidth="24"
            />
            {/* Segments */}
            {segmentsWithOffset.map((segment, index) => (
              <circle
                key={index}
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="24"
                strokeLinecap="round"
                strokeDasharray={`${(segment.percentage / 100) * circumference} ${circumference}`}
                strokeDashoffset={-(segment.offset / 100) * circumference}
                className="transition-all duration-500"
              />
            ))}
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-[#1D1D1F]">
              {formatNumber(chartData.total)}
            </span>
            <span className="text-sm text-[#86868B]">responses</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-3">
          {chartData.segments.map((segment) => (
            <div key={segment.label} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: segment.color }}
              />
              <div className="flex-1 flex items-center justify-between">
                <span className="text-sm font-medium text-[#1D1D1F]">{segment.label}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-[#86868B]">{formatNumber(segment.value)}</span>
                  <span className="text-sm font-medium text-[#1D1D1F] w-14 text-right">
                    {formatPercentage(segment.percentage)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Overall satisfaction score */}
          <div className="mt-4 pt-4 border-t border-[#E5E5EA]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#1D1D1F]">Positive Rate</span>
              <span className="text-lg font-bold text-[#34C759]">
                {formatPercentage(
                  chartData.segments.length > 0
                    ? chartData.segments[0].percentage + chartData.segments[1].percentage
                    : 0
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
