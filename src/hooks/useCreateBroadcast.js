import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { logger } from '@/lib/logger';
import { approximateLocation, geocodeLocationText, isValidCoordinate, normalizeLocationText } from '@/lib/geocoding';

/**
 * Hook to create a new broadcast in Supabase
 *
 * Handles all broadcast types: solo_ride, iso, event, alert
 * Auto-sets expiration times based on type
 */
export function useCreateBroadcast() {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (broadcastData) => {
      if (!user) throw new Error('Must be authenticated to create broadcast');

      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('show_location')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsError) {
        logger.error('[useCreateBroadcast] Settings error:', settingsError);
        throw settingsError;
      }

      const showApproximateLocation = settings?.show_location !== false;

      // Calculate expiration based on type
      let expires_at = null;
      const now = new Date();

      if (broadcastData.type === 'solo_ride' || broadcastData.type === 'iso') {
        // 72 hours from now
        expires_at = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
      } else if (broadcastData.type === 'event' && broadcastData.eventEndTime) {
        // Event expiration is the event end time
        expires_at = new Date(broadcastData.eventEndTime).toISOString();
      } else if (broadcastData.type === 'alert') {
        // Alerts expire after 6 hours
        expires_at = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();
      }

      let frozenLocation = null;
      let locationPrivacy = 'none';
      let geocodeResult = null;
      const exactLocationText = normalizeLocationText(broadcastData.exactLocationText);

      if (
        (broadcastData.type === 'solo_ride' || broadcastData.type === 'iso') &&
        isValidCoordinate(broadcastData.lat, broadcastData.lng)
      ) {
        if (showApproximateLocation) {
          frozenLocation = approximateLocation(broadcastData.lat, broadcastData.lng, {
            seed: `${user.id}:${now.toISOString()}:${broadcastData.type}`,
          });
          locationPrivacy = frozenLocation ? 'approximate' : 'none';
        }
      }

      if (broadcastData.type === 'event' && exactLocationText && showApproximateLocation) {
        try {
          geocodeResult = await geocodeLocationText(exactLocationText);
          if (geocodeResult) {
            frozenLocation = approximateLocation(geocodeResult.lat, geocodeResult.lng, {
              seed: `${user.id}:${now.toISOString()}:event:${exactLocationText}`,
            });
            locationPrivacy = frozenLocation ? 'approximate' : 'none';
          }
        } catch (error) {
          logger.warn('[useCreateBroadcast] Event geocoding failed:', error);
          throw new Error('We could not locate that event address. Add a nearby city, landmark, or street and try again.');
        }

        if (!geocodeResult) {
          throw new Error('We could not locate that event address. Add a nearby city, landmark, or street and try again.');
        }
      }

      if (broadcastData.type === 'alert' && exactLocationText && showApproximateLocation) {
        try {
          geocodeResult = await geocodeLocationText(exactLocationText);
          const approximate = geocodeResult
            ? approximateLocation(geocodeResult.lat, geocodeResult.lng, {
                seed: `${user.id}:${now.toISOString()}:alert:${exactLocationText}`,
              })
            : null;

          if (geocodeResult) {
            frozenLocation = approximate;
            locationPrivacy = frozenLocation ? 'approximate' : 'none';
          }
        } catch (error) {
          logger.warn('[useCreateBroadcast] Alert geocoding failed:', error);
          throw new Error('We could not locate that alert area. Add a nearby road, city, or landmark and try again.');
        }

        if (!geocodeResult || !frozenLocation) {
          throw new Error('We could not locate that alert area. Add a nearby road, city, or landmark and try again.');
        }
      }

      // Prepare broadcast object
      const broadcast = {
        author_id: user.id,
        type: broadcastData.type,
        title: broadcastData.title || null,
        body: broadcastData.body || null,
        status: 'active',
        expires_at,

        // Location data follows the broadcast privacy language: approximate and frozen
        // for riders/alerts, exact only for event placement text.
        lat: frozenLocation?.lat ?? null,
        lng: frozenLocation?.lng ?? null,
        frozen_lat: frozenLocation?.lat ?? null,
        frozen_lng: frozenLocation?.lng ?? null,
        location_privacy: locationPrivacy,
        location_geocoded_at: geocodeResult ? now.toISOString() : null,
        location_geocode_provider: geocodeResult?.provider ?? null,
        location_geocode_query: geocodeResult?.query ?? null,

        // ISO-specific fields
        iso_subtype: broadcastData.isoSubtype || null,
        looking_to: broadcastData.lookingTo || null,

        // Event-specific fields
        exact_location_text: exactLocationText || null,
        event_date: broadcastData.eventDate ? new Date(broadcastData.eventDate).toISOString() : null,
        event_end_time: broadcastData.eventEndTime ? new Date(broadcastData.eventEndTime).toISOString() : null,
        event_image_url: broadcastData.eventImage || null,

        // Alert-specific fields
        alert_image_urls: broadcastData.alertImages || [],
      };

      const { data, error } = await supabase
        .from('broadcasts')
        .insert(broadcast)
        .select()
        .single();

      if (error) {
        logger.error('[useCreateBroadcast] Error:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate all broadcast queries to refresh feed
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
    },
  });
}
