/**
 * Profile API layer for Ride Radar 2.0.
 *
 * All functions return `{ data, error }` to stay consistent with Supabase
 * and allow callers to decide how to handle failures.
 */

import { supabase } from '@/lib/supabase';
import { isValidUuid } from '@/lib/utils';

const CHUNK_SIZE = 50;

/**
 * Fetch a single profile by Supabase Auth user_id.
 * @param {string} userId
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function getProfileByUserId(userId) {
  if (!isValidUuid(userId)) return { data: null, error: new Error('Invalid userId') };

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return { data, error };
}

/**
 * Fetch a single profile by its internal profile id.
 * @param {string} profileId
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function getProfileById(profileId) {
  if (!isValidUuid(profileId)) return { data: null, error: new Error('Invalid profileId') };

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle();

  return { data, error };
}

/**
 * Batch fetch multiple public profiles by their user_ids.
 * Automatically chunks requests to stay within Supabase URL-length limits.
 * @param {string[]} ids
 * @returns {Promise<{data: object[], error: Error|null}>}
 */
export async function listProfilesByIds(ids) {
  const uniqueIds = Array.from(new Set(ids.filter(isValidUuid)));
  if (uniqueIds.length === 0) return { data: [], error: null };

  const chunks = [];
  for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
    chunks.push(uniqueIds.slice(i, i + CHUNK_SIZE));
  }

  try {
    const results = await Promise.all(
      chunks.map((chunk) =>
        supabase
          .from('user_profiles')
          .select('*')
          .in('user_id', chunk)
      )
    );

    const firstError = results.find((r) => r.error)?.error;
    if (firstError) return { data: [], error: firstError };

    const merged = results.flatMap((r) => r.data || []);
    const seen = new Set();
    const deduped = merged.filter((p) => {
      if (!p?.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    return { data: deduped, error: null };
  } catch (error) {
    return { data: [], error };
  }
}

/**
 * Update the current user's profile row.
 * @param {string} userId
 * @param {object} updates
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function updateProfile(userId, updates) {
  if (!isValidUuid(userId)) return { data: null, error: new Error('Invalid userId') };

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  return { data, error };
}

/**
 * Fetch public profiles for a list of user IDs via RPC.
 * Falls back to listProfilesByIds if the RPC is unavailable.
 * @param {string[]} userIds
 * @returns {Promise<{data: object[], error: Error|null}>}
 */
export async function getPublicProfiles(userIds) {
  const uniqueIds = Array.from(new Set(userIds.filter(isValidUuid)));
  if (uniqueIds.length === 0) return { data: [], error: null };

  const { data, error } = await supabase.rpc('get_public_profiles', {
    user_ids: uniqueIds,
  });

  if (error?.code === '42883') {
    // RPC not found — fallback to standard query
    return listProfilesByIds(uniqueIds);
  }

  return { data: data || [], error };
}

/**
 * Check whether a username is already taken.
 * @param {string} username
 * @returns {Promise<{data: boolean, error: Error|null}>}
 */
export async function checkUsernameAvailability(username) {
  const trimmed = String(username || '').trim().toLowerCase();
  if (!trimmed) return { data: false, error: null };

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('username', trimmed)
    .maybeSingle();

  if (error) return { data: false, error };
  return { data: !data, error: null };
}

/**
 * Text search across display_name and username.
 * Uses two separate queries to avoid structure injection in .or()
 * @param {string} query
 * @returns {Promise<{data: object[], error: Error|null}>}
 */
export async function searchProfiles(query) {
  const trimmed = String(query || '').trim();
  if (!trimmed) return { data: [], error: null };

  const pattern = `%${trimmed}%`;
  const [displayNameResult, usernameResult] = await Promise.all([
    supabase.from('user_profiles').select('*').ilike('display_name', pattern).eq('is_public', true).limit(20),
    supabase.from('user_profiles').select('*').ilike('username', pattern).eq('is_public', true).limit(20),
  ]);

  const error = displayNameResult.error || usernameResult.error;
  if (error) return { data: [], error };

  const merged = [...(displayNameResult.data || []), ...(usernameResult.data || [])];
  const seen = new Set();
  const deduped = merged.filter((p) => {
    if (!p?.id || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  return { data: deduped.slice(0, 20), error: null };
}
