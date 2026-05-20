'use client';

import { use, useState, useCallback, useMemo } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QATable, type QAPair } from '@/components/qa/QATable';
import { QAModal } from '@/components/qa/QAModal';
import { cn } from '@/lib/utils';

// Mock data for demonstration
const mockQAPairs: QAPair[] = [
  {
    id: '1',
    question: 'What are your business hours?',
    answer: 'Our business hours are Monday through Friday, 9:00 AM to 6:00 PM EST. We are closed on weekends and major holidays.',
    category: 'General',
    tags: ['hours', 'schedule', 'support'],
    status: 'active',
    createdAt: 'Mar 20, 2026',
    updatedAt: 'Mar 25, 2026',
  },
  {
    id: '2',
    question: 'How do I reset my password?',
    answer: 'To reset your password, click on the "Forgot Password" link on the login page. Enter your registered email address, and we will send you a password reset link. The link expires in 24 hours.',
    category: 'Support',
    tags: ['password', 'account', 'security', 'login'],
    status: 'active',
    createdAt: 'Mar 18, 2026',
    updatedAt: 'Mar 22, 2026',
  },
  {
    id: '3',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for enterprise customers. All payments are processed securely through Stripe.',
    category: 'Billing',
    tags: ['payment', 'billing', 'pricing'],
    status: 'active',
    createdAt: 'Mar 15, 2026',
    updatedAt: 'Mar 20, 2026',
  },
  {
    id: '4',
    question: 'How do I upgrade my subscription?',
    answer: 'You can upgrade your subscription by navigating to Settings > Subscription > Upgrade. Select your new plan and complete the payment. Your billing will be prorated automatically.',
    category: 'Billing',
    tags: ['subscription', 'upgrade', 'plan'],
    status: 'active',
    createdAt: 'Mar 12, 2026',
    updatedAt: 'Mar 18, 2026',
  },
  {
    id: '5',
    question: 'What is your refund policy?',
    answer: 'We offer a 30-day money-back guarantee for all new subscriptions. If you are not satisfied, contact our support team within 30 days of purchase for a full refund.',
    category: 'Billing',
    tags: ['refund', 'policy', 'money-back'],
    status: 'active',
    createdAt: 'Mar 10, 2026',
    updatedAt: 'Mar 15, 2026',
  },
  {
    id: '6',
    question: 'How do I integrate the API?',
    answer: 'Our REST API uses standard HTTP methods. Authentication is done via API keys. Check our documentation at docs.example.com/api for detailed integration guides and code examples.',
    category: 'Technical',
    tags: ['api', 'integration', 'developer'],
    status: 'active',
    createdAt: 'Mar 8, 2026',
    updatedAt: 'Mar 12, 2026',
  },
  {
    id: '7',
    question: 'Do you offer a free trial?',
    answer: 'Yes! We offer a 14-day free trial with full access to all Pro features. No credit card required to start.',
    category: 'Sales',
    tags: ['trial', 'free', 'pricing'],
    status: 'inactive',
    createdAt: 'Mar 5, 2026',
    updatedAt: 'Mar 10, 2026',
  },
  {
    id: '8',
    question: 'How can I contact support?',
    answer: 'You can reach our support team via email at support@example.com, through live chat on our website, or by calling 1-800-EXAMPLE during business hours.',
    category: 'Support',
    tags: ['contact', 'support', 'help'],
    status: 'active',
    createdAt: 'Mar 3, 2026',
    updatedAt: 'Mar 8, 2026',
  },
  {
    id: '9',
    question: 'What are the system requirements?',
    answer: 'Our platform is web-based and works on all modern browsers (Chrome, Firefox, Safari, Edge). For the desktop app, you need Windows 10+ or macOS 10.14+.',
    category: 'Technical',
    tags: ['requirements', 'system', 'browser'],
    status: 'active',
    createdAt: 'Mar 1, 2026',
    updatedAt: 'Mar 5, 2026',
  },
  {
    id: '10',
    question: 'Can I export my data?',
    answer: 'Yes, you can export all your data in CSV or JSON format. Go to Settings > Data > Export to download your data. This includes all your conversations, documents, and settings.',
    category: 'General',
    tags: ['export', 'data', 'backup'],
    status: 'active',
    createdAt: 'Feb 28, 2026',
    updatedAt: 'Mar 3, 2026',
  },
];

const categories = ['All', 'General', 'Product', 'Support', 'Billing', 'Technical', 'Sales'];

export default function QAManagementPage() {
  const [qaPairs, setQaPairs] = useState<QAPair[]>(mockQAPairs);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQA, setEditingQA] = useState<QAPair | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const itemsPerPage = 5;

  // Filtered and paginated data
  const filteredQA = useMemo(() => {
    return qaPairs.filter((qa) => {
      const matchesSearch =
        qa.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        qa.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        qa.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'All' || qa.category === selectedCategory;
      const matchesStatus = statusFilter === 'all' || qa.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [qaPairs, searchQuery, selectedCategory, statusFilter]);

  const paginatedQA = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredQA.slice(start, start + itemsPerPage);
  }, [filteredQA, currentPage]);

  const totalPages = Math.ceil(filteredQA.length / itemsPerPage);

  const stats = useMemo(() => ({
    total: qaPairs.length,
    active: qaPairs.filter((qa) => qa.status === 'active').length,
    inactive: qaPairs.filter((qa) => qa.status === 'inactive').length,
  }), [qaPairs]);

  const handleOpenModal = useCallback((qa?: QAPair) => {
    setEditingQA(qa || null);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingQA(null);
  }, []);

  const handleSaveQA = useCallback((data: Omit<QAPair, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSaving(true);

    // Simulate save
    setTimeout(() => {
      if (editingQA) {
        setQaPairs((prev) =>
          prev.map((qa) =>
            qa.id === editingQA.id
              ? { ...qa, ...data, updatedAt: 'Mar 27, 2026' }
              : qa
          )
        );
      } else {
        const newQA: QAPair = {
          ...data,
          id: `qa-${Date.now()}`,
          createdAt: 'Mar 27, 2026',
          updatedAt: 'Mar 27, 2026',
        };
        setQaPairs((prev) => [newQA, ...prev]);
      }
      setIsSaving(false);
      handleCloseModal();
    }, 1000);
  }, [editingQA, handleCloseModal]);

  const handleDeleteQA = useCallback((id: string) => {
    if (window.confirm('Are you sure you want to delete this Q&A pair?')) {
      setQaPairs((prev) => prev.filter((qa) => qa.id !== id));
    }
  }, []);

  const handleToggleStatus = useCallback((id: string) => {
    setQaPairs((prev) =>
      prev.map((qa) =>
        qa.id === id
          ? { ...qa, status: qa.status === 'active' ? 'inactive' : 'active', updatedAt: 'Mar 27, 2026' }
          : qa
      )
    );
  }, []);

  const handleBulkImport = useCallback(() => {
    // Simulate bulk import - in production, this would open a file picker
    alert('CSV import feature coming soon! This would allow you to upload a CSV file with Q&A pairs.');
  }, []);

  // Reset to first page when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: 'all' | 'active' | 'inactive') => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Q&A Management</h1>
          <p className="text-[#6E6E73] mt-1">
            Create and manage question-answer pairs for your chatbot
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleBulkImport}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import CSV
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Q&A
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard variant="subtle" padding="md" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#5B5EFF]/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-[#5B5EFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[12px] text-[#6E6E73]">Total Q&A Pairs</p>
            <p className="text-[20px] font-semibold text-[#1D1D1F]">{stats.total}</p>
          </div>
        </GlassCard>

        <GlassCard variant="subtle" padding="md" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#34C759]/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-[#34C759]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[12px] text-[#6E6E73]">Active</p>
            <p className="text-[20px] font-semibold text-[#1D1D1F]">{stats.active}</p>
          </div>
        </GlassCard>

        <GlassCard variant="subtle" padding="md" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#6E6E73]/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-[#6E6E73]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div>
            <p className="text-[12px] text-[#6E6E73]">Inactive</p>
            <p className="text-[20px] font-semibold text-[#1D1D1F]">{stats.inactive}</p>
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard variant="subtle" padding="md">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
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
              placeholder="Search questions, answers, or tags..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-11"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[#6E6E73] whitespace-nowrap">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="h-10 px-3 rounded-xl border border-black/[0.08] bg-white text-[14px] text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#5B5EFF]/20 focus:border-[#5B5EFF]/30"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[#6E6E73] whitespace-nowrap">Status:</span>
            <div className="flex gap-1 p-1 rounded-lg bg-[#F5F5F7]">
              {[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusFilterChange(option.value as 'all' | 'active' | 'inactive')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200',
                    statusFilter === option.value
                      ? 'bg-white text-[#1D1D1F] shadow-sm'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[#6E6E73]">
          Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredQA.length)} of {filteredQA.length} results
        </p>
      </div>

      {/* Q&A Table */}
      <GlassCard variant="default" padding="md">
        <QATable
          qaPairs={paginatedQA}
          isLoading={false}
          onEdit={(id) => {
            const qa = qaPairs.find((q) => q.id === id);
            if (qa) handleOpenModal(qa);
          }}
          onDelete={handleDeleteQA}
          onToggleStatus={handleToggleStatus}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-black/[0.04]">
            <p className="text-[13px] text-[#6E6E73]">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-[13px] font-medium transition-all duration-200',
                      currentPage === page
                        ? 'bg-[#5B5EFF] text-white'
                        : 'text-[#6E6E73] hover:bg-[#F5F5F7]'
                    )}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Modal */}
      <QAModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveQA}
        editData={editingQA}
        isLoading={isSaving}
      />
    </div>
  );
}
