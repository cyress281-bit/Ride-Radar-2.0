/**
 * Notifications API layer for Ride Radar 2.0.
 *
 * All functions return `{ data, error }` to match the Supabase client convention.
 */

import { supabase } from '@/lib/supabase.js';
import { logger } from '@/lib/logger.js';
import { normalizeNotifications } from '@/lib/notificationNormalizer.js';

/**
 * Fetch notifications for a user, ordered by created_at descending.
 *
 * @param {string} userId
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    logger.error('[getNotifications] Error:', error);
    return { data: null, error };
  }

  return { data: normalizeNotifications(data || []), error: null };
}

/**
 * Count unread notifications for a user.
 *
 * @param {string} userId
 * @returns {Promise<{data: number, error: Error|null}>}
 */
export async function getUnreadCount(userId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    logger.error('[getUnreadCount] Error:', error);
    return { data: 0, error };
  }

  return { data: count ?? 0, error: null };
}

/**
 * Mark a single notification as read.
 *
 * @param {string} notificationId
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function markAsRead(notificationId) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) logger.error('[markAsRead] Error:', error);
  return { data, error };
}

/**
 * Mark all notifications as read for a user.
 *
 * @param {string} userId
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function markAllAsRead(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select();

  if (error) logger.error('[markAllAsRead] Error:', error);
  return { data, error };
}

/**
 * Delete a notification by ID.
 *
 * @param {string} notificationId
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function deleteNotification(notificationId) {
  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .select()
    .single();

  if (error) logger.error('[deleteNotification] Error:', error);
  return { data, error };
}
