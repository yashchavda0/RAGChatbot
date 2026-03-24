'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/hooks/useChat';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { Card } from '@/components/ui/card';

export default function ChatPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState('default');

  const {
    messages,
    agentExecutions,
    isLoading,
    sendMessage,
    clearMessages,
  } = useChat(sessionId);

  // Generate session ID on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('chat_session_id');
    if (savedSession) {
      setSessionId(savedSession);
    } else {
      const newSession = crypto.randomUUID();
      localStorage.setItem('chat_session_id', newSession);
      setSessionId(newSession);
    }
  }, []);

  const handleSendMessage = async (content: string) => {
    await sendMessage(content);
  };

  const handleClearChat = () => {
    clearMessages();
  };

  const handleNewSession = () => {
    const newSession = crypto.randomUUID();
    localStorage.setItem('chat_session_id', newSession);
    setSessionId(newSession);
    clearMessages();
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="md:hidden">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h1 className="font-semibold">Chat</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              disabled={messages.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewSession}
            >
              New Session
            </Button>
            <Link href="/agents">
              <Button variant="outline" size="sm">
                View Agents
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <MessageList
          messages={messages}
          agentExecutions={agentExecutions}
          isLoading={isLoading}
        />
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}
