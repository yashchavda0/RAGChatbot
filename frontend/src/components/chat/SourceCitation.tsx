'use client';

import React from 'react';
import { FileText, Globe, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { Source } from '@/types';
import { cn } from '@/lib/utils';

interface SourceCitationProps {
  source: Source;
}

export function SourceCitation({ source }: SourceCitationProps) {
  const getIcon = () => {
    switch (source.type) {
      case 'document':
        return <FileText className="w-3.5 h-3.5" />;
      case 'web':
        return <Globe className="w-3.5 h-3.5" />;
      case 'ocr':
        return <ImageIcon className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  const getLabel = () => {
    switch (source.type) {
      case 'document':
        return source.filename || 'Document';
      case 'web':
        return source.title || source.url || 'Web Source';
      case 'ocr':
        return source.filename || 'Image';
      default:
        return 'Unknown Source';
    }
  };

  if (source.type === 'web' && source.url) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        {getIcon()}
        <span className="underline">{getLabel()}</span>
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  }

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1 rounded-md bg-muted/50',
    )}>
      {getIcon()}
      <span>{getLabel()}</span>
    </div>
  );
}
