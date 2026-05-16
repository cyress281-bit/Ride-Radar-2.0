import { supabase } from '@/lib/supabase.js';
import { logger } from '@/lib/logger.js';

/**
 * Fetch up to 50 comments for a broadcast, oldest first.
 * Enriches each comment with the author's display profile.
 *
 * broadcast_comments.author_id references public.users(id).
 * user_profiles.user_id also references users(id), so we batch-fetch
 * profiles by user_id and merge rather than relying on a direct FK embed.
 *
 * @param {string} broadcastId
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getBroadcastComments(broadcastId) {
  const { data: comments, error } = await supabase
    .from('broadcast_comments')
    .select('id, broadcast_id, author_id, body, created_at')
    .eq('broadcast_id', broadcastId)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) {
    logger.error('[getBroadcastComments] Error:', error);
    return { data: null, error };
  }

  if (!comments || comments.length === 0) return { data: [], error: null };

  const authorIds = [...new Set(comments.map((c) => c.author_id))];

  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_id, display_name, username, avatar_url')
    .in('user_id', authorIds);

  if (profileError) {
    logger.error('[getBroadcastComments] Profile fetch error:', profileError);
  }

  const profileMap = Object.fromEntries(
    (profiles || []).map((p) => [p.user_id, p])
  );

  return {
    data: comments.map((c) => ({
      ...c,
      user_profiles: profileMap[c.author_id] ?? null,
    })),
    error: null,
  };
}

/**
 * Add a comment to a broadcast as the current authenticated user.
 *
 * @param {string} broadcastId
 * @param {string} body
 * @returns {Promise<{data: object|null, error: null}>}
 */
export async function addBroadcastComment(broadcastId, body) {
  const trimmed = body?.trim() ?? '';
  if (!trimmed) throw new Error('Comment cannot be empty.');
  if (trimmed.length > 500) throw new Error('Comment must be 500 characters or fewer.');

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be signed in to comment.');

  const { data, error } = await supabase
    .from('broadcast_comments')
    .insert({ broadcast_id: broadcastId, author_id: user.id, body: trimmed })
    .select('id, broadcast_id, author_id, body, created_at')
    .single();

  if (error) {
    logger.error('[addBroadcastComment] Error:', error);
    throw error;
  }
  return { data, error: null };
}

/**
 * Delete a broadcast comment by ID.
 * RLS enforces that only the comment author or broadcast owner can delete.
 *
 * @param {string} commentId
 * @returns {Promise<{data: null, error: null}>}
 */
export async function deleteBroadcastComment(commentId) {
  const { error } = await supabase
    .from('broadcast_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    logger.error('[deleteBroadcastComment] Error:', error);
    throw error;
  }
  return { data: null, error: null };
}
