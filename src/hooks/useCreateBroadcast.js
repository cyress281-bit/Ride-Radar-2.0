import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { logger } from '@/lib/logger';

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

      // Prepare broadcast object
      const broadcast = {
        author_id: user.id,
        type: broadcastData.type,
        title: broadcastData.title || null,
        body: broadcastData.body || null,
        status: 'active',
        expires_at,

        // Location data (fuzzed for privacy)
        lat: broadcastData.lat || null,
        lng: broadcastData.lng || null,
        frozen_lat: broadcastData.lat || null, // Frozen at creation time
        frozen_lng: broadcastData.lng || null,

        // ISO-specific fields
        iso_subtype: broadcastData.isoSubtype || null,
        looking_to: broadcastData.lookingTo || null,

        // Event-specific fields
        exact_location_text: broadcastData.exactLocationText || null,
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
