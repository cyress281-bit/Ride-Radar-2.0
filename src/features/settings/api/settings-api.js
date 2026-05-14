/**
 * Settings API layer for Ride Radar 2.0.
 *
 * All functions return `{ data, error }` to match the Supabase client convention.
 */

import { supabase } from '@/lib/supabase.js';
import { logger } from '@/lib/logger.js';

/** @type {object} Default settings for new users. */
const DEFAULT_SETTINGS = {
  notifications_enabled: true,
  live_map_visible: false,
  live_map_location_precision: 'approximate',
  analytics_enabled: true,
};

/**
 * Fetch a user's settings row.
 *
 * @param {string} userId
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function getSettings(userId) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('[getSettings] Error:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Fetch or create default settings for a user.
 *
 * @param {string} userId
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function getOrCreateSettings(userId) {
  const { data: existing, error: fetchError } = await getSettings(userId);

  if (fetchError) return { data: null, error: fetchError };
  if (existing) return { data: existing, error: null };

  const { data: created, error: createError } = await supabase
    .from('user_settings')
    .insert({ ...DEFAULT_SETTINGS, user_id: userId })
    .select()
    .single();

  if (createError) {
    logger.error('[getOrCreateSettings] Create error:', createError);
    return { data: null, error: createError };
  }

  return { data: created, error: null };
}

/**
 * Update a user's settings.
 *
 * @param {string} userId
 * @param {object} updates
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function updateSettings(userId, updates) {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ ...updates, user_id: userId }, { onConflict: 'user_id' })
    .select()
    .maybeSingle();

  if (error) {
    logger.error('[updateSettings] Error:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Delete the current user's account via RPC.
 *
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function deleteAccount() {
  const { data, error } = await supabase.rpc('delete_user_account');

  if (error) logger.error('[deleteAccount] Error:', error);
  return { data, error };
}
