/**
 * @fileoverview Safety API layer for Ride Radar 2.0.
 *
 * All functions return `{ data, error }` to stay consistent with Supabase
 * and allow callers to decide how to handle failures.
 */

import { supabase } from '@/lib/supabase.js';
import { isValidUuid } from '@/lib/utils.js';
import { throttle } from '@/lib/throttle.js';

/**
 * Create a report.
 * @param {object} params
 * @param {string} params.reporter_user_id
 * @param {string} params.target_type
 * @param {string} params.target_id
 * @param {string} params.target_user_id
 * @param {string} params.reason
 * @param {string} [params.details]
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export const createReport = throttle(async function createReport({
  reporter_user_id,
  target_type,
  target_id,
  target_user_id,
  reason,
  details,
  target_parent_id,
}) {
  if (!isValidUuid(reporter_user_id)) {
    return { data: null, error: new Error('Invalid reporter_user_id') };
  }
  if (!isValidUuid(target_user_id)) {
    return { data: null, error: new Error('Invalid target_user_id') };
  }
  if (!reason) {
    return { data: null, error: new Error('Reason is required') };
  }
  if (target_parent_id && !isValidUuid(target_parent_id)) {
    return { data: null, error: new Error('Invalid target_parent_id') };
  }

  const payload = {
    reporter_user_id,
    target_type,
    target_id,
    target_user_id,
    reason,
    details: details?.trim() || null,
    status: 'open',
  };

  const { data, error } = await supabase
    .from('reports')
    .insert(payload)
    .select()
    .single();

  return { data, error };
}, 30_000);

/**
 * Fetch reports created by a user.
 * @param {string} userId
 * @returns {Promise<{data: object[], error: Error|null}>}
 */
export async function getReports(userId) {
  if (!isValidUuid(userId)) return { data: [], error: new Error('Invalid userId') };

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('reporter_user_id', userId)
    .order('created_at', { ascending: false });

  return { data: data || [], error };
}

/**
 * Create a block.
 * @param {object} params
 * @param {string} params.blocker_user_id
 * @param {string} params.blocked_user_id
 * @param {string} [params.reason]
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function createBlock({ blocker_user_id, blocked_user_id, reason }) {
  if (!isValidUuid(blocker_user_id) || !isValidUuid(blocked_user_id)) {
    return { data: null, error: new Error('Invalid user IDs') };
  }

  const { data, error } = await supabase
    .from('user_blocks')
    .insert({
      blocker_user_id,
      blocked_user_id,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Fetch blocks created by a user.
 * @param {string} userId
 * @returns {Promise<{data: object[], error: Error|null}>}
 */
export async function getBlocks(userId) {
  if (!isValidUuid(userId)) return { data: [], error: new Error('Invalid userId') };

  const { data, error } = await supabase
    .from('user_blocks')
    .select('*')
    .eq('blocker_user_id', userId)
    .order('created_at', { ascending: false });

  return { data: data || [], error };
}

/**
 * Remove a block by ID.
 * @param {string} blockId
 * @returns {Promise<{data: null, error: Error|null}>}
 */
export async function removeBlock(blockId) {
  if (!isValidUuid(blockId)) return { data: null, error: new Error('Invalid blockId') };

  const { data, error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('id', blockId)
    .select('id');

  if (error) return { data: null, error };
  // An RLS-blocked or non-existent delete returns { error: null, data: [] } —
  // surface it so an unblock can't silently no-op and leave the user still blocked.
  if (!data || data.length === 0) {
    return { data: null, error: new Error('Block not found or you do not have permission to remove it.') };
  }
  return { data: null, error: null };
}

/**
 * Check if a user has blocked a target user.
 * @param {string} userId
 * @param {string} targetId
 * @returns {Promise<{data: boolean, error: Error|null}>}
 */
export async function isBlocked(userId, targetId) {
  if (!isValidUuid(userId) || !isValidUuid(targetId)) {
    return { data: false, error: new Error('Invalid user IDs') };
  }

  const { data, error } = await supabase
    .from('user_blocks')
    .select('id')
    .eq('blocker_user_id', userId)
    .eq('blocked_user_id', targetId)
    .maybeSingle();

  if (error) return { data: false, error };
  return { data: !!data, error: null };
}
