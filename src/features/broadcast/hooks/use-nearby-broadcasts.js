/**
 * Hook to fetch nearby broadcasts with real-time subscription
 * and smart cache updates.
 *
 * Features:
 * - Debounced invalidation on INSERT
 * - In-place patch on UPDATE (when only content changed)
 * - Removal on expiry/status change
 * - Offline fallback from localStorage snapshot
 */

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase.js';
import { getNearbyBroadcasts } from '@/features/broadcast/api/broadcast-api.js';
import { logger } from '@/lib/logger.js';

const OFFLINE_SNAPSHOT_KEY = 'rr:radar-offline-snapshot';
const OFFLINE_SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function readOfflineSnapshot() {
  try {
    const raw = window.localStorage.getItem(OFFLINE_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Number.isFinite(Number(parsed.cachedAt)) || Date.now() - Number(parsed.cachedAt) > OFFLINE_SNAPSHOT_MAX_AGE_MS) {
      return null;
    }
    return { broadcasts: Array.isArray(parsed.broadcasts) ? parsed.broadcasts : [], cachedAt: Number(parsed.cachedAt) };
  } catch {
    return null;
  }
}

export function cacheOfflineSnapshot(broadcasts) {
  try {
    window.localStorage.setItem(
      OFFLINE_SNAPSHOT_KEY,
      JSON.stringify({ broadcasts: broadcasts.slice(0, 100), cachedAt: Date.now() })
    );
  } catch {
    // Storage may be full
  }
}

/**
 * Hook to fetch nearby broadcasts with real-time updates.
 *
 * @param {number|null} lat
 * @param {number|null} lng
 * @param {number} [radiusMiles=50]
 */
export function useNearbyBroadcasts(lat, lng, radiusMiles = 50) {
  const queryClient = useQueryClient();
  const invalidateTimerRef = useRef(null);
  const hasCoordinates = lat != null && lng != null;
  // Round coordinates to avoid cache fragmentation from GPS jitter
  const roundedLat = lat != null ? Math.round(lat * 1000) / 1000 : null;
  const roundedLng = lng != null ? Math.round(lng * 1000) / 1000 : null;
  const nearbyQueryKey = ['broadcasts', 'nearby', roundedLat, roundedLng, radiusMiles];

  const query = useQuery({
    queryKey: nearbyQueryKey,
    queryFn: async () => {
      if (!hasCoordinates) return [];
      const { data, error } = await getNearbyBroadcasts(lat, lng, radiusMiles, 100);
      if (error) {
        logger.error('[useNearbyBroadcasts] Error:', error);
        throw error;
      }
      return data || [];
    },
    enabled: hasCoordinates,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: () => {
      const snapshot = readOfflineSnapshot();
      return snapshot?.broadcasts || [];
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!hasCoordinates) return;

    const debouncedInvalidate = () => {
      if (invalidateTimerRef.current) clearTimeout(invalidateTimerRef.current);
      invalidateTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['broadcasts', 'nearby'] });
      }, 2000);
    };

    const channel = supabase
      .channel('broadcasts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'broadcasts' },
        () => {
          logger.debug('[useNearbyBroadcasts] New broadcast received');
          debouncedInvalidate();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'broadcasts' },
        (payload) => {
          const updated = payload.new;
          const previous = payload.old || {};
          logger.debug('[useNearbyBroadcasts] Broadcast updated');

          if (
            updated.status !== 'active' ||
            (updated.expires_at && new Date(updated.expires_at) < new Date())
          ) {
            queryClient.setQueryData(
              nearbyQueryKey,
              (old = []) => old.filter((b) => b.id !== updated.id)
            );
            return;
          }

          const locationChanged =
            previous.frozen_lat !== updated.frozen_lat ||
            previous.frozen_lng !== updated.frozen_lng ||
            previous.lat !== updated.lat ||
            previous.lng !== updated.lng;
          const statusChanged = previous.status !== updated.status;
          const expiryChanged = previous.expires_at !== updated.expires_at;

          if (locationChanged || statusChanged || expiryChanged) {
            debouncedInvalidate();
            return;
          }

          queryClient.setQueryData(
            nearbyQueryKey,
            (old = []) => old.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
          );
        }
      )
      .subscribe();

    return () => {
      if (invalidateTimerRef.current) clearTimeout(invalidateTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [hasCoordinates, lat, lng, radiusMiles, queryClient]);

  return query;
}
