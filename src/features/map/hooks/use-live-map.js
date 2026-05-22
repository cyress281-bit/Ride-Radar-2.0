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
import {
  HEARTBEAT_INTERVAL_MS,
  PRESENCE_REFRESH_MS,
  BACKGROUND_GRACE_MS,
  PRESENCE_TTL_MS,
} from '@/lib/constants.js';

const LIVE_SESSION_KEY = 'rr:live-session';
const PRESENCE_PUBLISH_MIN_DISTANCE_METERS = 150;
const PRESENCE_MIN_WRITE_INTERVAL_MS = 5000;

export const presenceKeys = {
  all: ['live-map-presence'],
  me: (userId) => [...presenceKeys.all, 'me', userId],
};

function getVehicleLabel(profile) {
  const parts = [profile?.bike_year, profile?.bike_make, profile?.bike_model].filter(Boolean).map(String);
  return parts.join(' ') || null;
}

function getExpiresAt() {
  return new Date(Date.now() + PRESENCE_TTL_MS).toISOString();
}

function distanceMeters(a, b) {
  if (!a || !b) return Infinity;
  const lat1 = Number(a.lat);
  const lng1 = Number(a.lng);
  const lat2 = Number(b.lat);
  const lng2 = Number(b.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Infinity;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(h)));
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
  const invalidateTimerRef = useRef(null);
  const radiusMiles = options.radiusMiles ?? 50;
  const blockedUserIds = Array.isArray(options.blockedUserIds) ? options.blockedUserIds : [];
  const blockedUserIdsKey = JSON.stringify(blockedUserIds);
  const hasPresenceLocation = isValidCoordinate(currentLocation?.lat, currentLocation?.lng);
  const roundedPresenceLat = hasPresenceLocation
    ? Math.round(Number(currentLocation.lat) * 1000) / 1000
    : null;
  const roundedPresenceLng = hasPresenceLocation
    ? Math.round(Number(currentLocation.lng) * 1000) / 1000
    : null;

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
    queryKey: [
      ...presenceKeys.all,
      'nearby',
      roundedPresenceLat,
      roundedPresenceLng,
      radiusMiles,
      blockedUserIdsKey,
    ],
    enabled: !!userId && hasPresenceLocation,
    queryFn: async () => {
      const { data, error } = await getLiveMapPresence({
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        radiusMiles,
        blockedUserIds,
      });
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

    const debouncedInvalidateAll = () => {
      if (invalidateTimerRef.current) clearTimeout(invalidateTimerRef.current);
      invalidateTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: presenceKeys.all });
      }, 2000);
    };

    const channel = supabase
      .channel(`live-map-presence-realtime-${userId}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_map_presence' },
        (payload) => {
          debouncedInvalidateAll();
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
      if (invalidateTimerRef.current) clearTimeout(invalidateTimerRef.current);
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
  const lastPublishRef = useRef(0);
  const lastPublishedCoordRef = useRef(null);

  const publishPresence = useCallback(
    async (source = 'auto') => {
      if (!options.autoPublish || !settingsQuery.data?.live_map_visible || !sessionLiveActive) return false;
      if (!isValidCoordinate(currentLocation?.lat, currentLocation?.lng)) return false;

      const lat = currentLocation.lat;
      const lng = currentLocation.lng;
      const precision = settingsQuery.data?.live_map_location_precision || 'approximate';
      const markerLocation = buildPresenceLocation(lat, lng, precision);

      if (!markerLocation) return false;

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
          source,
          last_seen_at: new Date().toISOString(),
          expires_at: getExpiresAt(),
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        logger.warn('[useLiveMapPresence] Publish failed:', error);
        return false;
      }

      lastPublishRef.current = Date.now();
      lastPublishedCoordRef.current = { lat, lng };
      queryClient.invalidateQueries({ queryKey: presenceKeys.all });
      queryClient.invalidateQueries({ queryKey: presenceKeys.me(userId) });
      return true;
    },
    [
      currentLocation?.accuracyMeters,
      currentLocation?.lat,
      currentLocation?.lng,
      options.autoPublish,
      queryClient,
      sessionLiveActive,
      settingsQuery.data?.live_map_location_precision,
      settingsQuery.data?.live_map_visible,
      userId,
    ]
  );

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

  useEffect(() => {
    const handleResumeRefresh = () => {
      if (!isBrowserVisible() || !isBrowserOnline()) return;
      void publishPresence(options.source || 'resume');
    };

    window.addEventListener('rr-app-resume-refresh', handleResumeRefresh);
    return () => window.removeEventListener('rr-app-resume-refresh', handleResumeRefresh);
  }, [options.source, publishPresence]);

  // Auto-publish presence

  useEffect(() => {
    // Fix C: gate on sessionLiveActive — no publish while resume prompt is pending
    if (!options.autoPublish || !settingsQuery.data?.live_map_visible || !sessionLiveActive) return;
    if (!isValidCoordinate(currentLocation?.lat, currentLocation?.lng)) return;

    const now = Date.now();
    if (now - lastPublishRef.current < PRESENCE_MIN_WRITE_INTERVAL_MS) return;

    const coord = { lat: currentLocation.lat, lng: currentLocation.lng };
    const moved = distanceMeters(lastPublishedCoordRef.current, coord);
    // Skip if not moved enough and last publish was recent (heartbeat covers keep-alive)
    if (lastPublishedCoordRef.current && moved < PRESENCE_PUBLISH_MIN_DISTANCE_METERS
        && now - lastPublishRef.current < HEARTBEAT_INTERVAL_MS / 2) return;

    void publishPresence(options.source || 'auto');
  }, [
    currentLocation?.lat,
    currentLocation?.lng,
    currentLocation?.accuracyMeters,
    options.autoPublish,
    sessionLiveActive,
    settingsQuery.data?.live_map_visible,
    publishPresence,
    options.source,
  ]);

  // Heartbeat
  useEffect(() => {
    // Fix C: gate on sessionLiveActive — no heartbeat while resume prompt is pending
    if (!options.autoPublish || !settingsQuery.data?.live_map_visible || !sessionLiveActive) return;
    if (!isValidCoordinate(currentLocation?.lat, currentLocation?.lng)) return;

    const heartbeat = window.setInterval(() => {
      const now = Date.now();
      if (now - lastPublishRef.current < HEARTBEAT_INTERVAL_MS - 5000) return;
      void publishPresence(options.source || 'heartbeat');
    }, HEARTBEAT_INTERVAL_MS);

    return () => window.clearInterval(heartbeat);
  }, [
    currentLocation?.lat,
    currentLocation?.lng,
    options.autoPublish,
    publishPresence,
    sessionLiveActive,
    settingsQuery.data?.live_map_visible,
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
