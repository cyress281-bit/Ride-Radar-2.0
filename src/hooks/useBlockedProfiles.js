import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMyProfile } from '@/lib/useCurrentUser';
import { useMemo } from 'react';

/**
 * Shared hook for fetching and checking blocked profiles for the current user.
 * Eliminates duplicate UserBlock queries across 5+ files.
 *
 * Returns:
 * - blocks: Array of UserBlock entities
 * - blockedIds: Set of blocked profile IDs for quick lookups
 * - isBlocked: Function to check if a profile ID is blocked
 * - isLoading: Loading state
 */
export function useBlockedProfiles() {
  const { data: profile } = useMyProfile();

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['user-blocks', profile?.id],
    enabled: !!profile,
    queryFn: () => base44.entities.UserBlock.filter({ blockerProfileId: profile.id }),
    staleTime: 60000, // Cache for 1 minute - blocks don't change frequently
  });

  const blockedIds = useMemo(
    () => new Set(blocks.map((block) => block.blockedProfileId)),
    [blocks]
  );

  const isBlocked = useMemo(
    () => (profileId) => blockedIds.has(profileId),
    [blockedIds]
  );

  return {
    blocks,
    blockedIds,
    isBlocked,
    isLoading,
  };
}
