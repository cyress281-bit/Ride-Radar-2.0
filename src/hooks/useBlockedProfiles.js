import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { useMemo } from 'react';

/**
 * Shared hook for fetching and checking blocked profiles for the current user.
 * Eliminates duplicate UserBlock queries across 5+ files.
 *
 * Now using Supabase instead of Base44!
 *
 * Returns:
 * - blocks: Array of user_blocks records
 * - blockedIds: Set of blocked profile IDs for quick lookups
 * - isBlocked: Function to check if a profile ID is blocked
 * - isLoading: Loading state
 */
export function useBlockedProfiles() {
  const { user } = useSupabaseAuth();

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['user-blocks', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('blocker_user_id', user.id);

      if (error) throw error;
      return data || [];
    },
    staleTime: 60000, // Cache for 1 minute - blocks don't change frequently
  });

  const blockedIds = useMemo(
    () => new Set(blocks.map((block) => block.blocked_user_id)),
    [blocks]
  );

  const isBlocked = useMemo(
    () => (userId) => blockedIds.has(userId),
    [blockedIds]
  );

  return {
    blocks,
    blockedIds,
    isBlocked,
    isLoading,
  };
}
