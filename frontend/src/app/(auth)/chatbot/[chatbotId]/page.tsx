'use client';

import { redirect } from 'next/navigation';

// This page redirects to analytics by default when visiting /chatbot/[id]
export default function ChatbotOverviewPage({
  params,
}: {
  params: { chatbotId: string };
}) {
  const { chatbotId } = params;

  // Redirect to analytics page
  redirect(`/chatbot/${chatbotId}/analytics`);
}
