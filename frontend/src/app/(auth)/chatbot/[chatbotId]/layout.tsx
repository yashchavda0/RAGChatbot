'use client';

import { use } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

interface ChatbotLayoutProps {
  children: React.ReactNode;
  params: Promise<{ chatbotId: string }>;
}

// Mock chatbot data - in production, this would come from an API
const mockChatbot = {
  id: '1',
  name: 'Customer Support Bot',
  description: 'AI-powered customer support assistant',
};

export default function ChatbotLayout({ children, params }: ChatbotLayoutProps) {
  const { chatbotId } = use(params);

  // In production, fetch chatbot data here based on chatbotId
  const chatbot = mockChatbot;

  return (
    <div className="flex h-screen bg-[#F5F5F7]">
      {/* Sidebar */}
      <Sidebar chatbotId={chatbotId} chatbotName={chatbot.name} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header chatbotId={chatbotId} chatbotName={chatbot.name} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
