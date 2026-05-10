/**
 * Broadcast API layer for Ride Radar 2.0.
 *
 * All functions return `{ data, error }` to match the Supabase client convention.
 */

import { supabase } from '@/lib/supabase.js';
import { logger } from '@/lib/logger.js';

/**
 * List broadcasts with optional filters.
 *
 * @param {object} [options]
 * @param {string} [options.type] - Broadcast type filter
 * @param {string} [options.status='active'] - Status filter
 * @param {number} [options.limit=100] - Max results
 * @param {number} [options.offset=0] - Pagination offset
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getBroadcasts(options = {}) {
  const { type, status = 'active', limit = 100, offset = 0 } = options;

  let query = supabase
    .from('broadcasts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq('type', type);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) logger.error('[getBroadcasts] Error:', error);
  return { data, error };
}

/**
 * Fetch a single broadcast by ID.
 *
 * @param {string} id
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function getBroadcastById(id) {
  const { data, error } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) logger.error('[getBroadcastById] Error:', error);
  return { data, error };
}

/**
 * Fetch nearby broadcasts using the PostGIS RPC.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} [radius=50] - Radius in miles
 * @param {number} [limit=100] - Max results
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getNearbyBroadcasts(lat, lng, radius = 50, limit = 100) {
  const { data, error } = await supabase.rpc('get_nearby_broadcasts', {
    user_lat: lat,
    user_lng: lng,
    radius_miles: radius,
    limit_count: limit,
  });

  if (error) logger.error('[getNearbyBroadcasts] Error:', error);
  return { data, error };
}

/**
 * Create a new broadcast.
 *
 * @param {object} broadcast
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function createBroadcast(broadcast) {
  const { data, error } = await supabase
    .from('broadcasts')
    .insert(broadcast)
    .select()
    .single();

  if (error) logger.error('[createBroadcast] Error:', error);
  return { data, error };
}

/**
 * Update an existing broadcast.
 *
 * @param {string} id
 * @param {object} updates
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function updateBroadcast(id, updates) {
  const { data, error } = await supabase
    .from('broadcasts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) logger.error('[updateBroadcast] Error:', error);
  return { data, error };
}

/**
 * Mark a broadcast as expired.
 *
 * @param {string} id
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function expireBroadcast(id) {
  const { data, error } = await supabase
    .from('broadcasts')
    .update({ status: 'expired', expires_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) logger.error('[expireBroadcast] Error:', error);
  return { data, error };
}

/**
 * Soft-delete a broadcast by setting status to 'deleted'.
 *
 * @param {string} id
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function deleteBroadcast(id) {
  const { data, error } = await supabase
    .from('broadcasts')
    .update({ status: 'deleted' })
    .eq('id', id)
    .select()
    .single();

  if (error) logger.error('[deleteBroadcast] Error:', error);
  return { data, error };
}

/**
 * Fetch all broadcasts by a given author.
 *
 * @param {string} authorId
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getBroadcastsByAuthor(authorId) {
  const { data, error } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false });

  if (error) logger.error('[getBroadcastsByAuthor] Error:', error);
  return { data, error };
}
