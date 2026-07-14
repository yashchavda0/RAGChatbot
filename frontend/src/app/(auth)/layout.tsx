'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/shared/TopBar';

// This layout protects all routes under (auth) group
// In production, this would check for valid authentication tokens
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Check for authentication
    // In production, verify JWT token or session
    const isAuthenticated = checkAuth();

    if (!isAuthenticated) {
      // For demo purposes, we'll allow access
      // In production, uncomment: router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F7]">
      <TopBar />
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

// Mock auth check - replace with actual implementation
function checkAuth(): boolean {
  // Check for token in localStorage or cookies
  // Return true for demo purposes
  return true;
}
