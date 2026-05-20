'use client';

import React from 'react';
import { FileText, Globe, Image as ImageIcon, ExternalLink, Link } from 'lucide-react';
import { Source } from '@/types';
import { cn } from '@/lib/utils';

interface SourceCitationProps {
  source: Source;
  index?: number;
}

export function SourceCitation({ source, index }: SourceCitationProps) {
  const getSourceConfig = () => {
    switch (source.type) {
      case 'document':
        return {
          bg: 'bg-primary/10',
          text: 'text-primary',
          icon: <FileText className="w-3 h-3" />,
        };
      case 'web':
        return {
          bg: 'bg-info/10',
          text: 'text-info',
          icon: <Globe className="w-3 h-3" />,
        };
      case 'ocr':
        return {
          bg: 'bg-warning/10',
          text: 'text-warning',
          icon: <ImageIcon className="w-3 h-3" />,
        };
      case 'url':
        return {
          bg: 'bg-success/10',
          text: 'text-success',
          icon: <Link className="w-3 h-3" />,
        };
      default:
        return {
          bg: 'bg-muted',
          text: 'text-muted-foreground',
          icon: null,
        };
    }
  };

  const config = getSourceConfig();
  const label =
    source.type === 'document'
      ? source.filename || 'Document'
      : source.type === 'web' || source.type === 'url'
      ? source.title || source.url || 'Web Source'
      : source.filename || 'Image';

  if ((source.type === 'web' || source.type === 'url') && source.url) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
          'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
          'transition-all duration-200 group',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
      >
        {index && (
          <span className="w-4 h-4 rounded bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center">
            {index}
          </span>
        )}
        <span className={cn('flex-shrink-0', config.text)}>{config.icon}</span>
        <span className="max-w-[120px] sm:max-w-[180px] truncate">{label}</span>
        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
      </a>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
        config.bg,
        config.text
      )}
    >
      {index && (
        <span className="w-4 h-4 rounded bg-current/20 text-[10px] font-semibold flex items-center justify-center">
          {index}
        </span>
      )}
      {config.icon}
      <span className="max-w-[120px] sm:max-w-[180px] truncate">{label}</span>
    </span>
  );
}
