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

import { useEffect, useRef, useId, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase.js';
import { getNearbyBroadcasts } from '@/features/broadcast/api/broadcast-api.js';
import { logger } from '@/lib/logger.js';
import { captureError } from '@/lib/sentry.js';
import {
  markRealtimeSurfaceSubscribed,
  markRealtimeSurfaceReconnecting,
  markRealtimeSurfaceError,
} from '@/lib/realtimeHealthRegistry.js';

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

// Read once at module init to avoid parsing localStorage on every render
const initialOfflineSnapshot = readOfflineSnapshot();


/**
 * Hook to fetch nearby broadcasts with real-time updates.
 *
 * @param {number|null} lat
 * @param {number|null} lng
 * @param {number} [radiusMiles=50]
 */
export function useNearbyBroadcasts(lat, lng, radiusMiles = 50, blockedUserIds = []) {
  const queryClient = useQueryClient();
  const invalidateTimerRef = useRef(null);
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const hasCoordinates = lat != null && lng != null;
  // Round coordinates to avoid cache fragmentation from GPS jitter
  const roundedLat = lat != null ? Math.round(lat * 1000) / 1000 : null;
  const roundedLng = lng != null ? Math.round(lng * 1000) / 1000 : null;
  const nearbyQueryKey = useMemo(
    () => ['broadcasts', 'nearby', roundedLat, roundedLng, radiusMiles, blockedUserIds],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roundedLat, roundedLng, radiusMiles, JSON.stringify(blockedUserIds)]
  );
  // Keep a ref so the realtime UPDATE handler always targets the current key
  // without needing to tear down and recreate the subscription on blockedUserIds change.
  const nearbyQueryKeyRef = useRef(nearbyQueryKey);
  nearbyQueryKeyRef.current = nearbyQueryKey;

  const query = useQuery({
    queryKey: nearbyQueryKey,
    queryFn: async () => {
      if (!hasCoordinates) return [];
      const { data, error } = await getNearbyBroadcasts(lat, lng, radiusMiles, 100, blockedUserIds);
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
    placeholderData: () => initialOfflineSnapshot?.broadcasts || [],
  });

  useEffect(() => {
    if (query.isSuccess) {
      markRealtimeSurfaceSubscribed('broadcasts');
    } else if (query.isError) {
      markRealtimeSurfaceError('broadcasts');
    }
  }, [query.isError, query.isSuccess]);

  // Real-time subscription
  useEffect(() => {
    if (!hasCoordinates) return;

    const debouncedInvalidate = () => {
      if (invalidateTimerRef.current) clearTimeout(invalidateTimerRef.current);
      invalidateTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['broadcasts', 'nearby'] });
      }, 2000);
    };

    // NOTE: We listen to all broadcast changes (not filtered by status) because
    // the UPDATE handler needs to see status/expiry transitions to remove stale
    // items from the cache. Filtering by status=eq.active would miss expiry events.
    const channel = supabase
      .channel(`broadcasts-realtime-${instanceId}`)
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
              nearbyQueryKeyRef.current,
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
            nearbyQueryKeyRef.current,
            (old = []) => old.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
          );
        }
      )
      .subscribe((status, err) => {
        if (err) {
          logger.error('[useNearbyBroadcasts] Realtime subscription error:', err);
          captureError(err, { source: 'useNearbyBroadcasts', status });
          markRealtimeSurfaceError('broadcasts');
        } else if (status && status !== 'SUBSCRIBED') {
          markRealtimeSurfaceReconnecting('broadcasts');
        } else if (status === 'SUBSCRIBED') {
          markRealtimeSurfaceSubscribed('broadcasts');
        }
      });

    return () => {
      if (invalidateTimerRef.current) clearTimeout(invalidateTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [hasCoordinates, roundedLat, roundedLng, radiusMiles, queryClient]);

  return query;
}
