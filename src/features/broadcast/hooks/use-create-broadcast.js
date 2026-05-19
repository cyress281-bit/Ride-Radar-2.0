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
import { BROADCAST_EXPIRY_MS, ALERT_PRESET_EXPIRY_MS } from '@/lib/constants.js';
import { geocodeAddress, approximateLocation } from '@/lib/geocoding.js';
import { logger } from '@/lib/logger.js';
import { toast } from '@/components/ui/use-toast';
import { uploadImage } from '@/lib/image-utils.js';
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

      const now = new Date();

      // Calculate expiration
      let expires_at = null;
      const expiryMs = BROADCAST_EXPIRY_MS[broadcastData.type];
      if (expiryMs != null) {
        expires_at = new Date(now.getTime() + expiryMs).toISOString();
      } else if (broadcastData.type === 'event' && broadcastData.eventEndTime) {
        expires_at = new Date(broadcastData.eventEndTime).toISOString();
      }

      // Override expiry for Road Warning presets (does not affect bike_down)
      if (broadcastData.type === 'alert' && broadcastData.title) {
        const presetExpiry = ALERT_PRESET_EXPIRY_MS[broadcastData.title];
        if (presetExpiry !== undefined) {
          expires_at = new Date(now.getTime() + presetExpiry).toISOString();
        }
      }

      let frozenLocation = null;
      let geocodeResult = null;
      const exactLocationText = normalizeLocationText(broadcastData.exactLocationText);

      // Solo / ISO: always freeze a location when coords are present.
      // live_map_visible controls live presence only — not explicit broadcast coordinates.
      if (
        (broadcastData.type === 'solo_ride' || broadcastData.type === 'iso') &&
        typeof broadcastData.lat === 'number' &&
        typeof broadcastData.lng === 'number'
      ) {
        if (broadcastData.type === 'solo_ride' && broadcastData.locationPrecision === 'precise') {
          frozenLocation = { lat: broadcastData.lat, lng: broadcastData.lng };
        } else {
          frozenLocation = approximateLocation(
            broadcastData.lat,
            broadcastData.lng,
            `${user.id}:${now.toISOString()}:${broadcastData.type}`
          );
        }
      }

      // Event: geocode address then approximate
      if (broadcastData.type === 'event' && exactLocationText) {
        try {
          geocodeResult = await geocodeAddress(exactLocationText);
          if (geocodeResult) {
            frozenLocation = approximateLocation(
              geocodeResult.lat,
              geocodeResult.lng,
              `${user.id}:${now.toISOString()}:event:${exactLocationText}`
            );
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

      // Alert / Bike Down: use pin coords first, then geocode text fallback
      if (broadcastData.type === 'alert' || broadcastData.type === 'bike_down') {
        if (broadcastData.lat != null && broadcastData.lng != null) {
          frozenLocation = approximateLocation(
            broadcastData.lat,
            broadcastData.lng,
            `${user.id}:${now.toISOString()}:alert:pin`
          );
        } else if (exactLocationText) {
          try {
            geocodeResult = await geocodeAddress(exactLocationText);
            if (geocodeResult) {
              frozenLocation = approximateLocation(
                geocodeResult.lat,
                geocodeResult.lng,
                `${user.id}:${now.toISOString()}:alert:${exactLocationText}`
              );
            }
          } catch (error) {
            logger.warn('[useCreateBroadcast] Alert geocoding failed:', error);
          }
          if (broadcastData.type === 'bike_down' && !frozenLocation) {
            throw new Error(
              'We could not locate that address. Try adding a nearby street, landmark, or city.'
            );
          }
        }
      }

      const broadcast = {
        author_id: user.id,
        type: broadcastData.type === 'bike_down' ? 'alert' : broadcastData.type,
        alert_type: broadcastData.type === 'bike_down' ? 'bike_down' : null,
        title: broadcastData.type === 'bike_down' ? 'Bike Down' : broadcastData.title,
        body: broadcastData.body || null,
        status: 'active',
        expires_at,

        frozen_lat: frozenLocation?.lat ?? null,
        frozen_lng: frozenLocation?.lng ?? null,
        location_name: exactLocationText || null,

        event_date: broadcastData.eventDate ? new Date(broadcastData.eventDate).toISOString() : null,

        // Upload images to Supabase Storage before inserting (blob URLs are session-only)
        // Use owner-scoped paths to satisfy RLS policies
        event_image_url: broadcastData.eventImage
          ? await uploadImage(
              broadcastData.eventImage.file || broadcastData.eventImage,
              'uploads',
              `events/${user.id}/${Date.now()}.webp`
            )
          : null,

        alert_photos: broadcastData.alertImages?.length
          ? await Promise.all(
              broadcastData.alertImages.map((img, index) =>
                uploadImage(
                  img.file || img,
                  'uploads',
                  `alerts/${user.id}/${Date.now()}-${index}.webp`
                )
              )
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
