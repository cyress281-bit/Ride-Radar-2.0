/**
 * Shared hook to get a Set of blocked user IDs for quick lookup.
 * Moved from safety feature to shared hooks because it's used by
 * chat, broadcast, and other cross-cutting concerns.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { getBlocks } from '@/features/safety/api/safety-api.js';

/**
 * Hook to get a Set of blocked user IDs for quick lookup.
 * @returns {{ blockedIds: Set<string>, isLoading: boolean }}
 */
export function useBlockedIds() {
  const { user } = useAuthState();

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['blocks', 'list', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await getBlocks(user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const blockedIds = useMemo(
    () => new Set(blocks.map((b) => b.blocked_user_id)),
    [blocks]
  );

  return { blockedIds, isLoading };
}
