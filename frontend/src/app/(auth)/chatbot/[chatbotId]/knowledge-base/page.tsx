'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DocumentList, type Document } from '@/components/knowledge/DocumentList';
import { UrlList, type UrlSource } from '@/components/knowledge/UrlList';
import { WebsiteCrawlFlow } from '@/components/knowledge/WebsiteCrawlFlow';
import { cn } from '@/lib/utils';
import { documentApi } from '@/lib/api';

type TabType = 'documents' | 'urls' | 'text';

interface KnowledgeBasePageProps {
  params: { chatbotId: string };
}

interface KnowledgeBaseStats {
  totalDocuments: number;
  totalChunks: number;
  lastUpdated: string;
}

const getFileType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const typeMap: Record<string, string> = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'txt': 'text/plain',
  };
  return typeMap[ext || ''] || 'application/octet-stream';
};

export default function KnowledgeBasePage({ params }: KnowledgeBasePageProps) {
  const { chatbotId } = params;
  const [activeTab, setActiveTab] = useState<TabType>('documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [urls, setUrls] = useState<UrlSource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [isSavingText, setIsSavingText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await documentApi.list(chatbotId);
      const mappedDocs = response.documents.map((doc: any) => ({
        id: doc.id,
        name: doc.filename,
        size: doc.file_size,
        type: getFileType(doc.filename),
        status: doc.status === 'completed' ? 'indexed' as const :
                doc.status === 'processing' ? 'processing' as const :
                'error' as const,
        uploadDate: new Date(doc.created_at).toLocaleDateString(),
        chunks: doc.chunks_count,
        error: doc.error_message,
        sourceType: doc.source_type,
      }));

      // Separate documents and URLs using source_type from backend
      const URL_TYPES = ['url', 'website', 'crawled_page'];
      const docList = mappedDocs.filter((d: any) => !URL_TYPES.includes(d.sourceType));
      const urlList = mappedDocs
        .filter((d: any) => URL_TYPES.includes(d.sourceType))
        .map((d: any) => ({
          id: d.id,
          url: d.name,
          title: d.name,
          status: d.status,
          indexedDate: d.uploadDate,
          chunks: d.chunks,
        }));

      setDocuments(docList);
      setUrls(urlList);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [chatbotId]);

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Poll for processing status updates
  useEffect(() => {
    const interval = setInterval(async () => {
      const processingDocs = [...documents, ...urls].filter(d => d.status === 'processing');
      if (processingDocs.length > 0) {
        try {
          const response = await documentApi.list(chatbotId);
          const mappedDocs = response.documents.map((doc: any) => ({
            id: doc.id,
            name: doc.filename,
            size: doc.file_size,
            type: getFileType(doc.filename),
            status: doc.status === 'completed' ? 'indexed' as const :
                    doc.status === 'processing' ? 'processing' as const :
                    'error' as const,
            uploadDate: new Date(doc.created_at).toLocaleDateString(),
            chunks: doc.chunks_count,
            error: doc.error_message,
            sourceType: doc.source_type,
          }));
          const URL_TYPES = ['url', 'website', 'crawled_page'];
          setDocuments(mappedDocs.filter((d: any) => !URL_TYPES.includes(d.sourceType)));
          setUrls(mappedDocs
            .filter((d: any) => URL_TYPES.includes(d.sourceType))
            .map((d: any) => ({
              id: d.id,
              url: d.name,
              title: d.name,
              status: d.status,
              indexedDate: d.uploadDate,
              chunks: d.chunks,
            }))
          );
        } catch (err) {
          console.error('Failed to poll document status:', err);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [documents, chatbotId]);

  const stats: KnowledgeBaseStats = {
    totalDocuments: documents.length + urls.length,
    totalChunks:
      documents.reduce((acc, doc) => acc + (doc.chunks || 0), 0) +
      urls.reduce((acc, url) => acc + (url.chunks || 0), 0),
    lastUpdated: documents.length > 0 || urls.length > 0 ? new Date().toLocaleDateString() : '-',
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUrls = urls.filter(
    (url) =>
      url.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      url.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
      const tempId = `temp-${Date.now()}-${file.name}`;
      const newDoc: Document = {
        id: tempId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'processing',
        uploadDate: new Date().toLocaleDateString(),
      };
      setDocuments((prev) => [newDoc, ...prev]);

      try {
        const result = await documentApi.upload(chatbotId, file);
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === tempId
              ? { ...doc, id: result.document_id, status: 'processing' as const }
              : doc
          )
        );
        toast.success(`${file.name} uploaded`);
      } catch (err) {
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === tempId
              ? { ...doc, status: 'error' as const, error: err instanceof Error ? err.message : 'Upload failed' }
              : doc
          )
        );
        toast.error(err instanceof Error ? err.message : `Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [chatbotId]);

  const handleDeleteDocument = useCallback(async (id: string) => {
    try {
      await documentApi.delete(chatbotId, id);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      toast.success('Document deleted');
    } catch (err) {
      console.error('Failed to delete document:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete document');
    }
  }, [chatbotId]);

  const handleDownloadDocument = useCallback(async (id: string) => {
    try {
      const response = await documentApi.get(chatbotId, id);
      if (response.download_url) {
        window.open(response.download_url, '_blank');
      }
    } catch (err) {
      console.error('Failed to get document URL:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to download document');
    }
  }, [chatbotId]);

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

  const handleAddUrl = useCallback(async () => {
    if (!newUrl.trim()) return;

    setIsAddingUrl(true);
    const tempId = `url-${Date.now()}`;

    try {
      const urlHostname = new URL(newUrl).hostname;
      const newUrlSource: UrlSource = {
        id: tempId,
        url: newUrl,
        title: urlHostname,
        status: 'crawling',
        indexedDate: new Date().toLocaleDateString(),
      };

      setUrls((prev) => [newUrlSource, ...prev]);
      setNewUrl('');

      const result = await documentApi.addUrl(chatbotId, newUrl);
      setUrls((prev) =>
        prev.map((url) =>
          url.id === tempId
            ? { ...url, id: result.document_id, status: 'crawling' as const }
            : url
        )
      );
      toast.success('URL added');
    } catch (err) {
      setUrls((prev) =>
        prev.map((url) =>
          url.id === tempId
            ? { ...url, status: 'error' as const, error: err instanceof Error ? err.message : 'Failed to add URL' }
            : url
        )
      );
      toast.error(err instanceof Error ? err.message : 'Failed to add URL');
    } finally {
      setIsAddingUrl(false);
    }
  }, [newUrl, chatbotId]);

  const handleDeleteUrl = useCallback(async (id: string) => {
    try {
      await documentApi.delete(chatbotId, id);
      setUrls((prev) => prev.filter((url) => url.id !== id));
      toast.success('URL deleted');
    } catch (err) {
      console.error('Failed to delete URL:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete URL');
    }
  }, [chatbotId]);

  const handleRefreshUrl = useCallback(async (id: string) => {
    const urlSource = urls.find((u) => u.id === id);
    if (!urlSource) return;

    setUrls((prev) =>
      prev.map((url) =>
        url.id === id ? { ...url, status: 'crawling' as const } : url
      )
    );

    try {
      await documentApi.delete(chatbotId, id);
      const result = await documentApi.addUrl(chatbotId, urlSource.url);
      setUrls((prev) =>
        prev.map((url) =>
          url.id === id
            ? { ...url, id: result.document_id, status: 'crawling' as const, indexedDate: new Date().toLocaleDateString() }
            : url
        )
      );
      toast.success('URL refresh started');
    } catch (err) {
      setUrls((prev) =>
        prev.map((url) =>
          url.id === id ? { ...url, status: 'error' as const } : url
        )
      );
      console.error('Failed to refresh URL:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to refresh URL');
    }
  }, [chatbotId, urls]);

  const handleSaveText = useCallback(async () => {
    if (!textTitle.trim() || !textContent.trim()) return;

    setIsSavingText(true);
    const tempId = `text-${Date.now()}`;

    try {
      const newTextDoc: Document = {
        id: tempId,
        name: textTitle,
        size: textContent.length,
        type: 'text/plain',
        status: 'processing',
        uploadDate: new Date().toLocaleDateString(),
      };

      setDocuments((prev) => [newTextDoc, ...prev]);

      const result = await documentApi.addText(chatbotId, textContent, textTitle);
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === tempId
            ? { ...doc, id: result.document_id, status: 'processing' as const }
            : doc
        )
      );

      setTextTitle('');
      setTextContent('');
      setActiveTab('documents');
      toast.success('Text content saved');
    } catch (err) {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === tempId
            ? { ...doc, status: 'error' as const, error: err instanceof Error ? err.message : 'Failed to save text' }
            : doc
        )
      );
      toast.error(err instanceof Error ? err.message : 'Failed to save text content');
    } finally {
      setIsSavingText(false);
    }
  }, [textTitle, textContent, chatbotId]);

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
            {/* Website Crawl Flow */}
            <WebsiteCrawlFlow
              chatbotId={chatbotId}
              onComplete={fetchDocuments}
            />

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/[0.06]"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-[#6E6E73]">or add a single URL</span>
              </div>
            </div>

            {/* Add Single URL Form */}
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
