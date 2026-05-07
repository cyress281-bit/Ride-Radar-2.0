import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { listProfilesByIds } from '@/lib/profileLookup';
import { normalizeProfiles } from '@/lib/supabaseNormalizer';

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

  // Create stable cache key by sorting IDs (spread to avoid mutation)
  const cacheKey = useMemo(
    () => [...uniqueIds].sort().join(','),
    [uniqueIds]
  );

  const { data: rawProfiles = [], isLoading } = useQuery({
    queryKey: ['profile-batch', cacheKey],
    enabled: uniqueIds.length > 0,
    queryFn: () => listProfilesByIds(uniqueIds),
    staleTime: 120000, // 2 minutes - profiles don't change frequently
  });

  // CRITICAL FIX: Normalize snake_case fields to camelCase for compatibility
  const profiles = useMemo(() => normalizeProfiles(rawProfiles), [rawProfiles]);

  // Create a Map for O(1) lookup performance
  // CRITICAL FIX: Map by user_id (not p.id) since callers pass user UUIDs
  const profileMap = useMemo(
    () => {
      const map = new Map();
      profiles.forEach((p) => {
        if (p.user_id) map.set(p.user_id, p);
      });
      return map;
    },
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
