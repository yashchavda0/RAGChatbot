'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { documentApi } from '@/lib/api';
import type { CrawledPage } from '@/lib/api';

interface WebsiteCrawlFlowProps {
  chatbotId: string;
  onComplete: () => void;
}

type CrawlState = 'idle' | 'crawling' | 'review' | 'processing';

export function WebsiteCrawlFlow({ chatbotId, onComplete }: WebsiteCrawlFlowProps) {
  const [url, setUrl] = useState('');
  const [crawlState, setCrawlState] = useState<CrawlState>('idle');
  const [crawledPages, setCrawledPages] = useState<CrawledPage[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');

  const handleCrawl = async () => {
    if (!url.trim()) return;

    setError(null);
    setCrawlState('crawling');

    try {
      const result = await documentApi.crawlUrl(chatbotId, url.trim(), {
        maxDepth: 2,
        maxLinks: 100,
        sameDomainOnly: true,
      });
      setSourceUrl(result.source_url);
      setCrawledPages(result.discovered_links);
      setSelectedUrls(new Set(result.discovered_links.map((p: CrawledPage) => p.url)));
      setSearchFilter('');
      setCrawlState('review');
    } catch (err: any) {
      setError(err?.message || 'Failed to crawl website');
      setCrawlState('idle');
    }
  };

  const handleProcessSelected = async () => {
    const urls = Array.from(selectedUrls);
    if (urls.length === 0) return;

    setCrawlState('processing');
    try {
      await documentApi.scrapeUrls(chatbotId, urls, sourceUrl);
      resetState();
      onComplete();
    } catch (err: any) {
      setError(err?.message || 'Failed to process pages');
      setCrawlState('review');
    }
  };

  const resetState = () => {
    setCrawlState('idle');
    setUrl('');
    setCrawledPages([]);
    setSourceUrl('');
    setSelectedUrls(new Set());
    setSearchFilter('');
    setError(null);
  };

  const toggleUrl = (pageUrl: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(pageUrl)) next.delete(pageUrl);
      else next.add(pageUrl);
      return next;
    });
  };

  const selectAll = () => setSelectedUrls(new Set(crawledPages.map((p) => p.url)));
  const deselectAll = () => setSelectedUrls(new Set());

  const filteredPages = useMemo(() => {
    if (!searchFilter.trim()) return crawledPages;
    const q = searchFilter.toLowerCase();
    return crawledPages.filter(
      (p) =>
        p.url.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [crawledPages, searchFilter]);

  return (
    <div>
      {/* Crawl Input */}
      <div className="space-y-3">
        <label className="block text-[13px] font-medium text-[#1D1D1F]">
          Crawl Entire Website
        </label>
        <div className="flex gap-3">
          <Input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCrawl()}
            className="flex-1"
            disabled={crawlState !== 'idle'}
          />
          <Button
            onClick={handleCrawl}
            disabled={!url.trim() || crawlState !== 'idle'}
            className="bg-[#5B5EFF] hover:bg-[#4A4AE0] text-white px-5"
          >
            Crawl Website
          </Button>
        </div>
        <p className="text-[12px] text-[#6E6E73]">
          Discovers all pages on the website. You can then select which pages to add to your knowledge base.
        </p>
      </div>

      {/* Crawling Progress */}
      {crawlState === 'crawling' && (
        <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-[#5B5EFF]/5 border border-[#5B5EFF]/10">
          <svg className="w-5 h-5 text-[#5B5EFF] animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <div>
            <p className="text-[14px] font-medium text-[#1D1D1F]">Crawling website...</p>
            <p className="text-[12px] text-[#6E6E73]">Discovering pages. This may take up to 60 seconds.</p>
          </div>
        </div>
      )}

      {/* Processing Progress */}
      {crawlState === 'processing' && (
        <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-[#5B5EFF]/5 border border-[#5B5EFF]/10">
          <svg className="w-5 h-5 text-[#5B5EFF] animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <div>
            <p className="text-[14px] font-medium text-[#1D1D1F]">Processing pages...</p>
            <p className="text-[12px] text-[#6E6E73]">Scraping, chunking, and embedding selected pages.</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-[#FF3B30]/5 border border-[#FF3B30]/10 text-[13px] text-[#FF3B30]">
          {error}
        </div>
      )}

      {/* Inline Review List */}
      {crawlState === 'review' && crawledPages.length > 0 && (
        <div className="mt-4 border border-black/[0.06] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-[#F5F5F7] border-b border-black/[0.06] flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-[#1D1D1F]">
                Discovered Pages
              </p>
              <p className="text-[12px] text-[#6E6E73]">
                From <span className="text-[#5B5EFF] font-medium">{sourceUrl}</span> &middot; {selectedUrls.size} of {crawledPages.length} selected
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetState}
              className="h-8 text-[12px] text-[#6E6E73]"
            >
              Clear
            </Button>
          </div>

          {/* Toolbar */}
          <div className="px-4 py-2 flex items-center gap-3 border-b border-black/[0.04]">
            <Input
              type="text"
              placeholder="Filter pages..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="flex-1 h-8 text-[12px]"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
              className="h-8 text-[11px] text-[#5B5EFF] px-2"
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={deselectAll}
              className="h-8 text-[11px] text-[#6E6E73] px-2"
            >
              None
            </Button>
          </div>

          {/* Page List */}
          <div className="max-h-[400px] overflow-y-auto">
            {filteredPages.length === 0 ? (
              <div className="text-center py-6 text-[12px] text-[#6E6E73]">
                No pages match your filter.
              </div>
            ) : (
              <div className="divide-y divide-black/[0.04]">
                {filteredPages.map((page) => {
                  const isSelected = selectedUrls.has(page.url);
                  return (
                    <label
                      key={page.url}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
                        isSelected ? 'bg-[#5B5EFF]/5' : 'hover:bg-black/[0.02]'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleUrl(page.url)}
                        className="mt-0.5 w-4 h-4 rounded border-[#6E6E73] text-[#5B5EFF] focus:ring-[#5B5EFF] focus:ring-offset-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[#1D1D1F] truncate">
                          {page.title || page.url}
                        </div>
                        {page.title && page.title !== page.url && (
                          <div className="text-[11px] text-[#5B5EFF] truncate mt-0.5">
                            {page.url}
                          </div>
                        )}
                        {page.description && (
                          <div className="text-[11px] text-[#6E6E73] line-clamp-2 mt-1">
                            {page.description}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-black/[0.06] flex items-center justify-between bg-white">
            <span className="text-[12px] text-[#6E6E73]">
              {selectedUrls.size} page{selectedUrls.size !== 1 ? 's' : ''} selected
            </span>
            <Button
              onClick={handleProcessSelected}
              disabled={selectedUrls.size === 0}
              className="bg-[#5B5EFF] hover:bg-[#4A4AE0] text-white text-[13px] h-9 px-4"
            >
              Process {selectedUrls.size} Page{selectedUrls.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
