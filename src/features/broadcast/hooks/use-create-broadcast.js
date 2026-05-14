/**
 * Mutation hook for creating broadcasts.
 *
 * Handles geocoding for events/alerts, expiry calculation,
 * approximate location for privacy, and query invalidation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { supabase } from '@/lib/supabase.js';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { BROADCAST_EXPIRY_MS } from '@/lib/constants.js';
import { geocodeAddress, approximateLocation } from '@/lib/geocoding.js';
import { logger } from '@/lib/logger.js';
import { toast } from '@/components/ui/use-toast';
import { uploadImageIfNeeded } from '@/lib/image-utils.js';
import { broadcastKeys } from './use-broadcasts.js';

function normalizeLocationText(text) {
  return String(text || '').trim().replace(/\s+/g, ' ');
}

/**
 * Hook to create a new broadcast.
 */
export function useCreateBroadcast() {
  const { user } = useAuthState();
  const queryClient = useQueryClient();
  const lastRunRef = useRef(0);

  return useMutation({
    mutationFn: async (broadcastData) => {
      if (!user) throw new Error('Must be authenticated to create a broadcast');

      const throttleNow = Date.now();
      if (throttleNow - lastRunRef.current < 10_000) {
        throw new Error('Please wait a moment before trying again.');
      }

      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('live_map_visible')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsError) {
        logger.error('[useCreateBroadcast] Settings error:', settingsError);
        throw settingsError;
      }

      const showApproximateLocation = settings?.live_map_visible !== false;
      const now = new Date();

      // Calculate expiration
      let expires_at = null;
      const expiryMs = BROADCAST_EXPIRY_MS[broadcastData.type];
      if (expiryMs != null) {
        expires_at = new Date(now.getTime() + expiryMs).toISOString();
      } else if (broadcastData.type === 'event' && broadcastData.eventEndTime) {
        expires_at = new Date(broadcastData.eventEndTime).toISOString();
      }

      let frozenLocation = null;
      let locationPrivacy = 'none';
      let geocodeResult = null;
      const exactLocationText = normalizeLocationText(broadcastData.exactLocationText);

      // Solo / ISO: approximate current location
      if (
        (broadcastData.type === 'solo_ride' || broadcastData.type === 'iso') &&
        broadcastData.lat != null &&
        broadcastData.lng != null
      ) {
        if (showApproximateLocation) {
          frozenLocation = approximateLocation(
            broadcastData.lat,
            broadcastData.lng,
            `${user.id}:${now.toISOString()}:${broadcastData.type}`
          );
          locationPrivacy = frozenLocation ? 'approximate' : 'none';
        }
      }

      // Event: geocode address then approximate
      if (broadcastData.type === 'event' && exactLocationText && showApproximateLocation) {
        try {
          geocodeResult = await geocodeAddress(exactLocationText);
          if (geocodeResult) {
            frozenLocation = approximateLocation(
              geocodeResult.lat,
              geocodeResult.lng,
              `${user.id}:${now.toISOString()}:event:${exactLocationText}`
            );
            locationPrivacy = frozenLocation ? 'approximate' : 'none';
          }
        } catch (error) {
          logger.warn('[useCreateBroadcast] Event geocoding failed:', error);
        }

        if (!geocodeResult || !frozenLocation) {
          throw new Error(
            'We could not locate that event address. Add a nearby city, landmark, or street and try again.'
          );
        }
      }

      // Alert: geocode area then approximate
      if (broadcastData.type === 'alert' && exactLocationText && showApproximateLocation) {
        try {
          geocodeResult = await geocodeAddress(exactLocationText);
          if (geocodeResult) {
            frozenLocation = approximateLocation(
              geocodeResult.lat,
              geocodeResult.lng,
              `${user.id}:${now.toISOString()}:alert:${exactLocationText}`
            );
            locationPrivacy = frozenLocation ? 'approximate' : 'none';
          }
        } catch (error) {
          logger.warn('[useCreateBroadcast] Alert geocoding failed:', error);
        }

        if (!geocodeResult || !frozenLocation) {
          throw new Error(
            'We could not locate that alert area. Add a nearby road, city, or landmark and try again.'
          );
        }
      }

      const broadcast = {
        author_id: user.id,
        type: broadcastData.type,
        title: broadcastData.title || null,
        body: broadcastData.body || null,
        status: 'active',
        expires_at,

        lat: frozenLocation?.lat ?? null,
        lng: frozenLocation?.lng ?? null,
        frozen_lat: frozenLocation?.lat ?? null,
        frozen_lng: frozenLocation?.lng ?? null,
        location_privacy: locationPrivacy,
        location_geocoded_at: geocodeResult ? now.toISOString() : null,
        location_geocode_provider: geocodeResult ? 'nominatim' : null,
        location_geocode_query: geocodeResult ? exactLocationText : null,

        iso_subtype: broadcastData.isoSubtype || null,
        looking_to: broadcastData.lookingTo || null,

        exact_location_text: exactLocationText || null,
        event_date: broadcastData.eventDate ? new Date(broadcastData.eventDate).toISOString() : null,
        event_end_time: broadcastData.eventEndTime ? new Date(broadcastData.eventEndTime).toISOString() : null,

        // Upload images to Supabase Storage before inserting (blob URLs are session-only)
        event_image_url: broadcastData.eventImage
          ? await uploadImageIfNeeded(broadcastData.eventImage, 'uploads', 'events')
          : null,

        alert_photos: broadcastData.alertImages?.length
          ? await Promise.all(
              broadcastData.alertImages.map((img) => uploadImageIfNeeded(img, 'uploads', 'alerts'))
            )
          : [],
      };

      const { data, error } = await supabase
        .from('broadcasts')
        .insert(broadcast)
        .select()
        .single();

      if (error) {
        logger.error('[useCreateBroadcast] Insert error:', error);
        throw error;
      }

      lastRunRef.current = Date.now();
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: broadcastKeys.all });
      queryClient.invalidateQueries({ queryKey: broadcastKeys.lists() });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: broadcastKeys.detail(data.id) });
      }
    },
    onError: (error) => {
      logger.error('[useCreateBroadcast] Mutation failed:', error);
      toast({
        title: 'Failed to create broadcast',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}
