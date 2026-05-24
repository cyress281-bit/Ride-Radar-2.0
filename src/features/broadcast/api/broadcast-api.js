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
 * @param {string[]} [options.blockedUserIds] - User IDs to exclude
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getBroadcasts(options = {}) {
  const { type, status = 'active', limit = 100, offset = 0, blockedUserIds = [] } = options;

  let query = supabase
    .from('broadcasts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq('type', type);
  if (status) query = query.eq('status', status);
  if (blockedUserIds.length > 0) {
    query = query.not('author_id', 'in', `(${blockedUserIds.join(',')})`);
  }

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
    .rpc('get_visible_broadcast_by_id', { broadcast_id: id })
    .maybeSingle();

  if (error) logger.error('[getBroadcastById] Error:', error);
  return { data, error };
}

/**
 * Check whether an active Bike Down signal is still visible to the current viewer
 * under the same block/expiry rules used by the nearby broadcasts RPC.
 *
 * @param {{ id: string, frozen_lat: number|string, frozen_lng: number|string }} broadcast
 * @returns {Promise<{data: boolean, error: Error|null}>}
 */
export async function canViewActiveBikeDownDetail(broadcast) {
  const lat = Number(broadcast?.frozen_lat);
  const lng = Number(broadcast?.frozen_lng);

  if (!broadcast?.id || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { data: false, error: null };
  }

  const { data, error } = await getNearbyBroadcasts(lat, lng, 1, 100);
  if (error) {
    logger.error('[canViewActiveBikeDownDetail] Error:', error);
    return { data: false, error };
  }

  return {
    data: Array.isArray(data) && data.some((item) => item.id === broadcast.id),
    error: null,
  };
}

/**
 * Fetch nearby broadcasts using the PostGIS RPC.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} [radius=50] - Radius in miles
 * @param {number} [limit=100] - Max results
 * @param {string[]} [blockedUserIds] - User IDs to exclude
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getNearbyBroadcasts(lat, lng, radius = 50, limit = 100, blockedUserIds = []) {
  const { data, error } = await supabase.rpc('get_nearby_broadcasts', {
    user_lat: lat,
    user_lng: lng,
    radius_miles: radius,
    limit_count: limit,
    exclude_user_ids: blockedUserIds,
  });

  if (error) logger.error('[getNearbyBroadcasts] Error:', error);
  return { data, error };
}

/**
 * Create a new broadcast.
 * Throttled to prevent spam.
 *
 * @param {object} broadcastData
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function createBroadcast(broadcastData) {
  const { data, error } = await supabase
    .from('broadcasts')
    .insert(broadcastData)
    .select()
    .single();

  if (error) logger.error('[createBroadcast] Error:', error);
  return { data, error };
}

/**
 * Hard-delete a broadcast by ID (admin only).
 * @param {string} id
 * @returns {Promise<{data: null, error: Error|null}>}
 */
export async function hardDeleteBroadcast(id) {
  const { error } = await supabase.from('broadcasts').delete().eq('id', id);
  if (error) throw error;
  return { data: null, error: null };
}

/**
 * Update a broadcast's editable fields (owner only, enforced by RLS).
 * Only 'title' and 'body' are accepted; all other keys are silently dropped.
 *
 * @param {string} id
 * @param {{ title?: string, body?: string }} fields
 * @returns {Promise<{ id: string }>}
 */
export async function updateBroadcast(id, fields) {
  const allowed = {};
  if ('title' in fields) allowed.title = fields.title;
  if ('body' in fields) allowed.body = fields.body;

  const { error } = await supabase
    .from('broadcasts')
    .update(allowed)
    .eq('id', id);
  if (error) {
    logger.error('[updateBroadcast] Error:', error);
    throw error;
  }
  return { id };
}

/**
 * Soft-remove a broadcast by setting status to 'expired'.
 * Only the author can do this (enforced by RLS: auth.uid() = author_id).
 * @param {string} id
 * @returns {Promise<{data: null, error: Error|null}>}
 */
export async function removeBroadcast(id) {
  const { error } = await supabase
    .from('broadcasts')
    .update({ status: 'expired' })
    .eq('id', id);
  if (error) logger.error('[removeBroadcast] Error:', error);
  return { data: null, error };
}

/**
 * Resolve a Bike Down signal — marks the rider as safe.
 * Sets status='expired' so the signal leaves Radar immediately,
 * and stamps resolved_at so the detail page can show "Rider found safe."
 * Only the author can do this (enforced by RLS: auth.uid() = author_id).
 * @param {string} id
 * @param {string} [note]
 * @returns {Promise<{data: null, error: Error|null}>}
 */
export async function resolveBroadcast(id, note) {
  const { error } = await supabase
    .from('broadcasts')
    .update({
      status: 'expired',
      resolved_at: new Date().toISOString(),
      resolved_note: note?.trim() || null,
    })
    .eq('id', id);
  if (error) logger.error('[resolveBroadcast] Error:', error);
  return { data: null, error };
}

/**
 * Fetch all broadcasts by a given author.
 *
 * @param {string} authorId
 * @param {number} [limit]
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getBroadcastsByAuthor(authorId, limit) {
  const { data, error } = await supabase.rpc('get_visible_broadcasts_by_author', {
    author_user_id: authorId,
    limit_count: limit ?? 200,
  });
  if (error) logger.error('[getBroadcastsByAuthor] Error:', error);
  return { data, error };
}

// ------------------------------------------------------------------
// Event RSVP APIs
// ------------------------------------------------------------------

/**
 * Fetch all RSVPs for an event broadcast.
 * @param {string} broadcastId
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getEventRsvps(broadcastId) {
  const { data, error } = await supabase
    .from('event_rsvps')
    .select('*')
    .eq('broadcast_id', broadcastId);

  if (error) logger.error('[getEventRsvps] Error:', error);
  return { data, error };
}

/**
 * Fetch the current user's RSVP for an event.
 * @param {string} broadcastId
 * @param {string} userId
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function getMyEventRsvp(broadcastId, userId) {
  const { data, error } = await supabase
    .from('event_rsvps')
    .select('*')
    .eq('broadcast_id', broadcastId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) logger.error('[getMyEventRsvp] Error:', error);
  return { data, error };
}

/**
 * Set the current user's RSVP status for an event.
 * @param {string} broadcastId
 * @param {string} userId
 * @param {string} status - 'interested' | 'going' | 'maybe' | 'not_going'
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function setEventRsvp(broadcastId, userId, status) {
  const { error } = await supabase
    .from('event_rsvps')
    .upsert({ broadcast_id: broadcastId, user_id: userId, status }, { onConflict: 'broadcast_id,user_id' });

  if (error) throw error;

  console.log('[RSVP-DEBUG] upsert succeeded | broadcastId:', broadcastId, '| userId:', userId, '| status:', status); // (a)

  // Best-effort notification to event creator — never blocks the RSVP itself.
  try {
    const { data: broadcast } = await supabase
      .from('broadcasts')
      .select('author_id, title')
      .eq('id', broadcastId)
      .maybeSingle();

    console.log('[RSVP-DEBUG] broadcast fetch | author_id:', broadcast?.author_id, '| title:', broadcast?.title); // (b)

    if (broadcast?.author_id && broadcast.author_id !== userId) {
      console.log('[RSVP-DEBUG] self-check passed — continuing to notify'); // (c) continued

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, username')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('[RSVP-DEBUG] profile fetch | display_name:', profile?.display_name, '| username:', profile?.username); // (d)

      const actorName = profile?.display_name || profile?.username || 'A rider';
      const STATUS_LABELS = { going: 'going', interested: 'interested', maybe: 'maybe', not_going: 'not going' };
      const statusLabel = STATUS_LABELS[status] ?? status;

      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: broadcast.author_id,
        type: 'rsvp',
        title: 'New RSVP on your event',
        body: `${actorName} is ${statusLabel} on "${broadcast.title || 'your event'}".`,
        data: {
          broadcast_id: broadcastId,
          actor_id: userId,
          actor_display_name: actorName,
          status,
          related_entity_type: 'broadcast',
          related_entity_id: broadcastId,
        },
        read: false,
      });

      console.log('[RSVP-DEBUG] notification insert | error:', notifError); // (e)

      if (notifError) logger.error('[setEventRsvp] Notification insert failed:', notifError);
    } else {
      console.log('[RSVP-DEBUG] self-check skipped | broadcast?.author_id:', broadcast?.author_id, '| userId:', userId); // (c) skipped
    }
  } catch (err) {
    logger.error('[setEventRsvp] Notification error:', err);
  }

  return { data: null, error: null };
}

/**
 * Remove the current user's RSVP for an event.
 * @param {string} broadcastId
 * @param {string} userId
 * @returns {Promise<{data: null, error: null}>}
 */
export async function removeEventRsvp(broadcastId, userId) {
  const { data, error } = await supabase
    .from('event_rsvps')
    .delete()
    .eq('broadcast_id', broadcastId)
    .eq('user_id', userId)
    .select();

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('RSVP_NOT_FOUND');
  }
  return { data, error: null };
}
