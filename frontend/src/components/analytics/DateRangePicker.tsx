'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { DATE_RANGE_OPTIONS } from '@/lib/utils/constants';
import type { DateRange, DateRangeOption } from '@/types/analytics';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange, customStart?: string, customEnd?: string) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const handleSelect = (option: DateRangeOption) => {
    if (option.value === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
      onChange(option.value);
    }
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange('custom', customStart, customEnd);
      setShowCustomPicker(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center gap-2 p-1 rounded-xl bg-[#F5F5F7] backdrop-blur-sm">
        {DATE_RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
              value === option.value
                ? 'bg-white text-[#1D1D1F] shadow-sm'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {showCustomPicker && (
        <div className="absolute top-full left-0 mt-2 p-4 rounded-xl bg-white shadow-lg border border-[#E5E5EA] z-50">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-[#86868B] mb-1">Start Date</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#E5E5EA] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5EFF]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#86868B] mb-1">End Date</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#E5E5EA] text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5EFF]/20"
              />
            </div>
            <button
              onClick={handleCustomApply}
              disabled={!customStart || !customEnd}
              className="mt-4 px-4 py-2 bg-[#5B5EFF] text-white text-sm font-medium rounded-lg hover:bg-[#3D3DD9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
