/**
 * @fileoverview Admin role hook for Ride Radar 2.0.
 *
 * Queries `public.users` to determine if the current user has `role = 'admin'`.
 * Uses TanStack Query with a 5-minute stale time.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase.js';
import { useSupabaseAuth } from './use-auth.js';
import { logger } from '@/lib/logger.js';

/**
 * Determine whether the current user is an admin.
 * @returns {{ isAdmin: boolean, isLoading: boolean, error: Error|null, role: string|null }}
 */
export function useAdminRole() {
  const { user, isAuthenticated } = useSupabaseAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: userData, error: queryError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (queryError) {
        logger.error('[useAdminRole] Error fetching user role:', queryError);
        throw queryError;
      }

      return userData;
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    isAdmin: data?.role === 'admin',
    isLoading,
    error,
    role: data?.role ?? null,
  };
}
