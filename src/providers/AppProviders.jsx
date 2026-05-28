import React, { memo } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '../lib/query-client';
import { AuthProvider } from '../features/auth/components/AuthProvider';
import { ViewportProvider } from './ViewportProvider';
import { Toaster } from 'sonner';

/**
 * AppProviders - Composition root wrapping all top-level providers.
 */
export const AppProviders = memo(function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <ViewportProvider>
        <AuthProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </AuthProvider>
      </ViewportProvider>
    </QueryClientProvider>
  );
});
