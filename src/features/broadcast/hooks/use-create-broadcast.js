/**
 * Mutation hook for creating broadcasts.
 *
 * Handles geocoding for events/alerts, expiry calculation,
 * approximate location for privacy, and query invalidation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase.js';
import { BROADCAST_EXPIRY_MS, ALERT_PRESET_EXPIRY_MS } from '@/lib/constants.js';
import { geocodeAddress, approximateLocation } from '@/lib/geocoding.js';
import { logger } from '@/lib/logger.js';
import { toast } from 'sonner';
import { uploadImage, isLocalImage } from '@/lib/image-utils.js';
import { broadcastKeys } from './use-broadcasts.js';
import { trackBroadcastCreated } from '@/lib/analytics.js';

function normalizeLocationText(text) {
  return String(text || '').trim().replace(/\s+/g, ' ');
}

const lastRunRef = { current: 0 };

/**
 * Hook to create a new broadcast.
 */
export function useCreateBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (broadcastData) => {
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (!freshUser) throw new Error('Must be authenticated to create a broadcast');

      const throttleNow = Date.now();
      const cooldownMs = broadcastData.type === 'bike_down' ? 20_000 : 10_000;
      if (throttleNow - lastRunRef.current < cooldownMs) {
        throw new Error(
          broadcastData.type === 'bike_down'
            ? 'Please wait a moment before sending another Bike Down alert.'
            : 'Please wait a moment before trying again.'
        );
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
            `${freshUser.id}:${now.toISOString()}:${broadcastData.type}`
          );
        }
      }

      // Event: prefer an explicit meetup pin if the user adjusted one, otherwise
      // geocode the text address and approximate as before.
      if (broadcastData.type === 'event') {
        const hasExplicitMeetupPin =
          broadcastData.eventPinAdjusted === true &&
          typeof broadcastData.eventPinLat === 'number' &&
          typeof broadcastData.eventPinLng === 'number';

        if (hasExplicitMeetupPin) {
          frozenLocation = {
            lat: broadcastData.eventPinLat,
            lng: broadcastData.eventPinLng,
          };
        } else if (exactLocationText) {
          try {
            geocodeResult = await geocodeAddress(exactLocationText);
            if (geocodeResult) {
              frozenLocation = approximateLocation(
                geocodeResult.lat,
                geocodeResult.lng,
                `${freshUser.id}:${now.toISOString()}:event:${exactLocationText}`
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
      }

      // Alert / Bike Down: use pin coords first, then geocode text fallback
      if (broadcastData.type === 'alert' || broadcastData.type === 'bike_down') {
        if (broadcastData.lat != null && broadcastData.lng != null) {
          // Bike Down uses exact coords — the rider is broadcasting an emergency location.
          // Road Warning presets still approximate (broadcastData.type === 'alert').
          frozenLocation =
            broadcastData.type === 'bike_down'
              ? { lat: broadcastData.lat, lng: broadcastData.lng }
              : approximateLocation(
                  broadcastData.lat,
                  broadcastData.lng,
                  `${freshUser.id}:${now.toISOString()}:alert:pin`
                );
        } else if (exactLocationText) {
          try {
            geocodeResult = await geocodeAddress(exactLocationText);
            if (geocodeResult) {
              frozenLocation = approximateLocation(
                geocodeResult.lat,
                geocodeResult.lng,
                `${freshUser.id}:${now.toISOString()}:alert:${exactLocationText}`
              );
            }
          } catch (error) {
            logger.warn('[useCreateBroadcast] Alert geocoding failed:', error);
          }
          if (!frozenLocation) {
            throw new Error(
              'We could not locate that address. Try adding a nearby street, landmark, or city.'
            );
          }
        }
      }

      // Upload images before inserting — track paths so we can clean up if the insert fails.
      const uploadedPaths = [];

      let event_image_url = null;
      if (isLocalImage(broadcastData.eventImage)) {
        const eventImagePath = `events/${freshUser.id}/${Date.now()}.webp`;
        event_image_url = await uploadImage(broadcastData.eventImage.file, 'uploads', eventImagePath);
        uploadedPaths.push(eventImagePath);
      }

      let alert_photos = [];
      if (broadcastData.alertImages?.length) {
        const uploadTs = Date.now();
        alert_photos = await Promise.all(
          broadcastData.alertImages
            .filter(isLocalImage)
            .map(async (img, index) => {
              const alertPath = `alerts/${freshUser.id}/${uploadTs}-${index}.webp`;
              const url = await uploadImage(img.file, 'uploads', alertPath);
              uploadedPaths.push(alertPath);
              return url;
            })
        );
      }

      const broadcast = {
        author_id: freshUser.id,
        type: broadcastData.type === 'bike_down' ? 'alert' : broadcastData.type,
        alert_type: broadcastData.type === 'bike_down' ? 'bike_down' : null,
        iso_subtype: broadcastData.type === 'iso' ? (broadcastData.isoSubtype ?? null) : null,
        title: broadcastData.type === 'bike_down' ? 'Bike Down' : broadcastData.title,
        body: broadcastData.body || null,
        status: 'active',
        expires_at,
        frozen_lat: frozenLocation?.lat ?? null,
        frozen_lng: frozenLocation?.lng ?? null,
        location_name: exactLocationText || null,
        event_date: broadcastData.eventDate ? new Date(broadcastData.eventDate).toISOString() : null,
        event_image_url,
        alert_photos,
      };

      try {
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
      } catch (insertError) {
        if (uploadedPaths.length > 0) {
          supabase.storage.from('uploads').remove(uploadedPaths).catch((cleanupErr) => {
            logger.warn('[useCreateBroadcast] Storage cleanup failed after insert error:', cleanupErr);
          });
        }
        throw insertError;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: broadcastKeys.lists() });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: broadcastKeys.detail(data.id) });
      }
      trackBroadcastCreated(data?.type || 'unknown');
    },
    onError: (error) => {
      logger.error('[useCreateBroadcast] Mutation failed:', error);
      toast.error('Failed to create broadcast', {
        description: error?.message || 'Please try again.',
      });
    },
  });
}
