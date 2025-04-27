import { vi, expect } from 'vitest';
import * as React from 'react';

// Custom matchers
expect.extend({
  toBeInTheDocument(received) {
    const pass = received !== null && received !== undefined;
    return {
      pass,
      message: () => `expected ${received} ${pass ? 'not to be' : 'to be'} in the document`,
    };
  },
  toHaveClass(received, className) {
    const pass = received?.className?.includes(className);
    return {
      pass,
      message: () => `expected ${received} ${pass ? 'not to have' : 'to have'} class "${className}"`,
    };
  },
  toHaveValue(received, value) {
    const pass = (received as HTMLInputElement).value === value;
    return {
      pass,
      message: () => `expected ${received} ${pass ? 'not to have' : 'to have'} value "${value}"`,
    };
  }
});

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  redirect: vi.fn(),
}));

// Suppress console warnings during tests
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' && 
    (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
     args[0].includes('Warning: React.createFactory is deprecated') ||
     args[0].includes('Warning: Using UNSAFE_'))
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Set up React for JSX
global.React = React;

// Global test configuration 