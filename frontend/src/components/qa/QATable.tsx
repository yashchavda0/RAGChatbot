'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface QAPair {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface QATableProps {
  qaPairs: QAPair[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
}

const categoryColors: Record<string, string> = {
  'General': 'bg-[#5B5EFF]/10 text-[#5B5EFF]',
  'Product': 'bg-[#34C759]/10 text-[#34C759]',
  'Support': 'bg-[#FF9500]/10 text-[#FF9500]',
  'Billing': 'bg-[#FF3B30]/10 text-[#FF3B30]',
  'Technical': 'bg-[#007AFF]/10 text-[#007AFF]',
  'Sales': 'bg-[#AF52DE]/10 text-[#AF52DE]',
};

export function QATable({ qaPairs, isLoading, onEdit, onDelete, onToggleStatus }: QATableProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl bg-white/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (qaPairs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#5B5EFF]/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-[#5B5EFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-[15px] font-medium text-[#1D1D1F] mb-1">No Q&A pairs yet</h3>
        <p className="text-[13px] text-[#6E6E73]">Add your first question-answer pair to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {qaPairs.map((qa) => {
        const isHovered = hoveredId === qa.id;
        const categoryStyle = categoryColors[qa.category] || 'bg-[#6E6E73]/10 text-[#6E6E73]';

        return (
          <div
            key={qa.id}
            className={cn(
              'group flex items-start gap-4 p-4 rounded-xl transition-all duration-200',
              'bg-white border border-black/[0.04]',
              'hover:border-[#5B5EFF]/20 hover:shadow-[0_4px_12px_rgba(91,94,255,0.08)]'
            )}
            onMouseEnter={() => setHoveredId(qa.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Question & Answer */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#5B5EFF]/10 flex items-center justify-center mt-0.5">
                  <span className="text-[11px] font-semibold text-[#5B5EFF]">Q</span>
                </div>
                <p className="text-[14px] font-medium text-[#1D1D1F] line-clamp-2">
                  {qa.question}
                </p>
              </div>
              <div className="flex items-start gap-3 mt-2">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#34C759]/10 flex items-center justify-center mt-0.5">
                  <span className="text-[11px] font-semibold text-[#34C759]">A</span>
                </div>
                <p className="text-[13px] text-[#6E6E73] line-clamp-2">
                  {qa.answer}
                </p>
              </div>
              {/* Meta Info */}
              <div className="flex items-center gap-3 mt-3 ml-9">
                <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium', categoryStyle)}>
                  {qa.category}
                </span>
                {qa.tags.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-full text-[11px] bg-[#F5F5F7] text-[#6E6E73]"
                  >
                    {tag}
                  </span>
                ))}
                {qa.tags.length > 3 && (
                  <span className="text-[11px] text-[#6E6E73]">+{qa.tags.length - 3} more</span>
                )}
              </div>
            </div>

            {/* Status Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onToggleStatus?.(qa.id)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
                  qa.status === 'active' ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                    qa.status === 'active' ? 'translate-x-5' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>

            {/* Actions */}
            <div className={cn(
              'flex items-center gap-2 transition-opacity duration-200',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}>
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(qa.id)}
                  className="h-8 px-3 text-[12px]"
                >
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(qa.id)}
                  className="h-8 px-3 text-[12px] text-[#FF3B30] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10"
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
