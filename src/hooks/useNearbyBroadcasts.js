import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { haversineMiles } from '@/lib/broadcastUtils';

function hasPoint(broadcast) {
  return (
    (broadcast.frozen_lat != null || broadcast.lat != null) &&
    (broadcast.frozen_lng != null || broadcast.lng != null)
  );
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

      const { data, error } = await supabase.rpc('get_nearby_broadcasts', {
        user_lat: lat,
        user_lng: lng,
        radius_miles: radiusMiles,
        limit_count: 100
      });

      if (error) {
        logger.error('[useNearbyBroadcasts] Error:', error);
        throw error;
      }

      return data || [];
    },
    enabled: lat != null && lng != null,
    staleTime: 60000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Real-time subscription with smart cache updates
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
        {
          event: 'INSERT',
          schema: 'public',
          table: 'broadcasts',
        },
        () => {
          logger.debug('[useNearbyBroadcasts] New broadcast received');
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
            (old = []) =>
              old.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
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
