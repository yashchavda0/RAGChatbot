'use client';

import { redirect } from 'next/navigation';
import { use } from 'react';

// This page redirects to analytics by default when visiting /chatbot/[id]
export default function ChatbotOverviewPage({
  params,
}: {
  params: Promise<{ chatbotId: string }>;
}) {
  const { chatbotId } = use(params);

  // Redirect to analytics page
  redirect(`/chatbot/${chatbotId}/analytics`);
}
