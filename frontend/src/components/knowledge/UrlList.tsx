'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface UrlSource {
  id: string;
  url: string;
  title: string;
  status: 'crawling' | 'indexed' | 'error';
  indexedDate: string;
  pages?: number;
  error?: string;
}

interface UrlListProps {
  urls: UrlSource[];
  isLoading?: boolean;
  onDelete?: (id: string) => void;
  onRefresh?: (id: string) => void;
}

const statusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
  crawling: {
    label: 'Crawling',
    bgColor: 'bg-[#007AFF]/10',
    textColor: 'text-[#007AFF]',
  },
  processing: {
    label: 'Processing',
    bgColor: 'bg-[#007AFF]/10',
    textColor: 'text-[#007AFF]',
  },
  indexed: {
    label: 'Indexed',
    bgColor: 'bg-[#34C759]/10',
    textColor: 'text-[#34C759]',
  },
  error: {
    label: 'Error',
    bgColor: 'bg-[#FF3B30]/10',
    textColor: 'text-[#FF3B30]',
  },
};

const getDomain = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const getFaviconUrl = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '';
  }
};

export function UrlList({ urls, isLoading, onDelete, onRefresh }: UrlListProps) {
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

  if (urls.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#5B5EFF]/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-[#5B5EFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <h3 className="text-[15px] font-medium text-[#1D1D1F] mb-1">No URLs indexed</h3>
        <p className="text-[13px] text-[#6E6E73]">Add a URL to start crawling web content</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {urls.map((urlSource) => {
        const config = statusConfig[urlSource.status];
        const isHovered = hoveredId === urlSource.id;

        return (
          <div
            key={urlSource.id}
            className={cn(
              'group flex items-center gap-4 p-4 rounded-xl transition-all duration-200',
              'bg-white border border-black/[0.04]',
              'hover:border-[#5B5EFF]/20 hover:shadow-[0_4px_12px_rgba(91,94,255,0.08)]'
            )}
            onMouseEnter={() => setHoveredId(urlSource.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Favicon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#F5F5F7] flex items-center justify-center overflow-hidden">
              <img
                src={getFaviconUrl(urlSource.url)}
                alt=""
                className="w-6 h-6"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            {/* URL Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-[14px] font-medium text-[#1D1D1F] truncate">
                  {urlSource.title || getDomain(urlSource.url)}
                </h4>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[12px] text-[#5B5EFF] truncate max-w-[200px]">
                  {getDomain(urlSource.url)}
                </span>
                <span className="text-[12px] text-[#6E6E73]">{urlSource.indexedDate}</span>
                {urlSource.pages !== undefined && (
                  <span className="text-[12px] text-[#6E6E73]">{urlSource.pages} pages</span>
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
              {(urlSource.status === 'crawling' || urlSource.status === 'processing') && (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {config.label}
            </div>

            {/* Actions */}
            <div className={cn(
              'flex items-center gap-2 transition-opacity duration-200',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}>
              {urlSource.status === 'indexed' && onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRefresh(urlSource.id)}
                  className="h-8 px-3 text-[12px]"
                >
                  Refresh
                </Button>
              )}
              {urlSource.status === 'error' && onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRefresh(urlSource.id)}
                  className="h-8 px-3 text-[12px]"
                >
                  Retry
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(urlSource.id)}
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
