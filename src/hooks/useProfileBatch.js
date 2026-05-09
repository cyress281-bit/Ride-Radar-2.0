import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { listProfilesByIds } from '@/lib/profileLookup';

/**
 * Efficient hook for fetching multiple profiles at once with caching.
 * Eliminates duplicate profile lookup patterns across Home, Messages, and Notifications.
 *
 * @param {Array<string>} ids - Array of profile IDs to fetch
 * @returns {Object} - { profiles, getProfile, profileMap, isLoading }
 */
export function useProfileBatch(ids) {
  const uniqueIds = useMemo(
    () => Array.from(new Set((ids || []).filter(Boolean))),
    [ids]
  );

  const cacheKey = useMemo(
    () => [...uniqueIds].sort().join(','),
    [uniqueIds]
  );

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profile-batch', cacheKey],
    enabled: uniqueIds.length > 0,
    queryFn: () => listProfilesByIds(uniqueIds),
    staleTime: 120000,
  });

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
