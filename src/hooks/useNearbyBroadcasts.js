import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeBroadcast, normalizeBroadcasts } from '@/lib/supabaseNormalizer';
import { logger } from '@/lib/logger';
import { haversineMiles } from '@/lib/broadcastUtils';

function isUnavailableQueryError(error) {
  return (
    error?.code === 'PGRST202' ||
    error?.code === 'PGRST205' ||
    error?.code === '42P01' ||
    error?.code === '42883' ||
    error?.status === 404 ||
    error?.status === 400
  );
}

function isMissingColumnError(error, column) {
  return (
    error?.code === '42703' ||
    String(error?.message || '').toLowerCase().includes(`${column.toLowerCase()} does not exist`)
  );
}

function hasPoint(broadcast) {
  return (
    (broadcast.frozen_lat != null || broadcast.frozenLat != null || broadcast.lat != null) &&
    (broadcast.frozen_lng != null || broadcast.frozenLng != null || broadcast.lng != null)
  );
}

async function fetchNearbyBroadcastsFallback(lat, lng, radiusMiles) {
  const baseQuery = () => supabase
    .from('broadcasts')
    .select('*')
    .eq('status', 'active');

  let { data, error } = await baseQuery()
    .order('created_at', { ascending: false })
    .limit(250);

  if (isMissingColumnError(error, 'created_at')) {
    ({ data, error } = await baseQuery()
      .order('created_date', { ascending: false })
      .limit(250));
  }

  if (isMissingColumnError(error, 'created_date')) {
    ({ data, error } = await baseQuery().limit(250));
  }

  if (error) throw error;

  return normalizeBroadcasts(data || [])
    .filter((broadcast) => {
      if (!hasPoint(broadcast)) return false;
      if (!broadcast.expires_at && !broadcast.expiresAt) return true;
      return new Date(broadcast.expires_at || broadcast.expiresAt) > new Date();
    })
    .map((broadcast) => {
      const distance = haversineMiles(
        lat,
        lng,
        broadcast.frozen_lat ?? broadcast.frozenLat ?? broadcast.lat,
        broadcast.frozen_lng ?? broadcast.frozenLng ?? broadcast.lng
      );
      return { ...broadcast, distance_miles: distance };
    })
    .filter((broadcast) => broadcast.distance_miles == null || broadcast.distance_miles <= radiusMiles)
    .sort((a, b) => (a.distance_miles ?? 999) - (b.distance_miles ?? 999))
    .slice(0, 100);
}

/**
 * Hook to fetch nearby broadcasts using Supabase + PostGIS
 *
 * Optimized:
 * - INSERT events use debounced invalidation (batches rapid-fire events)
 * - UPDATE events apply in-place patches when possible (no full refetch)
 * - DELETE/status changes remove from cache directly
 * - staleTime increased since real-time handles freshness
 */
export function useNearbyBroadcasts(lat, lng, radiusMiles = 50) {
  const queryClient = useQueryClient();
  const invalidateTimerRef = useRef(null);
  const hasCoordinates = lat != null && lng != null;
  const nearbyQueryKey = ['broadcasts', 'nearby', lat, lng, radiusMiles];

  const query = useQuery({
    queryKey: nearbyQueryKey,
    queryFn: async () => {
      if (!hasCoordinates) return [];

      // Call our PostGIS function that does server-side distance calc
      const { data, error } = await supabase.rpc('get_nearby_broadcasts', {
        user_lat: lat,
        user_lng: lng,
        radius_miles: radiusMiles,
        limit_count: 100
      });

      if (error) {
        logger.error('[useNearbyBroadcasts] Error:', error);
        if (isUnavailableQueryError(error)) {
          logger.warn('[useNearbyBroadcasts] Falling back to client-side nearby filtering');
          return fetchNearbyBroadcastsFallback(lat, lng, radiusMiles);
        }
        throw error;
      }

      // CRITICAL FIX: Normalize snake_case fields to camelCase for compatibility
      return normalizeBroadcasts(data || []);
    },
    enabled: lat != null && lng != null,
    staleTime: 60000, // 60 seconds - real-time handles freshness
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false, // Real-time keeps this fresh
  });

  // Real-time subscription with smart cache updates
  useEffect(() => {
    if (!hasCoordinates) return;

    // Debounced invalidation: batches multiple rapid events into one refetch
    const debouncedInvalidate = () => {
      if (invalidateTimerRef.current) clearTimeout(invalidateTimerRef.current);
      invalidateTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['broadcasts', 'nearby'] });
      }, 2000); // 2s debounce - batches burst of new broadcasts
    };

    const channel = supabase
      .channel('broadcasts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'broadcasts',
        },
        (payload) => {
          logger.debug('[useNearbyBroadcasts] New broadcast received');
          // Must refetch for distance calculation, but debounce to batch
          debouncedInvalidate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'broadcasts',
        },
        (payload) => {
          const updated = payload.new;
          const previous = payload.old || {};
          const normalizedUpdated = normalizeBroadcast(updated);
          logger.debug('[useNearbyBroadcasts] Broadcast updated');

          // If broadcast expired or was deactivated, remove from cache
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

          // Location/status changes can affect whether the row belongs in this nearby query.
          if (locationChanged || statusChanged || expiryChanged) {
            debouncedInvalidate();
            return;
          }

          // For field updates (title, body, etc.), patch in-place
          queryClient.setQueryData(
            nearbyQueryKey,
            (old = []) =>
              old.map((b) => (b.id === updated.id ? { ...b, ...normalizedUpdated } : b))
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
