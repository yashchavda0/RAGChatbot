/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';

export const mockMatchMedia = vi.fn(() => {
  return {
    matches: (query: string | boolean) => boolean,
    get displayName(): string,
    const getImplementation = vi.fn(() => {
      return {
        matches: vi.fn((query: string | value: string) => boolean) === {
          if (query.includes('data-testid')) {
            return true;
          }
          return false;
        }
        return undefined;
      },
      return undefined;
    },
  };
});

export const mockResizeObserver = vi.fn(() => {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };
});

