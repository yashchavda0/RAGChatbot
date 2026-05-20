'use client';

import React, { useState } from 'react';
import { Search, SlidersHorizontal, X, Calendar, ChevronDown, Check } from 'lucide-react';
import { ConversationFilters as Filters } from '@/types/conversation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ConversationFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Partial<Filters>) => void;
  totalResults: number;
}

type FilterChip = {
  id: Filters['status'];
  label: string;
  count?: number;
};

const filterChips: FilterChip[] = [
  { id: 'all', label: 'All' },
  { id: 'unresolved', label: 'Unresolved' },
  { id: 'flagged', label: 'Flagged' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'with_feedback', label: 'With Feedback' },
];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'longest', label: 'Longest Conversations' },
  { value: 'shortest', label: 'Shortest Conversations' },
];

export function ConversationFilters({
  filters,
  onFiltersChange,
  totalResults,
}: ConversationFiltersProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Format date for display
  const formatDate = (date: Date | undefined): string => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Check if date filter is active
  const hasDateFilter = filters.dateRange.start || filters.dateRange.end;

  // Clear all filters
  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      dateRange: { start: undefined, end: undefined },
      sortBy: 'newest',
    });
  };

  // Check if any filter is active (not default)
  const hasActiveFilters =
    filters.search !== '' ||
    filters.status !== 'all' ||
    hasDateFilter;

  return (
    <div className="space-y-4">
      {/* Search and Sort Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E73]" />
          <Input
            type="text"
            placeholder="Search conversations, users, or tags..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="pl-10 pr-10"
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[#F5F5F7] transition-colors"
            >
              <X className="w-3.5 h-3.5 text-[#6E6E73]" />
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="min-w-[180px] justify-between"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              {sortOptions.find((o) => o.value === filters.sortBy)?.label}
            </span>
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform',
                showSortMenu && 'rotate-180'
              )}
            />
          </Button>

          {showSortMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowSortMenu(false)}
              />
              <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-white rounded-xl shadow-apple-lg border border-black/[0.06] py-1.5 z-20 animate-scale-in">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onFiltersChange({ sortBy: option.value as Filters['sortBy'] });
                      setShowSortMenu(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-2 text-sm transition-colors',
                      filters.sortBy === option.value
                        ? 'text-[#5B5EFF] bg-[#5B5EFF]/5'
                        : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                    )}
                  >
                    {option.label}
                    {filters.sortBy === option.value && (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filter Chips and Date Picker */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status Filter Chips */}
        <div className="flex flex-wrap gap-1.5">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => onFiltersChange({ status: chip.id })}
              className={cn(
                'px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200',
                filters.status === chip.id
                  ? 'bg-[#5B5EFF] text-white shadow-sm'
                  : 'bg-white text-[#6E6E73] hover:bg-[#F5F5F7] border border-black/[0.06]'
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Date Filter Button */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={cn(
              'gap-2',
              hasDateFilter && 'border-[#5B5EFF]/30 bg-[#5B5EFF]/5'
            )}
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">
              {hasDateFilter
                ? `${formatDate(filters.dateRange.start) || 'Start'} - ${formatDate(filters.dateRange.end) || 'Now'}`
                : 'Date Range'}
            </span>
          </Button>

          {showDatePicker && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDatePicker(false)}
              />
              <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-apple-lg border border-black/[0.06] p-4 z-20 animate-scale-in">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={
                        filters.dateRange.start
                          ? new Date(filters.dateRange.start).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) =>
                        onFiltersChange({
                          dateRange: {
                            ...filters.dateRange,
                            start: e.target.value ? new Date(e.target.value) : undefined,
                          },
                        })
                      }
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={
                        filters.dateRange.end
                          ? new Date(filters.dateRange.end).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) =>
                        onFiltersChange({
                          dateRange: {
                            ...filters.dateRange,
                            end: e.target.value ? new Date(e.target.value) : undefined,
                          },
                        })
                      }
                      className="text-sm"
                    />
                  </div>
                  {hasDateFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onFiltersChange({ dateRange: { start: undefined, end: undefined } })
                      }
                      className="w-full text-[#FF3B30] hover:bg-[#FF3B30]/5"
                    >
                      Clear Date Filter
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Clear All Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-[#6E6E73] hover:text-[#1D1D1F]"
          >
            <X className="w-4 h-4 mr-1" />
            Clear all
          </Button>
        )}

        {/* Results Count */}
        <span className="ml-auto text-sm text-[#6E6E73]">
          {totalResults} {totalResults === 1 ? 'conversation' : 'conversations'}
        </span>
      </div>
    </div>
  );
}
