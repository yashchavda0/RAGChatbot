'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/shared/TopBar';
import { useAuthStore } from '@/stores/authStore';

// Protects all routes under the (auth) route group.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // Wait for zustand persist to rehydrate from localStorage before
    // deciding — otherwise a logged-in user gets bounced on refresh.
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F7]">
      <TopBar />
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
