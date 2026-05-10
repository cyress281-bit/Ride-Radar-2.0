import { supabase } from '@/lib/supabase.js';

/**
 * @typedef {Object} ApiResult
 * @property {Array|object|null} data
 * @property {Error|null} error
 */

/**
 * Fetch all users (limit 1000).
 * @returns {Promise<ApiResult>}
 */
export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);
  return { data: data || [], error };
}

/**
 * Fetch all broadcasts (limit 1000).
 * @returns {Promise<ApiResult>}
 */
export async function getBroadcasts() {
  const { data, error } = await supabase
    .from('broadcasts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);
  return { data: data || [], error };
}

/**
 * Fetch all profiles (limit 1000).
 * @returns {Promise<ApiResult>}
 */
export async function getProfiles() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1000);
  return { data: data || [], error };
}

/**
 * Fetch all reports (limit 500).
 * @returns {Promise<ApiResult>}
 */
export async function getReports() {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  return { data: data || [], error };
}

/**
 * Fetch all blocks (limit 500).
 * @returns {Promise<ApiResult>}
 */
export async function getBlocks() {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  return { data: data || [], error };
}

/**
 * Fetch all notifications (limit 500).
 * @returns {Promise<ApiResult>}
 */
export async function getNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  return { data: data || [], error };
}

/**
 * Fetch account deletion requests (limit 500).
 * @returns {Promise<ApiResult>}
 */
export async function getDeletionRequests() {
  const { data, error } = await supabase
    .from('account_deletion_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  return { data: data || [], error };
}

/**
 * Fetch all conversations (limit 1000).
 * @returns {Promise<ApiResult>}
 */
export async function getConversations() {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(1000);
  return { data: data || [], error };
}

/**
 * Get counts for today: broadcasts, messages, reports, connections.
 * @returns {Promise<ApiResult>}
 */
export async function getTodaysStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

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
  const { data, error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

/**
 * Update a user's role.
 * @param {string} id
 * @param {string} role
 * @returns {Promise<ApiResult>}
 */
export async function updateUserRole(id, role) {
  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

/**
 * Expire a broadcast (admin action).
 * @param {string} id
 * @returns {Promise<ApiResult>}
 */
export async function expireBroadcast(id) {
  const { data, error } = await supabase
    .from('broadcasts')
    .update({ status: 'expired' })
    .eq('id', id)
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
  const { data, error } = await supabase
    .from('broadcasts')
    .delete()
    .eq('id', id)
    .select()
    .single();
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

  // Fallback: batch insert notifications
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id');

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
