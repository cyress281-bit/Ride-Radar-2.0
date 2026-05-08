import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { logger } from '@/lib/logger';

/**
 * Hook to determine if the current user has admin privileges.
 *
 * Queries the `users` table for `role === 'admin'`.
 * Returns a stable object with `isAdmin`, loading/error states,
 * and a convenience `requireAdmin` flag for route guards.
 *
 * RLS considerations:
 * - The `users` table should allow users to SELECT their own row.
 * - The role column should NOT be updatable by the user themselves;
 *   only a service-role or another admin can promote/demote.
 *
 * @returns {{
 *   isAdmin: boolean,
 *   isLoading: boolean,
 *   error: Error | null,
 *   role: string | null
 * }}
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
    staleTime: 0, // Revalidate on mount so role changes take effect quickly.
    gcTime: 10 * 60 * 1000,
  });

  return {
    isAdmin: data?.role === 'admin',
    isLoading,
    error,
    role: data?.role ?? null,
  };
}
