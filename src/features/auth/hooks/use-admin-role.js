/**
 * @fileoverview Admin role hook for Ride Radar 2.0.
 *
 * Queries `public.users` to determine if the current user has `role = 'admin'`.
 * Uses TanStack Query with a 5-minute stale time.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase.js';
import { useAuthState } from './use-auth.js';
import { logger } from '@/lib/logger.js';

/**
 * Determine whether the current user is an admin.
 * @returns {{ isAdmin: boolean, isLoading: boolean, error: Error|null, role: string|null }}
 */
export function useAdminRole() {
  const { user, isAuthenticated } = useAuthState();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin');

      if (rpcError) {
        logger.error('[useAdminRole] Error fetching admin role:', rpcError);
        throw rpcError;
      }

      return { role: isAdmin ? 'admin' : null };
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return useMemo(
    () => ({
      isAdmin: data?.role === 'admin',
      isLoading,
      error,
      role: data?.role ?? null,
    }),
    [data?.role, isLoading, error]
  );
}
