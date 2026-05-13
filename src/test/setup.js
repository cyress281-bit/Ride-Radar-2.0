import '@testing-library/jest-dom';

// Mock import.meta.env for tests
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      env: {
        DEV: true,
        PROD: false,
        VITE_SUPABASE_URL: 'https://test.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      },
    },
  },
  writable: true,
});

// Suppress console errors/warnings in tests unless explicitly needed
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    // Allow React Testing Library errors through
    if (typeof args[0] === 'string' && args[0].includes('ReactDOMTestUtils.act')) {
      originalError.apply(console, args);
      return;
    }
    // Silence other console errors in tests
  };
  console.warn = () => {};
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
