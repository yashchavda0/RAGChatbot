'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

export function TopBar() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  return (
    <header className="h-12 bg-white border-b border-black/[0.06] flex items-center justify-between px-6 flex-shrink-0">
      {/* Left - App name */}
      <Link href="/dashboard" className="text-sm font-semibold text-[#1D1D1F] hover:text-[#5B5EFF] transition-colors">
        RAGChatbot
      </Link>

      {/* Right - Notifications & User Menu */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-[#F5F5F7] transition-colors">
          <svg className="w-5 h-5 text-[#86868B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF3B30] rounded-full" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-[#F5F5F7] transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#5B5EFF] to-[#8B7FFF] flex items-center justify-center">
              <span className="text-xs font-medium text-white">{initials}</span>
            </div>
            <svg
              className={cn('w-3.5 h-3.5 text-[#86868B] transition-transform', showUserMenu && 'rotate-180')}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-lg border border-[#E5E5EA] z-50 overflow-hidden">
                <div className="p-3 border-b border-[#E5E5EA]">
                  <p className="font-medium text-[#1D1D1F]">{user?.name || 'Account'}</p>
                  <p className="text-sm text-[#86868B]">{user?.email || ''}</p>
                </div>
                <div className="p-2">
                  <Link
                    href="/account"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F5F5F7] transition-colors"
                  >
                    <svg className="w-4 h-4 text-[#86868B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span className="text-sm text-[#1D1D1F]">Account Settings</span>
                  </Link>
                  <Link
                    href="/account/billing"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F5F5F7] transition-colors"
                  >
                    <svg className="w-4 h-4 text-[#86868B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    <span className="text-sm text-[#1D1D1F]">Billing</span>
                  </Link>
                  <Link
                    href="/account/api-keys"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F5F5F7] transition-colors"
                  >
                    <svg className="w-4 h-4 text-[#86868B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                    <span className="text-sm text-[#1D1D1F]">API Keys</span>
                  </Link>
                </div>
                <div className="p-2 border-t border-[#E5E5EA]">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2 w-full rounded-lg hover:bg-[#FF3B30]/5 transition-colors text-left"
                  >
                    <svg className="w-4 h-4 text-[#FF3B30]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span className="text-sm text-[#FF3B30]">Log out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
