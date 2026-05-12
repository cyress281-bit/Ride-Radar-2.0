/**
 * Hook to manage live map presence data with real-time subscription,
 * auto-publish with heartbeat, and throttled location updates.
 */

import { useEffect, useId, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { supabase } from '@/lib/supabase.js';
import { getLiveMapPresence } from '@/features/map/api/map-api.js';
import { buildPresenceLocation, isValidCoordinate } from '@/lib/geocoding.js';

import { logger } from '@/lib/logger.js';
import { HEARTBEAT_INTERVAL_MS, PRESENCE_REFRESH_MS } from '@/lib/constants.js';

export const presenceKeys = {
  all: ['live-map-presence'],
  me: (userId) => [...presenceKeys.all, 'me', userId],
};

function getVehicleLabel(profile) {
  const parts = [profile?.bike_year, profile?.bike_make, profile?.bike_model].filter(Boolean).map(String);
  return parts.join(' ') || null;
}

function getExpiresAt() {
  return new Date(Date.now() + 10 * 60 * 1000).toISOString();
}

/**
 * Hook to fetch and subscribe to live map presence.
 *
 * @param {object} [currentLocation] - { lat, lng, accuracyMeters }
 * @param {object} [options] - { autoPublish, source }
 */
export function useLiveMapPresence(currentLocation = null, options = {}) {
  const { user, profile } = useAuthState();
  const queryClient = useQueryClient();
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const userId = user?.id;

  const settingsQuery = useQuery({
    queryKey: ['settings', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('id,user_id,live_map_visible,live_map_location_precision')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: upserted, error: upsertError } = await supabase
          .from('user_settings')
          .upsert(
            {
              user_id: userId,
              notify_on_connection: true,
              notify_on_message: true,
              notify_on_rsvp: true,
              notify_on_alert: true,
              show_location: true,
              live_map_visible: false,
              live_map_location_precision: 'approximate',
              analytics_enabled: true,
            },
            { onConflict: 'user_id' }
          )
          .select('id,user_id,live_map_visible,live_map_location_precision')
          .single();

        if (upsertError) throw upsertError;
        return upserted;
      }

      return data;
    },
    staleTime: 60_000,
  });

  const presenceQuery = useQuery({
    queryKey: presenceKeys.all,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await getLiveMapPresence();
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
    refetchInterval: PRESENCE_REFRESH_MS,
  });

  const myPresenceQuery = useQuery({
    queryKey: presenceKeys.me(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_map_presence')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    },
    staleTime: 30_000,
    refetchInterval: settingsQuery.data?.live_map_visible ? PRESENCE_REFRESH_MS : false,
  });

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`live-map-presence-realtime-${userId}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_map_presence', filter: 'is_visible=eq.true' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: presenceKeys.all });
          const changedUserId = payload.new?.user_id || payload.old?.user_id;
          if (changedUserId === userId) {
            queryClient.invalidateQueries({ queryKey: presenceKeys.me(userId) });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [instanceId, queryClient, userId]);

  // Auto-publish presence
  const lastPublishRef = useRef(0);

  useEffect(() => {
    if (!options.autoPublish || !settingsQuery.data?.live_map_visible) return;
    if (!isValidCoordinate(currentLocation?.lat, currentLocation?.lng)) return;

    const now = Date.now();
    if (now - lastPublishRef.current < 5000) return; // throttle 5s

    const doPublish = async () => {
      const lat = currentLocation.lat;
      const lng = currentLocation.lng;
      const precision = settingsQuery.data?.live_map_location_precision || 'approximate';
      const markerLocation = buildPresenceLocation(lat, lng, precision);

      if (!markerLocation) return;

      const { error } = await supabase.from('live_map_presence').upsert(
        {
          user_id: userId,
          display_name: profile?.display_name || 'Rider',
          avatar_url: profile?.avatar_url || null,
          vehicle_label: getVehicleLabel(profile),
          is_visible: true,
          location_precision: markerLocation.locationPrecision,
          lat: markerLocation.lat,
          lng: markerLocation.lng,
          accuracy_meters: Number.isFinite(Number(currentLocation.accuracyMeters))
            ? Math.round(Number(currentLocation.accuracyMeters))
            : null,
          approximate_radius_miles: markerLocation.approximateRadiusMiles,
          source: options.source || 'auto',
          last_seen_at: new Date().toISOString(),
          expires_at: getExpiresAt(),
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        logger.warn('[useLiveMapPresence] Publish failed:', error);
      } else {
        lastPublishRef.current = Date.now();
        queryClient.invalidateQueries({ queryKey: presenceKeys.all });
        queryClient.invalidateQueries({ queryKey: presenceKeys.me(userId) });
      }
    };

    doPublish();
  }, [
    currentLocation?.lat,
    currentLocation?.lng,
    currentLocation?.accuracyMeters,
    options.autoPublish,
    options.source,
    settingsQuery.data?.live_map_visible,
    settingsQuery.data?.live_map_location_precision,
    userId,
    profile,
    queryClient,
  ]);

  // Heartbeat
  useEffect(() => {
    if (!options.autoPublish || !settingsQuery.data?.live_map_visible) return;
    if (!isValidCoordinate(currentLocation?.lat, currentLocation?.lng)) return;

    const heartbeat = window.setInterval(() => {
      const now = Date.now();
      if (now - lastPublishRef.current < HEARTBEAT_INTERVAL_MS - 5000) return;

      const lat = currentLocation.lat;
      const lng = currentLocation.lng;
      const precision = settingsQuery.data?.live_map_location_precision || 'approximate';
      const markerLocation = buildPresenceLocation(lat, lng, precision);

      if (!markerLocation) return;

      supabase
        .from('live_map_presence')
        .upsert(
          {
            user_id: userId,
            display_name: profile?.display_name || 'Rider',
            avatar_url: profile?.avatar_url || null,
            vehicle_label: getVehicleLabel(profile),
            is_visible: true,
            location_precision: markerLocation.locationPrecision,
            lat: markerLocation.lat,
            lng: markerLocation.lng,
            accuracy_meters: Number.isFinite(Number(currentLocation.accuracyMeters))
              ? Math.round(Number(currentLocation.accuracyMeters))
              : null,
            approximate_radius_miles: markerLocation.approximateRadiusMiles,
            source: options.source || 'heartbeat',
            last_seen_at: new Date().toISOString(),
            expires_at: getExpiresAt(),
          },
          { onConflict: 'user_id' }
        )
        .then(() => {
          lastPublishRef.current = Date.now();
          queryClient.invalidateQueries({ queryKey: presenceKeys.all });
        })
        .catch((err) => logger.warn('[useLiveMapPresence] Heartbeat failed:', err));
    }, HEARTBEAT_INTERVAL_MS);

    return () => window.clearInterval(heartbeat);
  }, [
    currentLocation?.lat,
    currentLocation?.lng,
    currentLocation?.accuracyMeters,
    options.autoPublish,
    options.source,
    settingsQuery.data?.live_map_visible,
    settingsQuery.data?.live_map_location_precision,
    userId,
    profile,
    queryClient,
  ]);

  return {
    markers: presenceQuery.data || [],
    myPresence: myPresenceQuery.data || null,
    settings: settingsQuery.data || null,
    isLiveMapVisible: settingsQuery.data?.live_map_visible === true,
    isLoading: presenceQuery.isLoading || settingsQuery.isLoading || myPresenceQuery.isLoading,
    error: presenceQuery.error || settingsQuery.error || myPresenceQuery.error || null,
  };
}
