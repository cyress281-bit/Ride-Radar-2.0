import { supabase } from '@/lib/supabase.js';
import { logger } from '@/lib/logger.js';

const AUTHOR_SELECT = `
  id,
  post_id,
  author_id,
  body,
  created_at,
  user_profiles!post_comments_author_id_fkey (
    display_name,
    username,
    avatar_url
  )
`.trim();

/**
 * Fetch up to 50 comments for a post, oldest first.
 *
 * @param {string} postId
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getPostComments(postId) {
  const { data, error } = await supabase
    .from('post_comments')
    .select(AUTHOR_SELECT)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) logger.error('[getPostComments] Error:', error);
  return { data, error };
}

/**
 * Add a comment to a post as the current authenticated user.
 *
 * @param {string} postId
 * @param {string} body
 * @returns {Promise<{data: object|null, error: null}>}
 */
export async function addPostComment(postId, body) {
  const trimmed = body?.trim() ?? '';
  if (!trimmed) throw new Error('Comment cannot be empty.');
  if (trimmed.length > 500) throw new Error('Comment must be 500 characters or fewer.');

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be signed in to comment.');

  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, author_id: user.id, body: trimmed })
    .select(AUTHOR_SELECT)
    .single();

  if (error) {
    logger.error('[addPostComment] Error:', error);
    throw error;
  }
  return { data, error: null };
}

/**
 * Delete a comment by ID.
 * RLS enforces that only the comment author or post owner can delete.
 *
 * @param {string} commentId
 * @returns {Promise<{data: null, error: null}>}
 */
export async function deletePostComment(commentId) {
  const { error } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    logger.error('[deletePostComment] Error:', error);
    throw error;
  }
  return { data: null, error: null };
}
