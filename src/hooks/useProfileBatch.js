import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { listProfilesByIds } from '@/lib/profileLookup';

/**
 * Efficient hook for fetching multiple profiles at once with caching.
 * Eliminates duplicate profile lookup patterns across Home, Messages, and Notifications.
 *
 * @param {Array<string>} ids - Array of profile IDs to fetch
 * @returns {Object} - { profiles, getProfile, profileMap, isLoading }
 *
 * Usage:
 *   const authorIds = broadcasts.map(b => b.authorId);
 *   const { getProfile } = useProfileBatch(authorIds);
 *   const author = getProfile(broadcast.authorId);
 */
export function useProfileBatch(ids) {
  // Deduplicate and filter out null/undefined IDs
  const uniqueIds = useMemo(
    () => Array.from(new Set((ids || []).filter(Boolean))),
    [ids]
  );

  // Create stable cache key by sorting IDs
  const cacheKey = useMemo(
    () => uniqueIds.sort().join(','),
    [uniqueIds]
  );

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profile-batch', cacheKey],
    enabled: uniqueIds.length > 0,
    queryFn: () => listProfilesByIds(uniqueIds),
    staleTime: 120000, // 2 minutes - profiles don't change frequently
  });

  // Create a Map for O(1) lookup performance
  const profileMap = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  // Convenience getter function
  const getProfile = useMemo(
    () => (id) => profileMap.get(id),
    [profileMap]
  );

  return {
    profiles,
    getProfile,
    profileMap,
    isLoading: uniqueIds.length > 0 && profiles.length === 0,
  };
}
