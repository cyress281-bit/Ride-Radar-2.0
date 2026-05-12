/**
 * Batch profile fetching with caching.
 * Moved from profile feature to shared hooks because it's used by
 * chat, broadcast, and notifications features.
 *
 * Splits large ID lists into chunks to stay within Supabase limits
 * and returns a Map for O(1) lookup by user_id.
 */

import { useMemo, useCallback, useRef } from 'react';
import { useQueries } from '@tanstack/react-query';
import { listProfilesByIds } from '@/features/profile/api/profile-api';

const CHUNK_SIZE = 50;

/**
 * Fetch multiple profiles in batched parallel queries.
 * @param {string[]} userIds
 * @returns {{ profiles: Map<string, object>, isLoading: boolean }}
 */
export function useProfileBatch(userIds) {
  const uniqueIds = useMemo(
    () => Array.from(new Set(userIds.filter((id) => typeof id === 'string' && id.length > 0))),
    [userIds]
  );

  const chunks = useMemo(() => {
    const out = [];
    for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
      out.push(uniqueIds.slice(i, i + CHUNK_SIZE));
    }
    return out;
  }, [uniqueIds]);

  const results = useQueries({
    queries: chunks.map((chunk) => ({
      // Serialize chunk to a stable string key to avoid reference-based cache misses
      queryKey: ['profile-batch', chunk.sort().join(',')],
      queryFn: async () => {
        const { data, error } = await listProfilesByIds(chunk);
        if (error) throw error;
        return data;
      },
      enabled: chunk.length > 0,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);

  // Use a ref to keep getProfile stable across renders.
  // This prevents consumers (e.g. LiveMap custom memo) from seeing
  // a new function reference on every chunk load.
  const profilesRef = useRef(new Map());

  const profiles = useMemo(() => {
    const map = new Map();
    for (const result of results) {
      if (result.data) {
        for (const profile of result.data) {
          if (profile?.user_id) {
            map.set(profile.user_id, profile);
          }
        }
      }
    }
    profilesRef.current = map;
    return map;
  }, [results]);

  const getProfile = useCallback(
    (userId) => profilesRef.current.get(userId) || null,
    []
  );

  return { profiles, isLoading, getProfile };
}
