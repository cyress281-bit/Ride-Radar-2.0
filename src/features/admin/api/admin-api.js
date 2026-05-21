import { supabase } from '@/lib/supabase.js';
import { logger } from '@/lib/logger.js';
import { geocodeAddress, approximateLocation } from '@/lib/geocoding.js';

/**
 * @typedef {Object} ApiResult
 * @property {Array|object|null} data
 * @property {Error|null} error
 */

/**
 * Fetch all users (limit 200).
 * @returns {Promise<ApiResult>}
 */
export async function getUsers() {
  await assertAdmin();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  return { data: data || [], error };
}

/**
 * Fetch all broadcasts (limit 200).
 * @returns {Promise<ApiResult>}
 */
export async function getBroadcasts() {
  await assertAdmin();
  const { data, error } = await supabase
    .from('broadcasts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  return { data: data || [], error };
}

/**
 * Fetch all profiles (limit 200).
 * @returns {Promise<ApiResult>}
 */
export async function getProfiles() {
  await assertAdmin();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200);
  return { data: data || [], error };
}

/**
 * Fetch all reports (limit 200).
 * @returns {Promise<ApiResult>}
 */
export async function getReports() {
  await assertAdmin();
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  return { data: data || [], error };
}

/**
 * Fetch all blocks (limit 200).
 * @returns {Promise<ApiResult>}
 */
export async function getBlocks() {
  await assertAdmin();
  const { data, error } = await supabase
    .from('user_blocks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  return { data: data || [], error };
}

/**
 * Fetch all notifications (limit 200).
 * @returns {Promise<ApiResult>}
 */
export async function getNotifications() {
  await assertAdmin();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  return { data: data || [], error };
}

/**
 * Fetch account deletion requests (limit 200).
 * @returns {Promise<ApiResult>}
 */
export async function getDeletionRequests() {
  await assertAdmin();
  const { data, error } = await supabase
    .from('account_deletion_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  return { data: data || [], error };
}

/**
 * Fetch all conversations (limit 200).
 * @returns {Promise<ApiResult>}
 */
export async function getConversations() {
  await assertAdmin();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(200);
  return { data: data || [], error };
}

/**
 * Fetch official event review requests (limit 200).
 * @returns {Promise<ApiResult>}
 */
export async function getOfficialEventRequests() {
  await assertAdmin();
  const { data, error } = await supabase
    .from('official_event_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  return { data: data || [], error };
}

/**
 * Fetch RSVP counts for a batch of event/broadcast ids.
 * Returns a map keyed by broadcast_id with total RSVP counts.
 *
 * @param {string[]} eventIds
 * @returns {Promise<ApiResult>}
 */
export async function getEventRsvpCounts(eventIds = []) {
  await assertAdmin();

  const uniqueIds = Array.from(
    new Set((Array.isArray(eventIds) ? eventIds : []).filter((id) => typeof id === 'string' && id.length > 0))
  );

  if (uniqueIds.length === 0) {
    return { data: {}, error: null };
  }

  const { data, error } = await supabase
    .from('event_rsvps')
    .select('broadcast_id')
    .in('broadcast_id', uniqueIds);

  if (error) return { data: null, error };

  const counts = {};
  for (const id of uniqueIds) {
    counts[id] = 0;
  }
  for (const row of data || []) {
    if (!row?.broadcast_id) continue;
    counts[row.broadcast_id] = (counts[row.broadcast_id] || 0) + 1;
  }

  return { data: counts, error: null };
}

async function assertAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (error || data?.role !== 'admin') throw new Error('Admin access required');
  return user;
}

function normalizeAdminNote(adminNote) {
  const note = String(adminNote || '').trim();
  return note || null;
}

async function reviewOfficialEventRequest(requestId, nextStatus, adminNote) {
  const adminUser = await assertAdmin();

  if (!requestId || !String(requestId).trim()) {
    return { data: null, error: new Error('Request id is required.') };
  }

  if (!['approved', 'declined'].includes(nextStatus)) {
    return { data: null, error: new Error('Invalid official review status.') };
  }

  const { data: request, error: requestFetchError } = await supabase
    .from('official_event_requests')
    .select('id, status, broadcast_id')
    .eq('id', requestId)
    .maybeSingle();

  if (requestFetchError) {
    return { data: null, error: requestFetchError };
  }

  if (!request) {
    return { data: null, error: new Error('Official review request not found.') };
  }

  if (request.status !== 'pending') {
    return { data: null, error: new Error('Only pending requests can be reviewed.') };
  }

  const { data: broadcast, error: broadcastFetchError } = await supabase
    .from('broadcasts')
    .select('id, type, is_official')
    .eq('id', request.broadcast_id)
    .maybeSingle();

  if (broadcastFetchError) {
    return { data: null, error: broadcastFetchError };
  }

  if (!broadcast) {
    return { data: null, error: new Error('Related event broadcast was not found.') };
  }

  if (broadcast.type !== 'event') {
    return { data: null, error: new Error('Only event broadcasts can be reviewed for Official status.') };
  }

  const note = normalizeAdminNote(adminNote);
  const reviewedAt = new Date().toISOString();

  if (nextStatus === 'approved' && !broadcast.is_official) {
    const { error: officialUpdateError } = await supabase
      .from('broadcasts')
      .update({ is_official: true })
      .eq('id', broadcast.id);

    if (officialUpdateError) {
      return { data: null, error: officialUpdateError };
    }
  }

  const { data: updatedRequest, error: updateError } = await supabase
    .from('official_event_requests')
    .update({
      status: nextStatus,
      reviewed_by: adminUser.id,
      reviewed_at: reviewedAt,
      admin_note: note,
    })
    .eq('id', request.id)
    .select()
    .maybeSingle();

  if (updateError) {
    if (nextStatus === 'approved' && !broadcast.is_official) {
      const { error: rollbackError } = await supabase
        .from('broadcasts')
        .update({ is_official: false })
        .eq('id', broadcast.id);

      if (rollbackError) {
        logger.error('[reviewOfficialEventRequest] Rollback failed:', rollbackError);
      }
    }

    return { data: null, error: updateError };
  }

  return { data: updatedRequest, error: null };
}

/**
 * Approve an official event review request and mark the related event official.
 * @param {string} requestId
 * @param {string} [adminNote]
 * @returns {Promise<ApiResult>}
 */
export async function approveOfficialEventRequest(requestId, adminNote) {
  logger.info(`[admin] Approving official event request ${requestId}`);
  return reviewOfficialEventRequest(requestId, 'approved', adminNote);
}

/**
 * Decline an official event review request.
 * @param {string} requestId
 * @param {string} [adminNote]
 * @returns {Promise<ApiResult>}
 */
export async function declineOfficialEventRequest(requestId, adminNote) {
  logger.info(`[admin] Declining official event request ${requestId}`);
  return reviewOfficialEventRequest(requestId, 'declined', adminNote);
}

/**
 * Fetch total user count.
 * @returns {Promise<ApiResult>}
 */
export async function getUserCount() {
  await assertAdmin();
  const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
  return { data: count ?? 0, error };
}

/**
 * Fetch active broadcast count.
 * @returns {Promise<ApiResult>}
 */
export async function getActiveBroadcastCount() {
  await assertAdmin();
  const { count, error } = await supabase
    .from('broadcasts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  return { data: count ?? 0, error };
}

/**
 * Fetch pending (non-closed) report count.
 * @returns {Promise<ApiResult>}
 */
export async function getPendingReportCount() {
  await assertAdmin();
  const { count, error } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .in('status', ['open', 'reviewed']);
  return { data: count ?? 0, error };
}

/**
 * Fetch active conversation count.
 * @returns {Promise<ApiResult>}
 */
export async function getActiveConversationCount() {
  await assertAdmin();
  const { count, error } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  return { data: count ?? 0, error };
}

/**
 * Get counts for today: broadcasts, messages, reports, connections.
 * @returns {Promise<ApiResult>}
 */
export async function getTodaysStats() {
  await assertAdmin();
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

  const readCount = async (table, label) => {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart);
    if (error) throw new Error(`${label}: ${error.message}`);
    return count || 0;
  };

  try {
    const [broadcasts, messages, reports, connections] = await Promise.all([
      readCount('broadcasts', 'Broadcasts today'),
      readCount('messages', 'Messages today'),
      readCount('reports', 'Reports today'),
      readCount('connection_requests', 'Connections today'),
    ]);
    return {
      data: { broadcasts, messages, reports, connections },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Update a report's status.
 * @param {string} id
 * @param {string} status
 * @returns {Promise<ApiResult>}
 */
export async function updateReportStatus(id, status) {
  await assertAdmin();
  logger.info(`[admin] Updating report ${id} status to ${status}`);
  const { data, error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', id)
    .select()
    .maybeSingle();
  return { data, error };
}

/**
 * Update a user's role.
 * @param {string} id
 * @param {string} role
 * @returns {Promise<ApiResult>}
 */
export async function updateUserRole(id, role) {
  await assertAdmin();
  const ALLOWED_ROLES = ['user', 'admin', 'moderator'];
  if (!ALLOWED_ROLES.includes(role)) {
    return { data: null, error: new Error(`Invalid role. Must be one of: ${ALLOWED_ROLES.join(', ')}`) };
  }
  logger.info(`[admin] Updating user ${id} role to ${role}`);
  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', id)
    .select()
    .maybeSingle();
  return { data, error };
}

/**
 * Expire a broadcast (admin action).
 * @param {string} id
 * @returns {Promise<ApiResult>}
 */
export async function expireBroadcast(id) {
  await assertAdmin();
  logger.info(`[admin] Expiring broadcast ${id}`);
  const { data, error } = await supabase
    .from('broadcasts')
    .update({ status: 'expired' })
    .eq('id', id)
    .select()
    .maybeSingle();
  return { data, error };
}

function applyRepeatOffset(baseDate, i, repeat) {
  const d = new Date(baseDate);
  if (repeat === 'weekly') d.setDate(d.getDate() + i * 7);
  else if (repeat === 'monthly') d.setMonth(d.getMonth() + i);
  return d;
}

function normalizeLocationText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function toIsoDateTime(value, fieldLabel) {
  const raw = String(value || '').trim();
  if (!raw) {
    throw new Error(`${fieldLabel} is required.`);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldLabel} must be a valid date and time.`);
  }

  return parsed.toISOString();
}

/**
 * Create a new official Meetup/Event broadcast (admin action).
 * Geocodes the location text and stores approximated coordinates.
 * Author is always the current authenticated admin.
 *
 * @param {object} eventData
 * @param {string} eventData.title
 * @param {string} eventData.locationText
 * @param {string} eventData.eventDate - datetime-local string or ISO
 * @param {string} eventData.eventEndTime - datetime-local string or ISO; stored as expires_at
 * @param {string} [eventData.body]
 * @returns {Promise<ApiResult>}
 */
export async function createAdminEvent({ title, locationText, eventDate, eventEndTime, body, repeat = 'none' }) {
  await assertAdmin();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { data: null, error: authError || new Error('Admin user not found.') };
  }

  let geocodeResult;
  try {
    geocodeResult = await geocodeAddress(locationText.trim());
  } catch {
    return { data: null, error: new Error('Geocoding service unavailable. Please try again.') };
  }

  if (!geocodeResult) {
    return {
      data: null,
      error: new Error('Could not locate that address. Try adding a city, landmark, or street.'),
    };
  }

  const frozenLocation = approximateLocation(
    geocodeResult.lat,
    geocodeResult.lng,
    `${user.id}:${new Date().toISOString()}:event:${locationText}`
  );

  if (!frozenLocation) {
    return { data: null, error: new Error('Location geocoding failed. Please try a different address.') };
  }

  const count = repeat === 'weekly' ? 5 : repeat === 'monthly' ? 4 : 1;
  const durationMs = new Date(eventEndTime) - new Date(eventDate);
  const baseStart = new Date(eventDate);

  logger.info(`[admin] Creating event "${title}" @ ${locationText} on ${eventDate} (repeat=${repeat}, count=${count})`);

  for (let i = 0; i < count; i++) {
    const occStart = applyRepeatOffset(baseStart, i, repeat);
    const occEnd = new Date(occStart.getTime() + durationMs);

    const { error } = await supabase
      .from('broadcasts')
      .insert({
        author_id: user.id,
        type: 'event',
        status: 'active',
        title: title.trim(),
        body: body?.trim() || null,
        location_name: locationText.trim(),
        frozen_lat: frozenLocation.lat,
        frozen_lng: frozenLocation.lng,
        event_date: occStart.toISOString(),
        expires_at: occEnd.toISOString(),
      })
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error: new Error(
          `Created ${i} of ${count} occurrence${count === 1 ? '' : 's'}. Insert failed: ${error.message}`
        ),
      };
    }
  }

  return { data: { created: count }, error: null };
}

/**
 * Update an existing official Meetup/Event broadcast (admin action).
 * Only supports event broadcasts and only a limited set of editable fields.
 *
 * @param {string} id
 * @param {object} fields
 * @returns {Promise<ApiResult>}
 */
export async function updateAdminEvent(id, fields = {}) {
  await assertAdmin();

  if (!id || !String(id).trim()) {
    return { data: null, error: new Error('Event id is required.') };
  }

  const { data: existing, error: fetchError } = await supabase
    .from('broadcasts')
    .select('id, type, title, body, location_name, frozen_lat, frozen_lng, event_date, expires_at, author_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) return { data: null, error: fetchError };
  if (!existing) return { data: null, error: new Error('Event not found.') };
  if (existing.type !== 'event') {
    return { data: null, error: new Error('Only event broadcasts can be edited from Admin Events.') };
  }

  const updates = {};

  if (Object.prototype.hasOwnProperty.call(fields, 'title')) {
    const nextTitle = String(fields.title || '').trim();
    if (nextTitle.length < 3) {
      return { data: null, error: new Error('Title must be at least 3 characters.') };
    }
    if (nextTitle.length > 120) {
      return { data: null, error: new Error('Title must be 120 characters or fewer.') };
    }
    updates.title = nextTitle;
  }

  if (Object.prototype.hasOwnProperty.call(fields, 'body')) {
    const nextBody = String(fields.body || '').trim();
    if (nextBody.length > 500) {
      return { data: null, error: new Error('Description must be 500 characters or fewer.') };
    }
    updates.body = nextBody || null;
  }

  const hasLocationField = Object.prototype.hasOwnProperty.call(fields, 'locationText');
  if (hasLocationField) {
    const nextLocationText = normalizeLocationText(fields.locationText);
    const currentLocationText = normalizeLocationText(existing.location_name);

    if (!nextLocationText) {
      return { data: null, error: new Error('Location is required.') };
    }

    if (nextLocationText !== currentLocationText) {
      let geocodeResult;
      try {
        geocodeResult = await geocodeAddress(nextLocationText);
      } catch {
        return { data: null, error: new Error('Geocoding service unavailable. Please try again.') };
      }

      if (!geocodeResult) {
        return {
          data: null,
          error: new Error('Could not locate that address. Try adding a city, landmark, or street.'),
        };
      }

      const frozenLocation = approximateLocation(
        geocodeResult.lat,
        geocodeResult.lng,
        `${existing.author_id || 'admin'}:${new Date().toISOString()}:event:${nextLocationText}`
      );

      if (!frozenLocation) {
        return { data: null, error: new Error('Location geocoding failed. Please try a different address.') };
      }

      updates.location_name = nextLocationText;
      updates.frozen_lat = frozenLocation.lat;
      updates.frozen_lng = frozenLocation.lng;
    }
  }

  const resolvedEventDateInput = Object.prototype.hasOwnProperty.call(fields, 'eventDate')
    ? fields.eventDate
    : existing.event_date;
  const resolvedEventEndInput = Object.prototype.hasOwnProperty.call(fields, 'eventEndTime')
    ? fields.eventEndTime
    : existing.expires_at;

  const resolvedEventDate = resolvedEventDateInput ? toIsoDateTime(resolvedEventDateInput, 'Start time') : null;
  const resolvedEventEndTime = resolvedEventEndInput ? toIsoDateTime(resolvedEventEndInput, 'End time') : null;

  if (!resolvedEventDate) {
    return { data: null, error: new Error('Start time is required.') };
  }
  if (!resolvedEventEndTime) {
    return { data: null, error: new Error('End time is required.') };
  }
  if (new Date(resolvedEventEndTime) <= new Date(resolvedEventDate)) {
    return { data: null, error: new Error('End time must be after start time.') };
  }

  updates.event_date = resolvedEventDate;
  updates.expires_at = resolvedEventEndTime;

  if (Object.keys(updates).length === 0) {
    return { data: existing, error: null };
  }

  const { data, error } = await supabase
    .from('broadcasts')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  return { data, error };
}

/**
 * Toggle the official flag on an existing event broadcast.
 *
 * @param {string} id
 * @param {boolean} isOfficial
 * @returns {Promise<ApiResult>}
 */
export async function toggleOfficialEvent(id, isOfficial) {
  await assertAdmin();

  if (!id || !String(id).trim()) {
    return { data: null, error: new Error('Event id is required.') };
  }

  const { data: existing, error: fetchError } = await supabase
    .from('broadcasts')
    .select('id, type, status, event_date, expires_at, is_official')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) return { data: null, error: fetchError };
  if (!existing) return { data: null, error: new Error('Event not found.') };
  if (existing.type !== 'event') {
    return { data: null, error: new Error('Only event broadcasts can be marked official.') };
  }

  const { data, error } = await supabase
    .from('broadcasts')
    .update({ is_official: Boolean(isOfficial) })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message || 'Failed to update official status.') };
  }

  return { data, error: null };
}

/**
 * Schedule a new occurrence of an existing event broadcast (admin action).
 * Creates a fresh broadcast row with a new event_date and the current admin as author.
 * Does NOT copy id, original author_id, created_at, updated_at, status, alert_type,
 * alert_photos, iso_subtype, location (geography), RSVPs, comments, reports, or
 * moderation state.
 *
 * @param {object} sourceBroadcast - The existing event broadcast to copy from
 * @param {string} newEventDate - ISO string or date-parseable string for the new event_date
 * @param {string} [newTitle] - Optional override for the title; falls back to source title
 * @returns {Promise<ApiResult>}
 */
export async function scheduleEventOccurrence(sourceBroadcast, newEventDate, newTitle) {
  await assertAdmin();

  if (!sourceBroadcast) {
    return { data: null, error: new Error('Source broadcast is required.') };
  }
  if (sourceBroadcast.type !== 'event') {
    return { data: null, error: new Error('Only event broadcasts can have occurrences scheduled.') };
  }

  const parsedDate = new Date(newEventDate);
  if (!newEventDate || isNaN(parsedDate.getTime())) {
    return { data: null, error: new Error('A valid event date is required.') };
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { data: null, error: authError || new Error('Admin user not found.') };
  }

  logger.info(`[admin] Scheduling event occurrence from broadcast ${sourceBroadcast.id} → ${parsedDate.toISOString()}`);

  const { data, error } = await supabase
    .from('broadcasts')
    .insert({
      author_id: user.id,
      type: 'event',
      status: 'active',
      title: newTitle?.trim() || sourceBroadcast.title,
      body: sourceBroadcast.body || null,
      frozen_lat: sourceBroadcast.frozen_lat,
      frozen_lng: sourceBroadcast.frozen_lng,
      location_name: sourceBroadcast.location_name,
      event_image_url: sourceBroadcast.event_image_url || null,
      event_date: parsedDate.toISOString(),
      expires_at: null,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Delete a broadcast (admin action).
 * @param {string} id
 * @returns {Promise<ApiResult>}
 */
export async function deleteBroadcast(id) {
  await assertAdmin();
  logger.info(`[admin] Deleting broadcast ${id}`);
  const { data, error } = await supabase
    .from('broadcasts')
    .delete()
    .eq('id', id)
    .select()
    .maybeSingle();
  return { data, error };
}

/**
 * Send a global announcement.
 * Tries Edge Function first, falls back to batch insert (500 rows at a time).
 * @param {string} title
 * @param {string} body
 * @returns {Promise<ApiResult>}
 */
export async function sendAnnouncement(title, body) {
  await assertAdmin();
  logger.info(`[admin] Sending announcement: ${title}`);
  // Try Edge Function first
  try {
    const { error: fnError } = await supabase.functions.invoke('send-announcement', {
      body: {
        title,
        body,
        type: 'announcement',
        send_to_all: true,
      },
    });
    if (!fnError) {
      return { data: { method: 'edge_function' }, error: null };
    }
  } catch {
    // Fall through to batch insert
  }

  // Fallback: batch insert notifications (capped at 10k users)
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id')
    .limit(10000);

  if (usersError) return { data: null, error: usersError };

  const rows = (users || []).map((userRow) => ({
    user_id: userRow.id,
    type: 'announcement',
    title,
    body,
    is_global: true,
  }));

  if (rows.length === 0) return { data: { method: 'batch_insert', count: 0 }, error: null };

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase
      .from('notifications')
      .insert(rows.slice(i, i + 500));
    if (error) return { data: null, error };
  }

  return { data: { method: 'batch_insert', count: rows.length }, error: null };
}
