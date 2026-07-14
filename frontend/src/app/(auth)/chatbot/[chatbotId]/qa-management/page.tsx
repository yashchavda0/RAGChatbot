'use client';

import { HelpCircle } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';

interface QAManagementPageProps {
  params: { chatbotId: string };
}

export default function QAManagementPage({ params }: QAManagementPageProps) {
  const { chatbotId } = params;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1D1D1F]">Q&A Management</h1>
        <p className="text-[#6E6E73] mt-1">
          Create and manage predefined question-answer pairs
        </p>
      </div>

      {/* Coming Soon Placeholder */}
      <GlassCard className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#5B5EFF]/10 flex items-center justify-center">
            <HelpCircle className="w-10 h-10 text-[#5B5EFF]" />
          </div>
          <h2 className="text-xl font-semibold text-[#1D1D1F] mb-3">
            Q&A Management Coming Soon
          </h2>
          <p className="text-[#6E6E73] mb-6">
            We're building a powerful Q&A management system. Soon you'll be able to
            create predefined question-answer pairs, organize them by category, and
            improve your chatbot's responses.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-[#86868B]">
            <span className="px-3 py-1.5 bg-[#F5F5F7] rounded-full">Create Q&A Pairs</span>
            <span className="px-3 py-1.5 bg-[#F5F5F7] rounded-full">Categories & Tags</span>
            <span className="px-3 py-1.5 bg-[#F5F5F7] rounded-full">Bulk Import</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
