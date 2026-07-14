'use client';

import React, { useMemo, useState } from 'react';
import { FileText, Globe, ChevronDown, ChevronRight } from 'lucide-react';
import { Source } from '@/types';

interface SourceFooterProps {
  sources?: Source[];
  maxVisible?: number;
}

export const SourceFooter: React.FC<SourceFooterProps> = ({ sources = [], maxVisible = 3 }) => {
  const [expanded, setExpanded] = useState(false);

  const deduplicatedSources = useMemo(() => {
    const seen = new Map<string, Source>();

    for (const source of sources) {
      const key = source.type === 'document'
        ? source.document_name || source.filename
        : source.url;

      if (!key) continue;

      if (!seen.has(key)) {
        seen.set(key, source);
      } else {
        const existing = seen.get(key)!;
        if (source.similarity_score && existing.similarity_score && source.similarity_score > existing.similarity_score) {
          seen.set(key, source);
        }
      }
    }

    return Array.from(seen.values());
  }, [sources]);

  if (deduplicatedSources.length === 0) return null;

  const docSources = deduplicatedSources.filter(s => s.type === 'document');
  const webSources = deduplicatedSources.filter(s => s.type === 'web');
  const allSources = [
    ...docSources.map(s => ({ ...s, kind: 'doc' as const })),
    ...webSources.map(s => ({ ...s, kind: 'web' as const })),
  ];

  const visibleSources = expanded ? allSources : allSources.slice(0, maxVisible);
  const hiddenCount = allSources.length - maxVisible;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {visibleSources.map((source, idx) => {
        const displayName = (source.document_name || source.filename || source.title || 'Source')
          .replace(/\.(pdf|docx?|txt)$/i, '')
          .substring(0, 20);

        const isWeb = source.kind === 'web';

        return (
          <div
            key={`${source.kind}-${idx}`}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] ${
              isWeb
                ? 'bg-emerald-50/60 border border-emerald-100 text-emerald-700'
                : 'bg-blue-50/60 border border-blue-100 text-blue-700'
            }`}
            title={source.document_name || source.filename || source.url}
          >
            {isWeb ? <Globe className="w-2.5 h-2.5" /> : <FileText className="w-2.5 h-2.5" />}
            <span className="font-medium">{displayName}</span>
          </div>
        );
      })}

      {hiddenCount > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ChevronRight className="w-3 h-3" />
          <span className="font-medium">+{hiddenCount} more</span>
        </button>
      )}

      {expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(false)}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ChevronDown className="w-3 h-3" />
          <span className="font-medium">Show less</span>
        </button>
      )}
    </div>
  );
};
