'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { chatbotApi, ChatbotResponse } from '@/lib/api';

interface ChatbotLayoutProps {
  children: React.ReactNode;
  params: { chatbotId: string };
}

export default function ChatbotLayout({ children, params }: ChatbotLayoutProps) {
  const { chatbotId } = params;
  const router = useRouter();
  const [chatbot, setChatbot] = useState<ChatbotResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChatbot() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await chatbotApi.get(chatbotId);
        setChatbot(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chatbot not found');
      } finally {
        setIsLoading(false);
      }
    }
    fetchChatbot();
  }, [chatbotId]);

  if (isLoading) {
    return (
      <div className="flex h-full bg-[#F5F5F7]">
        <div className="w-64 bg-white/70 backdrop-blur-xl border-r border-black/[0.04] animate-pulse">
          <div className="p-4 space-y-4">
            <div className="h-8 bg-[#E5E5EA] rounded w-3/4" />
            <div className="h-4 bg-[#E5E5EA] rounded w-1/2" />
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="h-8 bg-[#E5E5EA] rounded w-1/4 mb-4" />
          <div className="h-64 bg-[#E5E5EA] rounded" />
        </div>
      </div>
    );
  }

  if (error || !chatbot) {
    return (
      <div className="flex h-full bg-[#F5F5F7] items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#FF3B30]/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-[#FF3B30]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[#1D1D1F] mb-3">Chatbot Not Found</h2>
          <p className="text-[#6E6E73] mb-6">{error || 'The chatbot you are looking for does not exist or has been deleted.'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#5B5EFF] to-[#8B7FFF] hover:from-[#3D3DD9] hover:to-[#5B5EFF] transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#F5F5F7]">
      {/* Sidebar */}
      <Sidebar chatbotId={chatbotId} chatbotName={chatbot.name} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 min-w-0">
        {children}
      </div>
    </div>
  );
}
