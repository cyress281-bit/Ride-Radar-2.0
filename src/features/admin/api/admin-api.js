import { supabase } from '@/lib/supabase.js';
import { logger } from '@/lib/logger.js';

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

async function assertAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (error || data?.role !== 'admin') throw new Error('Admin access required');
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
