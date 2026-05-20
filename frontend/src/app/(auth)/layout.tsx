'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

  return <>{children}</>;
}

// Mock auth check - replace with actual implementation
function checkAuth(): boolean {
  // Check for token in localStorage or cookies
  // Return true for demo purposes
  return true;
}
