'use client';

import { use, useState, useCallback, useRef } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DocumentList, type Document } from '@/components/knowledge/DocumentList';
import { UrlList, type UrlSource } from '@/components/knowledge/UrlList';
import { cn } from '@/lib/utils';

// Mock data for demonstration
const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Product_Documentation_v2.pdf',
    size: 2458624,
    type: 'application/pdf',
    status: 'indexed',
    uploadDate: 'Mar 25, 2026',
    chunks: 156,
  },
  {
    id: '2',
    name: 'User_Manual.docx',
    size: 1048576,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    status: 'indexed',
    uploadDate: 'Mar 24, 2026',
    chunks: 89,
  },
  {
    id: '3',
    name: 'FAQ_Sheet.txt',
    size: 52428,
    type: 'text/plain',
    status: 'processing',
    uploadDate: 'Mar 27, 2026',
  },
  {
    id: '4',
    name: 'API_Reference.pdf',
    size: 4194304,
    type: 'application/pdf',
    status: 'error',
    uploadDate: 'Mar 23, 2026',
    error: 'Failed to extract text',
  },
  {
    id: '5',
    name: 'Troubleshooting_Guide.pdf',
    size: 1572864,
    type: 'application/pdf',
    status: 'indexed',
    uploadDate: 'Mar 22, 2026',
    chunks: 72,
  },
];

const mockUrls: UrlSource[] = [
  {
    id: '1',
    url: 'https://docs.example.com/getting-started',
    title: 'Getting Started Guide',
    status: 'indexed',
    indexedDate: 'Mar 25, 2026',
    pages: 12,
  },
  {
    id: '2',
    url: 'https://help.example.com/faq',
    title: 'Frequently Asked Questions',
    status: 'indexed',
    indexedDate: 'Mar 24, 2026',
    pages: 8,
  },
  {
    id: '3',
    url: 'https://blog.example.com/best-practices',
    title: 'Best Practices Blog',
    status: 'crawling',
    indexedDate: 'Mar 27, 2026',
  },
  {
    id: '4',
    url: 'https://api.example.com/docs',
    title: 'API Documentation',
    status: 'error',
    indexedDate: 'Mar 23, 2026',
    error: 'Connection timeout',
  },
];

type TabType = 'documents' | 'urls' | 'text';

interface KnowledgeBaseStats {
  totalDocuments: number;
  totalChunks: number;
  lastUpdated: string;
}

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<TabType>('documents');
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [urls, setUrls] = useState<UrlSource[]>(mockUrls);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [isSavingText, setIsSavingText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats: KnowledgeBaseStats = {
    totalDocuments: documents.filter((d) => d.status === 'indexed').length + urls.filter((u) => u.status === 'indexed').length,
    totalChunks: documents.reduce((acc, doc) => acc + (doc.chunks || 0), 0),
    lastUpdated: 'Mar 27, 2026',
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUrls = urls.filter(
    (url) =>
      url.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      url.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    // Simulate upload
    setTimeout(() => {
      const newDocs: Document[] = Array.from(files).map((file, index) => ({
        id: `new-${Date.now()}-${index}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'processing' as const,
        uploadDate: 'Mar 27, 2026',
      }));

      setDocuments((prev) => [...newDocs, ...prev]);
      setIsUploading(false);

      // Simulate processing completion
      setTimeout(() => {
        setDocuments((prev) =>
          prev.map((doc) =>
            newDocs.some((nd) => nd.id === doc.id)
              ? { ...doc, status: 'indexed' as const, chunks: Math.floor(Math.random() * 100) + 10 }
              : doc
          )
        );
      }, 3000);
    }, 1500);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleDeleteDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  }, []);

  const handleRetryDocument = useCallback((id: string) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id ? { ...doc, status: 'processing' as const } : doc
      )
    );
    // Simulate retry
    setTimeout(() => {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === id ? { ...doc, status: 'indexed' as const, chunks: Math.floor(Math.random() * 100) + 10 } : doc
        )
      );
    }, 2000);
  }, []);

  const handleAddUrl = useCallback(() => {
    if (!newUrl.trim()) return;

    setIsAddingUrl(true);

    // Simulate adding URL
    setTimeout(() => {
      const newUrlSource: UrlSource = {
        id: `url-${Date.now()}`,
        url: newUrl,
        title: new URL(newUrl).hostname,
        status: 'crawling',
        indexedDate: 'Mar 27, 2026',
      };

      setUrls((prev) => [newUrlSource, ...prev]);
      setNewUrl('');
      setIsAddingUrl(false);

      // Simulate crawling completion
      setTimeout(() => {
        setUrls((prev) =>
          prev.map((url) =>
            url.id === newUrlSource.id
              ? { ...url, status: 'indexed' as const, pages: Math.floor(Math.random() * 15) + 1, title: 'Indexed Page' }
              : url
          )
        );
      }, 4000);
    }, 1000);
  }, [newUrl]);

  const handleDeleteUrl = useCallback((id: string) => {
    setUrls((prev) => prev.filter((url) => url.id !== id));
  }, []);

  const handleRefreshUrl = useCallback((id: string) => {
    setUrls((prev) =>
      prev.map((url) =>
        url.id === id ? { ...url, status: 'crawling' as const } : url
      )
    );
    // Simulate refresh
    setTimeout(() => {
      setUrls((prev) =>
        prev.map((url) =>
          url.id === id ? { ...url, status: 'indexed' as const } : url
        )
      );
    }, 3000);
  }, []);

  const handleSaveText = useCallback(() => {
    if (!textTitle.trim() || !textContent.trim()) return;

    setIsSavingText(true);

    // Simulate saving text
    setTimeout(() => {
      const newTextDoc: Document = {
        id: `text-${Date.now()}`,
        name: textTitle,
        size: textContent.length,
        type: 'text/plain',
        status: 'indexed',
        uploadDate: 'Mar 27, 2026',
        chunks: Math.ceil(textContent.length / 500),
      };

      setDocuments((prev) => [newTextDoc, ...prev]);
      setTextTitle('');
      setTextContent('');
      setIsSavingText(false);
      setActiveTab('documents');
    }, 1500);
  }, [textTitle, textContent]);

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count: number }[] = [
    {
      id: 'documents',
      label: 'Documents',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      count: documents.length,
    },
    {
      id: 'urls',
      label: 'URLs',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      count: urls.length,
    },
    {
      id: 'text',
      label: 'Text',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      ),
      count: 0,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Knowledge Base</h1>
          <p className="text-[#6E6E73] mt-1">
            Manage your documents, URLs, and text content for RAG
          </p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          {isUploading ? (
            <>
              <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Uploading...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Source
            </>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.md"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard variant="subtle" padding="md" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#5B5EFF]/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-[#5B5EFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-[12px] text-[#6E6E73]">Total Documents</p>
            <p className="text-[20px] font-semibold text-[#1D1D1F]">{stats.totalDocuments}</p>
          </div>
        </GlassCard>

        <GlassCard variant="subtle" padding="md" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#34C759]/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-[#34C759]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <div>
            <p className="text-[12px] text-[#6E6E73]">Total Chunks</p>
            <p className="text-[20px] font-semibold text-[#1D1D1F]">{stats.totalChunks.toLocaleString()}</p>
          </div>
        </GlassCard>

        <GlassCard variant="subtle" padding="md" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FF9500]/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-[#FF9500]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[12px] text-[#6E6E73]">Last Updated</p>
            <p className="text-[20px] font-semibold text-[#1D1D1F]">{stats.lastUpdated}</p>
          </div>
        </GlassCard>
      </div>

      {/* Tabs */}
      <div className="border-b border-black/[0.04]">
        <nav className="flex gap-1 -mb-px" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-[14px] font-medium border-b-2 transition-all duration-200',
                activeTab === tab.id
                  ? 'border-[#5B5EFF] text-[#5B5EFF]'
                  : 'border-transparent text-[#6E6E73] hover:text-[#1D1D1F] hover:border-[#E5E5EA]'
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[11px]',
                    activeTab === tab.id
                      ? 'bg-[#5B5EFF]/10 text-[#5B5EFF]'
                      : 'bg-[#F5F5F7] text-[#6E6E73]'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Search Bar */}
      {activeTab !== 'text' && (
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E73]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            type="text"
            placeholder={activeTab === 'documents' ? 'Search documents...' : 'Search URLs...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11"
          />
        </div>
      )}

      {/* Tab Content */}
      <GlassCard variant="default" padding="md">
        {activeTab === 'documents' && (
          <DocumentList
            documents={filteredDocuments}
            isLoading={false}
            onDelete={handleDeleteDocument}
            onRetry={handleRetryDocument}
          />
        )}

        {activeTab === 'urls' && (
          <div className="space-y-6">
            {/* Add URL Form */}
            <div className="flex gap-3">
              <Input
                type="url"
                placeholder="https://example.com/documentation"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                className="flex-1"
              />
              <Button onClick={handleAddUrl} disabled={!newUrl.trim() || isAddingUrl}>
                {isAddingUrl ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Adding...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add URL
                  </>
                )}
              </Button>
            </div>

            {/* URL List */}
            <UrlList
              urls={filteredUrls}
              isLoading={false}
              onDelete={handleDeleteUrl}
              onRefresh={handleRefreshUrl}
            />
          </div>
        )}

        {activeTab === 'text' && (
          <div className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-[#1D1D1F] mb-2">
                Title
              </label>
              <Input
                type="text"
                placeholder="Enter a title for this content..."
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#1D1D1F] mb-2">
                Content
                <span className="text-[11px] text-[#6E6E73] font-normal ml-1">
                  (Markdown supported)
                </span>
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Enter your custom text, FAQ content, or any information you want to include in your knowledge base..."
                rows={10}
                className={cn(
                  'w-full px-4 py-3 rounded-xl border border-black/[0.08] bg-white',
                  'text-[14px] text-[#1D1D1F] placeholder:text-[#6E6E73]/60',
                  'focus:outline-none focus:ring-2 focus:ring-[#5B5EFF]/20 focus:border-[#5B5EFF]/30',
                  'transition-all duration-200 resize-none'
                )}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-black/[0.04]">
              <p className="text-[12px] text-[#6E6E73]">
                {textContent.length.toLocaleString()} characters | ~{Math.ceil(textContent.length / 500)} chunks
              </p>
              <Button
                onClick={handleSaveText}
                disabled={!textTitle.trim() || !textContent.trim() || isSavingText}
              >
                {isSavingText ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Content
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
