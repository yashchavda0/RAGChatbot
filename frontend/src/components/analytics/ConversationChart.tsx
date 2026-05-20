'use client';

import { useMemo } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { formatChartDate } from '@/lib/utils/formatters';
import type { ConversationTrend } from '@/types/analytics';

interface ConversationChartProps {
  data: ConversationTrend[];
  isLoading?: boolean;
  height?: number;
}

export function ConversationChart({
  data,
  isLoading = false,
  height = 320,
}: ConversationChartProps) {
  // Process data for chart rendering
  const chartData = useMemo(() => {
    if (!data.length) return { points: [], maxConversations: 0, maxMessages: 0, maxValue: 0 };

    const maxConversations = Math.max(...data.map((d) => d.conversations));
    const maxMessages = Math.max(...data.map((d) => d.messages));
    const maxValue = Math.max(maxConversations, maxMessages);

    return {
      points: data.map((d, i) => ({
        x: i,
        date: formatChartDate(d.date),
        conversations: d.conversations,
        messages: d.messages,
        conversationsY: (d.conversations / maxValue) * 100,
        messagesY: (d.messages / maxValue) * 100,
      })),
      maxConversations,
      maxMessages,
      maxValue,
    };
  }, [data]);

  // Generate Y-axis labels
  const yAxisLabels = useMemo(() => {
    const step = Math.ceil(chartData.maxValue / 4 / 10) * 10;
    return [0, step, step * 2, step * 3, step * 4];
  }, [chartData.maxValue]);

  if (isLoading) {
    return (
      <GlassCard className="animate-pulse">
        <div className="h-6 w-40 rounded bg-gray-200/50 mb-4" />
        <div style={{ height }} className="w-full bg-gray-200/30 rounded-lg" />
      </GlassCard>
    );
  }

  const chartWidth = 100;
  const chartHeight = 80; // Percentage of container
  const paddingX = 5;
  const paddingY = 10;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[#1D1D1F]">Conversation Trends</h3>
          <p className="text-sm text-[#86868B]">Messages and conversations over time</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#5B5EFF]" />
            <span className="text-sm text-[#86868B]">Conversations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#4ECDC4]" />
            <span className="text-sm text-[#86868B]">Messages</span>
          </div>
        </div>
      </div>

      <div className="relative" style={{ height }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-[#86868B]">
          {yAxisLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        {/* Chart area */}
        <div className="ml-14 h-full relative">
          {/* Grid lines */}
          <div className="absolute inset-0 bottom-8">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="absolute w-full border-t border-[#E5E5EA]/50"
                style={{ top: `${i * 25}%` }}
              />
            ))}
          </div>

          {/* SVG Chart */}
          <svg
            className="absolute inset-0 bottom-8 overflow-visible"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
          >
            {/* Conversations area */}
            <defs>
              <linearGradient id="conversationsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5B5EFF" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#5B5EFF" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="messagesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ECDC4" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#4ECDC4" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Conversations path */}
            {chartData.points.length > 1 && (
              <>
                <path
                  d={`
                    M ${paddingX} ${chartHeight - paddingY - (chartData.points[0].conversationsY / 100) * (chartHeight - 2 * paddingY)}
                    ${chartData.points
                      .map(
                        (p, i) =>
                          `L ${paddingX + (i / (chartData.points.length - 1)) * (chartWidth - 2 * paddingX)} ${chartHeight - paddingY - (p.conversationsY / 100) * (chartHeight - 2 * paddingY)}`
                      )
                      .join(' ')}
                    L ${chartWidth - paddingX} ${chartHeight - paddingY}
                    L ${paddingX} ${chartHeight - paddingY}
                    Z
                  `}
                  fill="url(#conversationsGradient)"
                />
                <path
                  d={`
                    M ${paddingX} ${chartHeight - paddingY - (chartData.points[0].conversationsY / 100) * (chartHeight - 2 * paddingY)}
                    ${chartData.points
                      .map(
                        (p, i) =>
                          `L ${paddingX + (i / (chartData.points.length - 1)) * (chartWidth - 2 * paddingX)} ${chartHeight - paddingY - (p.conversationsY / 100) * (chartHeight - 2 * paddingY)}`
                      )
                      .join(' ')}
                  `}
                  fill="none"
                  stroke="#5B5EFF"
                  strokeWidth="0.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Messages path */}
            {chartData.points.length > 1 && (
              <>
                <path
                  d={`
                    M ${paddingX} ${chartHeight - paddingY - (chartData.points[0].messagesY / 100) * (chartHeight - 2 * paddingY)}
                    ${chartData.points
                      .map(
                        (p, i) =>
                          `L ${paddingX + (i / (chartData.points.length - 1)) * (chartWidth - 2 * paddingX)} ${chartHeight - paddingY - (p.messagesY / 100) * (chartHeight - 2 * paddingY)}`
                      )
                      .join(' ')}
                    L ${chartWidth - paddingX} ${chartHeight - paddingY}
                    L ${paddingX} ${chartHeight - paddingY}
                    Z
                  `}
                  fill="url(#messagesGradient)"
                />
                <path
                  d={`
                    M ${paddingX} ${chartHeight - paddingY - (chartData.points[0].messagesY / 100) * (chartHeight - 2 * paddingY)}
                    ${chartData.points
                      .map(
                        (p, i) =>
                          `L ${paddingX + (i / (chartData.points.length - 1)) * (chartWidth - 2 * paddingX)} ${chartHeight - paddingY - (p.messagesY / 100) * (chartHeight - 2 * paddingY)}`
                      )
                      .join(' ')}
                  `}
                  fill="none"
                  stroke="#4ECDC4"
                  strokeWidth="0.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Data points */}
            {chartData.points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={paddingX + (i / (chartData.points.length - 1)) * (chartWidth - 2 * paddingX)}
                  cy={chartHeight - paddingY - (p.conversationsY / 100) * (chartHeight - 2 * paddingY)}
                  r="1"
                  fill="#5B5EFF"
                  className="hover:r-1.5 transition-all"
                />
                <circle
                  cx={paddingX + (i / (chartData.points.length - 1)) * (chartWidth - 2 * paddingX)}
                  cy={chartHeight - paddingY - (p.messagesY / 100) * (chartHeight - 2 * paddingY)}
                  r="1"
                  fill="#4ECDC4"
                  className="hover:r-1.5 transition-all"
                />
              </g>
            ))}
          </svg>

          {/* X-axis labels */}
          <div className="absolute bottom-0 left-0 right-0 h-8 flex justify-between items-center text-xs text-[#86868B]">
            {chartData.points
              .filter((_, i) => i % Math.ceil(chartData.points.length / 7) === 0)
              .map((p, i) => (
                <span key={i} className="truncate">
                  {p.date}
                </span>
              ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
