/**
 * Hook to manage live map presence data with real-time subscription,
 * auto-publish with heartbeat, and throttled location updates.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { supabase } from '@/lib/supabase.js';
import { getLiveMapPresence } from '@/features/map/api/map-api.js';
import { buildPresenceLocation, isValidCoordinate } from '@/lib/geocoding.js';

import { logger } from '@/lib/logger.js';
import { captureError } from '@/lib/sentry.js';
import { HEARTBEAT_INTERVAL_MS, PRESENCE_REFRESH_MS, BACKGROUND_GRACE_MS } from '@/lib/constants.js';

const LIVE_SESSION_KEY = 'rr:live-session';

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

  // Keep a stable ref to the latest profile to avoid effect churn
  // when auth context returns new object references.
  const profileRef = useRef(profile);
  profileRef.current = profile;

  // ── Fix C: session-level live-active tracking ──────────────────────────────
  // sessionStorage is cleared on tab close / force-close, so this naturally
  // detects "was Live in a previous session" on app reopen.
  const [sessionLiveActive, setSessionLiveActive] = useState(
    () => sessionStorage.getItem(LIVE_SESSION_KEY) === '1'
  );

  const markLiveSessionActive = useCallback(() => {
    sessionStorage.setItem(LIVE_SESSION_KEY, '1');
    setSessionLiveActive(true);
  }, []);

  const clearLiveSession = useCallback(() => {
    sessionStorage.removeItem(LIVE_SESSION_KEY);
    setSessionLiveActive(false);
  }, []);
  // ────────────────────────────────────────────────────────────────────────────

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
        // Return defaults without writing — settings row is created during onboarding
        // or when the user first changes a setting.
        return {
          user_id: userId,
          live_map_visible: false,
          live_map_location_precision: 'approximate',
          show_location: true,
        };
      }

      return data;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
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
        { event: '*', schema: 'public', table: 'live_map_presence' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: presenceKeys.all });
          const changedUserId = payload.new?.user_id || payload.old?.user_id;
          if (changedUserId === userId) {
            queryClient.invalidateQueries({ queryKey: presenceKeys.me(userId) });
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          logger.error('[useLiveMapPresence] Realtime subscription error:', err);
          captureError(err, { source: 'useLiveMapPresence', status });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [instanceId, queryClient, userId]);

  // ── Fix B: background/visibilitychange safety ──────────────────────────────
  // Stable refs let us use a single event listener (empty deps) that always
  // reads current values, avoiding listener churn on every settings change.
  const settingsDataRef = useRef(null);
  settingsDataRef.current = settingsQuery.data ?? null;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const sessionActiveRef = useRef(sessionLiveActive);
  sessionActiveRef.current = sessionLiveActive;

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return;
      if (!settingsDataRef.current?.live_map_visible) return;
      if (!sessionActiveRef.current) return; // skip if in resume-prompt state
      if (!userIdRef.current) return;

      // Shorten the presence TTL to BACKGROUND_GRACE_MS so force-close
      // causes the row to expire within that window instead of up to 10 min.
      supabase
        .from('live_map_presence')
        .update({ expires_at: new Date(Date.now() + BACKGROUND_GRACE_MS).toISOString() })
        .eq('user_id', userIdRef.current)
        .then(({ error }) => {
          if (error) logger.warn('[useLiveMapPresence] Background expire failed:', error);
        });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []); // intentionally empty — reads current values via stable refs
  // ────────────────────────────────────────────────────────────────────────────

  // Auto-publish presence
  const lastPublishRef = useRef(0);

  useEffect(() => {
    // Fix C: gate on sessionLiveActive — no publish while resume prompt is pending
    if (!options.autoPublish || !settingsQuery.data?.live_map_visible || !sessionLiveActive) return;
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
          display_name: profileRef.current?.display_name || 'Rider',
          avatar_url: profileRef.current?.avatar_url || null,
          vehicle_label: getVehicleLabel(profileRef.current),
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
    sessionLiveActive,
    settingsQuery.data?.live_map_visible,
    settingsQuery.data?.live_map_location_precision,
    userId,
    queryClient,
  ]);

  // Heartbeat
  useEffect(() => {
    // Fix C: gate on sessionLiveActive — no heartbeat while resume prompt is pending
    if (!options.autoPublish || !settingsQuery.data?.live_map_visible || !sessionLiveActive) return;
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
            display_name: profileRef.current?.display_name || 'Rider',
            avatar_url: profileRef.current?.avatar_url || null,
            vehicle_label: getVehicleLabel(profileRef.current),
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
    sessionLiveActive,
    settingsQuery.data?.live_map_visible,
    settingsQuery.data?.live_map_location_precision,
    userId,
    queryClient,
  ]);

  // Fix C: true when settings are loaded, Live is on, but this session hasn't
  // yet established an active presence (i.e. app was reopened with stale Live state).
  const needsResumePrompt = settingsQuery.isSuccess
    && settingsQuery.data?.live_map_visible === true
    && !sessionLiveActive;

  return {
    markers: presenceQuery.data || [],
    myPresence: myPresenceQuery.data || null,
    settings: settingsQuery.data || null,
    isLiveMapVisible: settingsQuery.data?.live_map_visible === true,
    isLoading: presenceQuery.isLoading || settingsQuery.isLoading || myPresenceQuery.isLoading,
    error: presenceQuery.error || settingsQuery.error || myPresenceQuery.error || null,
    needsResumePrompt,
    markLiveSessionActive,
    clearLiveSession,
  };
}
