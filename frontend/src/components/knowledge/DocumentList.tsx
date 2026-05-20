'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'processing' | 'indexed' | 'error';
  uploadDate: string;
  chunks?: number;
  error?: string;
}

interface DocumentListProps {
  documents: Document[];
  isLoading?: boolean;
  onDelete?: (id: string) => void;
  onRetry?: (id: string) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const statusConfig = {
  processing: {
    label: 'Processing',
    bgColor: 'bg-[#007AFF]/10',
    textColor: 'text-[#007AFF]',
    dotColor: 'bg-[#007AFF]',
  },
  indexed: {
    label: 'Indexed',
    bgColor: 'bg-[#34C759]/10',
    textColor: 'text-[#34C759]',
    dotColor: 'bg-[#34C759]',
  },
  error: {
    label: 'Error',
    bgColor: 'bg-[#FF3B30]/10',
    textColor: 'text-[#FF3B30]',
    dotColor: 'bg-[#FF3B30]',
  },
};

const getFileIcon = (type: string) => {
  if (type.includes('pdf')) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }
  if (type.includes('word') || type.includes('document')) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  if (type.includes('text') || type.includes('plain')) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
};

export function DocumentList({ documents, isLoading, onDelete, onRetry }: DocumentListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl bg-white/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#5B5EFF]/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-[#5B5EFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-[15px] font-medium text-[#1D1D1F] mb-1">No documents yet</h3>
        <p className="text-[13px] text-[#6E6E73]">Upload your first document to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const config = statusConfig[doc.status];
        const isHovered = hoveredId === doc.id;

        return (
          <div
            key={doc.id}
            className={cn(
              'group flex items-center gap-4 p-4 rounded-xl transition-all duration-200',
              'bg-white border border-black/[0.04]',
              'hover:border-[#5B5EFF]/20 hover:shadow-[0_4px_12px_rgba(91,94,255,0.08)]'
            )}
            onMouseEnter={() => setHoveredId(doc.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* File Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#5B5EFF]/10 flex items-center justify-center text-[#5B5EFF]">
              {getFileIcon(doc.type)}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-[14px] font-medium text-[#1D1D1F] truncate">
                  {doc.name}
                </h4>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[12px] text-[#6E6E73]">{formatFileSize(doc.size)}</span>
                <span className="text-[12px] text-[#6E6E73]">{doc.uploadDate}</span>
                {doc.chunks !== undefined && (
                  <>
                    <span className="text-[12px] text-[#6E6E73]">{doc.chunks} chunks</span>
                  </>
                )}
              </div>
            </div>

            {/* Status Badge */}
            <div
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium',
                config.bgColor,
                config.textColor
              )}
            >
              {doc.status === 'processing' && (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {doc.status !== 'processing' && (
                <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
              )}
              {config.label}
            </div>

            {/* Actions */}
            <div className={cn(
              'flex items-center gap-2 transition-opacity duration-200',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}>
              {doc.status === 'error' && onRetry && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRetry(doc.id)}
                  className="h-8 px-3 text-[12px]"
                >
                  Retry
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(doc.id)}
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
