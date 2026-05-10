import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '../lib/query-client';
import { AuthProvider } from '../features/auth/components/AuthProvider';
import { Toaster } from 'sonner';

/**
 * AppProviders - Composition root wrapping all top-level providers.
 *
 * Layers:
 * 1. QueryClientProvider - TanStack Query cache and defaults
 * 2. AuthProvider - Authentication state and session management
 * 3. Toaster - Toast notification surface (sonner)
 *
 * @param {{ children: React.ReactNode }} props
 */
export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
}
