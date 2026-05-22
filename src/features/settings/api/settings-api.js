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
  notify_messages: true,
  notify_meetups: true,
  notify_safety_alerts: true,
  notify_connections: true,
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
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser?.id) {
    logger.error('[updateSettings] Auth validation error:', authError);
    return {
      data: null,
      error: authError || new Error('Session expired. Please log in again.'),
    };
  }

  if (authUser.id !== userId) {
    const mismatchError = new Error('Authenticated user does not match settings owner.');
    logger.error('[updateSettings] User mismatch:', {
      authUserId: authUser.id,
      requestedUserId: userId,
    });
    return { data: null, error: mismatchError };
  }

  const { data: existing, error: fetchError } = await getSettings(userId);
  if (fetchError) return { data: null, error: fetchError };

  if (!existing) {
    const { data: created, error: createError } = await supabase
      .from('user_settings')
      .insert({ ...DEFAULT_SETTINGS, ...updates, user_id: userId })
      .select()
      .single();

    if (createError) {
      logger.error('[updateSettings] Create error:', createError);
      return { data: null, error: createError };
    }

    return { data: created, error: null };
  }

  const { data, error } = await supabase
    .from('user_settings')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) {
    logger.error('[updateSettings] Error:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Remove all files under a storage folder prefix (best-effort, non-fatal).
 * @param {string} bucket
 * @param {string} prefix e.g. "avatars/user-uuid"
 */
function createStorageCleanupResult(bucket, prefix, recursive) {
  return {
    bucket,
    prefix,
    recursive,
    success: true,
    scannedPrefixes: 0,
    removedFiles: 0,
    issues: [],
  };
}

function describeStorageError(error) {
  return {
    message: error?.message || String(error),
    code: error?.code ?? null,
    status: error?.status ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
  };
}

function recordStorageCleanupIssue(result, stage, error, extra = {}) {
  result.success = false;
  result.issues.push({
    stage,
    error: describeStorageError(error),
    ...extra,
  });
}

async function purgeStorageFolder(bucket, prefix) {
  const result = createStorageCleanupResult(bucket, prefix, false);

  const { data: files, error: listError } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  result.scannedPrefixes = 1;

  if (listError) {
    recordStorageCleanupIssue(result, 'list', listError);
    logger.warn('[deleteAccount] Storage cleanup list failed (non-fatal):', result);
    return result;
  }

  if (!files?.length) {
    return result;
  }

  const paths = files.map((f) => `${prefix}/${f.name}`);
  result.removedFiles = paths.length;

  const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
  if (removeError) {
    recordStorageCleanupIssue(result, 'remove', removeError, { pathsRemoved: paths.length });
    logger.warn('[deleteAccount] Storage cleanup removal failed (non-fatal):', result);
  }

  return result;
}

/**
 * Recursively remove all files under a storage folder prefix.
 * Best-effort and non-fatal, matching the existing deletion behavior.
 *
 * @param {string} bucket
 * @param {string} prefix
 */
async function purgeStorageFolderRecursive(bucket, prefix) {
  const result = createStorageCleanupResult(bucket, prefix, true);
  const queue = [prefix];
  const filesToRemove = [];

  while (queue.length > 0) {
    const currentPrefix = queue.shift();
    const { data: entries, error } = await supabase.storage.from(bucket).list(currentPrefix, { limit: 1000 });
    result.scannedPrefixes += 1;

    if (error) {
      recordStorageCleanupIssue(result, 'list', error, { currentPrefix });
      logger.warn('[deleteAccount] Storage cleanup scan failed (non-fatal):', result);
      continue;
    }

    for (const entry of entries || []) {
      const nextPath = `${currentPrefix}/${entry.name}`;
      if (entry.metadata) {
        filesToRemove.push(nextPath);
      } else {
        queue.push(nextPath);
      }
    }
  }

  if (filesToRemove.length === 0) {
    return result;
  }

  result.removedFiles = filesToRemove.length;

  const { error } = await supabase.storage.from(bucket).remove(filesToRemove);
  if (error) {
    recordStorageCleanupIssue(result, 'remove', error, { pathsRemoved: filesToRemove.length });
    logger.warn('[deleteAccount] Storage cleanup removal failed (non-fatal):', result);
  }

  return result;
}

/**
 * Delete the current user's account via RPC.
 * Attempts to remove user-owned storage objects first (best-effort).
 *
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function deleteAccount() {
  // Purge user-owned storage before removing the DB row so we still have
  // auth.uid() available and storage RLS can verify ownership.
  const { data: { user } } = await supabase.auth.getUser();
  let storageCleanupResults = [];
  if (user?.id) {
    const userId = user.id;
    storageCleanupResults = await Promise.all([
      purgeStorageFolder('uploads', `avatars/${userId}`),
      purgeStorageFolder('uploads', `bikes/${userId}`),
      purgeStorageFolder('uploads', `posts/${userId}`),
      purgeStorageFolder('uploads', `events/${userId}`),
      purgeStorageFolder('uploads', `alerts/${userId}`),
      purgeStorageFolderRecursive('uploads', `messages/${userId}`),
      purgeStorageFolderRecursive('message-images', `messages/${userId}`),
    ]);
  }

  const hasStorageCleanupWarnings = storageCleanupResults.some((result) => !result.success || result.issues.length > 0);
  if (hasStorageCleanupWarnings) {
    logger.warn('[deleteAccount] Storage cleanup completed with partial failures:', {
      storageCleanupResults,
    });
  }

  const { data, error } = await supabase.rpc('delete_user_account');

  if (error) logger.error('[deleteAccount] Error:', error);
  return {
    data: {
      rpcResult: data,
      storageCleanup: {
        hasWarnings: hasStorageCleanupWarnings,
        results: storageCleanupResults,
      },
    },
    error,
  };
}
