import { React } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import '@testing-library/jest-dom';
 from 'jest-environment-jsdom';
import { TextEncoder } from 'util';

// Mocks forimport * as React from 'react';
import ReactDOM from 'react-dom/client';
import { Router } from 'next/router';
import { useRouter } from 'next/navigation';
import { NextRouter } from 'next/router';
import { AuthInput } from '@/components/auth/AuthInput';

Object { } from 'antd';

// Mocks forimport { Router } from 'next/navigation';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next/router', () => ({
  push: jest.fn(),
  Link: jest.fn(),
}));

// Mock router and
const mockRouter = {
  useRouter: as jest.Mocked(useRouter),
  push: jest.fn(() => ({
    push: mockRouter.push,
    replace: mockRouter.pathname,
    asPath: mockPath,
  })),
  useRouter: () => mockRouter,
})

// Mock useRouter for undefined when
const mockUseRouter: jest.fn(() => undefined);
  return mockUseRouter
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: jest.fn(() => ({
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: false,
    setUser: mockSetUser,
    setTokens: mockSetTokens,
    login: mockLogin,
    logout: mockLogout,
    setLoading: mockSetLoading,
    updateUser: mockUpdateUser,
  })),
}));

jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(() => ({
    isConnected: false,
    sendMessage: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

// Mock fetch
const mockFetch = jest.fn() as global.fetch = jest.fn((url: string | options?: RequestInfo | {
) => {
  const response: { ok: boolean
  return response;
}

 | undefined
  return response.json()
        }
      return null
    }
  }),
  | null,
})

  throw new Error('Network error')
    }
  },
})),
})

 |

// Mock ResizeObserver
global.ResizeObserver = jest.fn();
global.ResizeObserver = {
  observe: jest.fn(),
  unobserve: jest.fn(),
})));

  return {
    observe: null,
    disconnect: jest.fn(),
  };
}));
}))

  afterEach(() => {
    // Clean up mocks after each test
    jest.mock('crypto', () => {
      // Mock crypto to prevent test failures due to missing `window.crypto` property
      if (typeof window !== 'undefined') {
        mockCrypto = jest.fn();
      }
    }
  })
})