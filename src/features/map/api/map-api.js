/**
 * Live Map Presence API layer for Ride Radar 2.0.
 *
 * All functions return `{ data, error }`.
 */

import { supabase } from '@/lib/supabase.js';
import { logger } from '@/lib/logger.js';

const PRESENCE_MARKER_LIMIT = 250;

/**
 * Fetch all visible presence markers.
 *
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getLiveMapPresence() {
  const { data, error } = await supabase
    .from('live_map_presence')
    .select(
      'user_id,display_name,avatar_url,vehicle_label,is_visible,location_precision,lat,lng,approximate_radius_miles,last_seen_at,expires_at,updated_at'
    )
    .eq('is_visible', true)
    .gt('expires_at', new Date().toISOString())
    .order('last_seen_at', { ascending: false })
    .limit(PRESENCE_MARKER_LIMIT);

  if (error) logger.error('[getLiveMapPresence] Error:', error);
  return { data, error };
}

/**
 * Fetch the current user's presence record.
 *
 * @param {string} userId
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function getMyPresence(userId) {
  const { data, error } = await supabase
    .from('live_map_presence')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) logger.error('[getMyPresence] Error:', error);
  return { data, error };
}

/**
 * Upsert a presence record.
 *
 * @param {object} data
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function publishPresence(data) {
  const { data: result, error } = await supabase
    .from('live_map_presence')
    .upsert(data, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) logger.error('[publishPresence] Error:', error);
  return { data: result, error };
}

/**
 * Delete the current user's presence record.
 *
 * @param {string} userId
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function clearPresence(userId) {
  const { data, error } = await supabase
    .from('live_map_presence')
    .delete()
    .eq('user_id', userId)
    .select()
    .single();

  if (error) logger.error('[clearPresence] Error:', error);
  return { data, error };
}
