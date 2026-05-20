'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ExportButtonProps {
  onExport: (format: 'csv' | 'json') => void;
  isLoading?: boolean;
  className?: string;
}

export function ExportButton({ onExport, isLoading = false, className }: ExportButtonProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = (format: 'csv' | 'json') => {
    onExport(format);
    setShowMenu(false);
  };

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isLoading}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
          'bg-white border border-[#E5E5EA] text-[#1D1D1F]',
          'hover:border-[#5B5EFF]/30 hover:bg-[#5B5EFF]/5',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isLoading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        )}
        Export Data
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-lg border border-[#E5E5EA] z-50 overflow-hidden">
            <button
              onClick={() => handleExport('csv')}
              className="w-full px-4 py-3 text-left text-sm hover:bg-[#F5F5F7] transition-colors flex items-center gap-3"
            >
              <svg className="w-4 h-4 text-[#86868B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div>
                <p className="font-medium text-[#1D1D1F]">CSV Format</p>
                <p className="text-xs text-[#86868B]">Spreadsheet compatible</p>
              </div>
            </button>
            <button
              onClick={() => handleExport('json')}
              className="w-full px-4 py-3 text-left text-sm hover:bg-[#F5F5F7] transition-colors flex items-center gap-3"
            >
              <svg className="w-4 h-4 text-[#86868B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              <div>
                <p className="font-medium text-[#1D1D1F]">JSON Format</p>
                <p className="text-xs text-[#86868B]">Developer friendly</p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
