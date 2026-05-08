import { useEffect, useId } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { buildPresenceLocation, isValidCoordinate, normalizePrecision } from '@/lib/geocoding';
import { logger } from '@/lib/logger';

const PRESENCE_TTL_MINUTES = 10;
const PRESENCE_MARKER_LIMIT = 250;
const PRESENCE_REFRESH_MS = 30_000;
const PRESENCE_HEARTBEAT_MS = 4 * 60_000;

function getVehicleLabel(profile) {
  const parts = [profile?.bike_year, profile?.bike_make, profile?.bike_model]
    .filter(Boolean)
    .map(String);
  return parts.join(' ') || null;
}

function getExpiresAt() {
  return new Date(Date.now() + PRESENCE_TTL_MINUTES * 60 * 1000).toISOString();
}

function normalizePresence(row) {
  if (!row) return null;

  return {
    ...row,
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    vehicleLabel: row.vehicle_label,
    isVisible: row.is_visible,
    locationPrecision: row.location_precision,
    accuracyMeters: row.accuracy_meters,
    approximateRadiusMiles: row.approximate_radius_miles,
    lastSeenAt: row.last_seen_at,
    expiresAt: row.expires_at,
  };
}

function isMissingRelationError(error) {
  return error?.code === 'PGRST205' || error?.code === '42P01' || error?.status === 404;
}

export function useLiveMapPresence(currentLocation = null, options = {}) {
  const { user, profile } = useSupabaseAuth();
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

      if (error) {
        if (isMissingRelationError(error)) {
          logger.warn('[useLiveMapPresence] user_settings table unavailable:', error);
          return {
            user_id: userId,
            live_map_visible: false,
            live_map_location_precision: 'approximate',
          };
        }
        throw error;
      }

      if (!data) {
        const { data: created, error: createError } = await supabase
          .from('user_settings')
          .insert({
            user_id: userId,
            notify_on_connection: true,
            notify_on_message: true,
            notify_on_rsvp: true,
            notify_on_alert: true,
            show_location: true,
            live_map_visible: false,
            live_map_location_precision: 'approximate',
            analytics_enabled: true,
          })
          .select('id,user_id,live_map_visible,live_map_location_precision')
          .single();

        if (createError) {
          if (isMissingRelationError(createError)) {
            logger.warn('[useLiveMapPresence] user_settings table unavailable:', createError);
            return {
              user_id: userId,
              live_map_visible: false,
              live_map_location_precision: 'approximate',
            };
          }
          throw createError;
        }
        return created;
      }

      return data;
    },
    staleTime: 60_000,
  });

  const presenceQuery = useQuery({
    queryKey: ['live-map-presence'],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_map_presence')
        .select('user_id,display_name,avatar_url,vehicle_label,is_visible,location_precision,lat,lng,accuracy_meters,approximate_radius_miles,last_seen_at,expires_at,updated_at')
        .eq('is_visible', true)
        .gt('expires_at', new Date().toISOString())
        .order('last_seen_at', { ascending: false })
        .limit(PRESENCE_MARKER_LIMIT);

      if (error) {
        if (isMissingRelationError(error)) {
          logger.warn('[useLiveMapPresence] live_map_presence table unavailable:', error);
          return [];
        }
        throw error;
      }
      return (data || []).map(normalizePresence);
    },
    staleTime: 30_000,
    refetchInterval: PRESENCE_REFRESH_MS,
  });

  const myPresenceQuery = useQuery({
    queryKey: ['live-map-presence', 'me', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_map_presence')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        if (isMissingRelationError(error)) {
          logger.warn('[useLiveMapPresence] live_map_presence table unavailable:', error);
          return null;
        }
        throw error;
      }
      return normalizePresence(data);
    },
    staleTime: 30_000,
    refetchInterval: settingsQuery.data?.live_map_visible ? PRESENCE_REFRESH_MS : false,
  });

  useEffect(() => {
    if (!userId) return undefined;

    const channel = supabase
      .channel(`live-map-presence-realtime-${userId}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_map_presence' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['live-map-presence'] });

          const changedUserId = payload.new?.user_id || payload.old?.user_id;
          if (changedUserId === userId) {
            queryClient.invalidateQueries({ queryKey: ['live-map-presence', 'me', userId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [instanceId, queryClient, userId]);

  const saveLiveMapSettings = useMutation({
    mutationFn: async (patch) => {
      if (!userId) throw new Error('Must be authenticated to update live map settings');

      const payload = {
        user_id: userId,
        ...patch,
      };

      if ('live_map_location_precision' in payload) {
        payload.live_map_location_precision = normalizePrecision(payload.live_map_location_precision);
      }

      const { data, error } = await supabase
        .from('user_settings')
        .upsert(payload, { onConflict: 'user_id' })
        .select('id,user_id,live_map_visible,live_map_location_precision')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', userId] });
    },
  });

  const publishPresence = useMutation({
    mutationFn: async (override = {}) => {
      if (!userId) throw new Error('Must be authenticated to publish live map presence');

      const lat = override.lat ?? currentLocation?.lat;
      const lng = override.lng ?? currentLocation?.lng;
      const isVisible = override.isVisible ?? settingsQuery.data?.live_map_visible ?? false;

      if (!isVisible) {
        const { data, error } = await supabase
          .from('live_map_presence')
          .upsert({
            user_id: userId,
            display_name: profile?.display_name || profile?.displayName || 'Rider',
            avatar_url: profile?.avatar_url || profile?.avatar || null,
            vehicle_label: getVehicleLabel(profile),
            is_visible: false,
            location_precision: normalizePrecision(settingsQuery.data?.live_map_location_precision),
            lat: null,
            lng: null,
            accuracy_meters: null,
            approximate_radius_miles: null,
            source: override.source || 'settings',
            last_seen_at: new Date().toISOString(),
            expires_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
          .select()
          .single();

        if (error) throw error;
        return normalizePresence(data);
      }

      if (!isValidCoordinate(lat, lng)) {
        throw new Error('A valid location is required to publish live map presence');
      }

      const markerLocation = buildPresenceLocation({
        lat,
        lng,
        userId,
        precision: override.precision ?? settingsQuery.data?.live_map_location_precision,
      });

      if (!markerLocation) {
        throw new Error('Unable to prepare live map location');
      }

      const { data, error } = await supabase
        .from('live_map_presence')
        .upsert({
          user_id: userId,
          display_name: profile?.display_name || profile?.displayName || 'Rider',
          avatar_url: profile?.avatar_url || profile?.avatar || null,
          vehicle_label: getVehicleLabel(profile),
          is_visible: true,
          location_precision: markerLocation.locationPrecision,
          lat: markerLocation.lat,
          lng: markerLocation.lng,
          accuracy_meters: Number.isFinite(Number(override.accuracyMeters))
            ? Math.round(Number(override.accuracyMeters))
            : null,
          approximate_radius_miles: markerLocation.approximateRadiusMiles,
          source: override.source || 'settings',
          last_seen_at: new Date().toISOString(),
          expires_at: getExpiresAt(),
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return normalizePresence(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-map-presence'] });
      queryClient.invalidateQueries({ queryKey: ['live-map-presence', 'me', userId] });
    },
  });

  const clearPresence = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Must be authenticated to clear live map presence');

      const { data, error } = await supabase
        .from('live_map_presence')
        .upsert({
          user_id: userId,
          display_name: profile?.display_name || profile?.displayName || 'Rider',
          avatar_url: profile?.avatar_url || profile?.avatar || null,
          vehicle_label: getVehicleLabel(profile),
          is_visible: false,
          location_precision: normalizePrecision(settingsQuery.data?.live_map_location_precision),
          lat: null,
          lng: null,
          accuracy_meters: null,
          approximate_radius_miles: null,
          source: 'settings',
          last_seen_at: new Date().toISOString(),
          expires_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return normalizePresence(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-map-presence'] });
      queryClient.invalidateQueries({ queryKey: ['live-map-presence', 'me', userId] });
    },
  });

  useEffect(() => {
    if (!options.autoPublish || !settingsQuery.data?.live_map_visible) return;
    if (!isValidCoordinate(currentLocation?.lat, currentLocation?.lng)) return;

    publishPresence.mutate({
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      accuracyMeters: currentLocation.accuracyMeters,
      source: options.source || 'auto',
    });
  }, [
    currentLocation?.accuracyMeters,
    currentLocation?.lat,
    currentLocation?.lng,
    options.autoPublish,
    options.source,
    settingsQuery.data?.live_map_visible,
  ]);

  useEffect(() => {
    if (!options.autoPublish || !settingsQuery.data?.live_map_visible) return undefined;
    if (!isValidCoordinate(currentLocation?.lat, currentLocation?.lng)) return undefined;

    const heartbeat = window.setInterval(() => {
      publishPresence.mutate({
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        accuracyMeters: currentLocation.accuracyMeters,
        source: options.source || 'heartbeat',
      });
    }, PRESENCE_HEARTBEAT_MS);

    return () => window.clearInterval(heartbeat);
  }, [
    currentLocation?.accuracyMeters,
    currentLocation?.lat,
    currentLocation?.lng,
    options.autoPublish,
    options.source,
    publishPresence.mutate,
    settingsQuery.data?.live_map_visible,
  ]);

  useEffect(() => {
    if (!settingsQuery.data || settingsQuery.data.live_map_visible !== false) return;
    if (myPresenceQuery.data?.is_visible) {
      clearPresence.mutate();
    }
  }, [settingsQuery.data, myPresenceQuery.data?.is_visible]);

  useEffect(() => {
    if (publishPresence.isError) {
      logger.warn('[useLiveMapPresence] Publish failed:', publishPresence.error);
    }
  }, [publishPresence.error, publishPresence.isError]);

  return {
    markers: presenceQuery.data || [],
    myPresence: myPresenceQuery.data || null,
    settings: settingsQuery.data || null,
    isLiveMapVisible: settingsQuery.data?.live_map_visible === true,
    locationPrecision: normalizePrecision(settingsQuery.data?.live_map_location_precision),
    isLoading: presenceQuery.isLoading || settingsQuery.isLoading || myPresenceQuery.isLoading,
    error: presenceQuery.error || settingsQuery.error || myPresenceQuery.error || null,
    refetch: presenceQuery.refetch,
    publishPresence: publishPresence.mutateAsync,
    publishPresenceMutation: publishPresence,
    clearPresence: clearPresence.mutateAsync,
    clearPresenceMutation: clearPresence,
    saveLiveMapSettings: saveLiveMapSettings.mutateAsync,
    saveLiveMapSettingsMutation: saveLiveMapSettings,
  };
}
