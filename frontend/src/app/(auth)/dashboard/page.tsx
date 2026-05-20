'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/shared/GlassCard';
import { ChatbotCard } from '@/components/dashboard/ChatbotCard';
import { CreateChatbotModal } from '@/components/dashboard/CreateChatbotModal';
import type { ChatbotListItem } from '@/types/chatbot';

// Mock data for development
const mockChatbots: ChatbotListItem[] = [
  {
    id: '1',
    name: 'Customer Support Bot',
    description: 'AI-powered assistant for handling customer inquiries and support tickets',
    status: 'live',
    conversationCount: 12847,
    lastActiveAt: '2024-01-15T12:30:00Z',
    createdAt: '2023-10-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Sales Assistant',
    description: 'Helps qualify leads and answer product questions',
    status: 'live',
    conversationCount: 4523,
    lastActiveAt: '2024-01-15T11:45:00Z',
    createdAt: '2023-11-15T00:00:00Z',
  },
  {
    id: '3',
    name: 'Documentation Helper',
    description: 'Guides users through our API documentation and examples',
    status: 'draft',
    conversationCount: 0,
    lastActiveAt: undefined,
    createdAt: '2024-01-10T00:00:00Z',
  },
  {
    id: '4',
    name: 'HR Assistant',
    description: 'Answers employee questions about policies and benefits',
    status: 'inactive',
    conversationCount: 892,
    lastActiveAt: '2023-12-20T14:00:00Z',
    createdAt: '2023-09-01T00:00:00Z',
  },
];

export default function DashboardPage() {
  const [chatbots, setChatbots] = useState<ChatbotListItem[]>(mockChatbots);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'draft' | 'inactive'>('all');

  const filteredChatbots = chatbots.filter((chatbot) => {
    const matchesSearch =
      chatbot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chatbot.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || chatbot.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateChatbot = async (data: { name: string; description: string }) => {
    setIsCreating(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newChatbot: ChatbotListItem = {
      id: String(Date.now()),
      name: data.name,
      description: data.description,
      status: 'draft',
      conversationCount: 0,
      lastActiveAt: undefined,
      createdAt: new Date().toISOString(),
    };

    setChatbots([newChatbot, ...chatbots]);
    setIsCreating(false);
    setIsCreateModalOpen(false);
  };

  const stats = {
    total: chatbots.length,
    live: chatbots.filter((c) => c.status === 'live').length,
    draft: chatbots.filter((c) => c.status === 'draft').length,
    inactive: chatbots.filter((c) => c.status === 'inactive').length,
    totalConversations: chatbots.reduce((sum, c) => sum + c.conversationCount, 0),
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1D1D1F]">Your Chatbots</h1>
            <p className="text-[#86868B] mt-1">
              Manage and monitor your AI assistants
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#5B5EFF] to-[#8B7FFF] hover:from-[#3D3DD9] hover:to-[#5B5EFF] transition-all shadow-lg shadow-[#5B5EFF]/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Chatbot
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <GlassCard padding="sm" className="text-center">
            <p className="text-2xl font-bold text-[#1D1D1F]">{stats.total}</p>
            <p className="text-sm text-[#86868B]">Total Chatbots</p>
          </GlassCard>
          <GlassCard padding="sm" className="text-center">
            <p className="text-2xl font-bold text-[#34C759]">{stats.live}</p>
            <p className="text-sm text-[#86868B]">Live</p>
          </GlassCard>
          <GlassCard padding="sm" className="text-center">
            <p className="text-2xl font-bold text-[#FF9500]">{stats.draft}</p>
            <p className="text-sm text-[#86868B]">Drafts</p>
          </GlassCard>
          <GlassCard padding="sm" className="text-center">
            <p className="text-2xl font-bold text-[#5B5EFF]">
              {stats.totalConversations.toLocaleString()}
            </p>
            <p className="text-sm text-[#86868B]">Conversations</p>
          </GlassCard>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search chatbots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#E5E5EA] bg-white/50 text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#5B5EFF]/20 focus:border-[#5B5EFF] transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-white/50 border border-[#E5E5EA]">
            {(['all', 'live', 'draft', 'inactive'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-white text-[#1D1D1F] shadow-sm'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Chatbots Grid */}
        {filteredChatbots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredChatbots.map((chatbot) => (
              <ChatbotCard key={chatbot.id} chatbot={chatbot} />
            ))}
          </div>
        ) : (
          <GlassCard className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#5B5EFF]/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-[#5B5EFF]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">No chatbots found</h3>
            <p className="text-[#86868B] mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first chatbot to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#5B5EFF] to-[#8B7FFF] hover:from-[#3D3DD9] hover:to-[#5B5EFF] transition-all"
              >
                Create Your First Chatbot
              </button>
            )}
          </GlassCard>
        )}
      </div>

      {/* Create Modal */}
      <CreateChatbotModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateChatbot}
        isLoading={isCreating}
      />
    </div>
  );
}
