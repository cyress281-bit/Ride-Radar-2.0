/**
 * Posts API layer for Ride Radar 2.0.
 *
 * All functions return `{ data, error }` to match the Supabase client convention.
 */

import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/image-utils.js';
import { logger } from '@/lib/logger.js';
import { isValidUuid } from '@/lib/utils';

const MAX_PHOTOS = 6;

/**
 * Fetch all posts for a user, with photos nested and ordered by sort_order.
 * @param {string} userId
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getUserPosts(userId) {
  if (!isValidUuid(userId)) return { data: null, error: new Error('Invalid userId') };

  const { data, error } = await supabase
    .from('user_posts')
    .select(`
      id,
      user_id,
      caption,
      created_at,
      updated_at,
      user_post_photos (
        id,
        image_url,
        image_path,
        sort_order
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('sort_order', { referencedTable: 'user_post_photos', ascending: true });

  if (error) logger.error('[getUserPosts] Error:', error);
  return { data, error };
}

/**
 * Create a new post with 1–6 photos.
 *
 * Flow:
 *   1. Insert user_posts row.
 *   2. Upload each photo; on failure, clean up the post row and abort.
 *   3. Insert user_post_photos rows; on failure, clean up and abort.
 *
 * @param {string} userId
 * @param {{ caption?: string, photos: Array<File|{file: File}> }} params
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function createPost(userId, { caption, photos }) {
  if (!isValidUuid(userId)) return { data: null, error: new Error('Invalid userId') };
  if (!photos || photos.length === 0) return { data: null, error: new Error('At least one photo is required') };
  if (photos.length > MAX_PHOTOS) return { data: null, error: new Error(`Maximum ${MAX_PHOTOS} photos allowed`) };

  // 1. Create the parent post row.
  const { data: post, error: postError } = await supabase
    .from('user_posts')
    .insert({ user_id: userId, caption: caption?.trim() || null })
    .select()
    .single();

  if (postError) {
    logger.error('[createPost] Insert post error:', postError);
    return { data: null, error: postError };
  }

  // 2. Upload photos sequentially; abort on first failure.
  const photoRows = [];
  for (let i = 0; i < photos.length; i++) {
    const source = photos[i];
    const file = source?.file ?? source;
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const imagePath = `posts/${userId}/${uniqueSuffix}.webp`;

    let imageUrl;
    try {
      imageUrl = await uploadImage(file, 'uploads', imagePath, 'post');
    } catch (uploadErr) {
      logger.error(`[createPost] Upload error for photo ${i + 1}:`, uploadErr);
      await supabase.from('user_posts').delete().eq('id', post.id);
      return {
        data: null,
        error: uploadErr instanceof Error ? uploadErr : new Error(String(uploadErr)),
      };
    }

    // uploadImage is typed to return string. Guard against unexpected wrapper objects.
    if (typeof imageUrl !== 'string') {
      const err = new Error(`Photo ${i + 1} upload returned an unexpected value — expected a URL string`);
      logger.error('[createPost]', err.message, imageUrl);
      await supabase.from('user_posts').delete().eq('id', post.id);
      return { data: null, error: err };
    }

    photoRows.push({ post_id: post.id, image_url: imageUrl, image_path: imagePath, sort_order: i });
  }

  // 3. Insert all photo rows in one batch.
  const { error: photosError } = await supabase.from('user_post_photos').insert(photoRows);

  if (photosError) {
    logger.error('[createPost] Insert photos error:', photosError);
    await supabase.from('user_posts').delete().eq('id', post.id);
    return { data: null, error: photosError };
  }

  return { data: post, error: null };
}

/**
 * Delete a post and its storage objects.
 *
 * Flow:
 *   1. Fetch image_path for all photos (needed for storage cleanup).
 *   2. Remove files from the uploads bucket (non-fatal on error — log and continue).
 *   3. Delete the user_posts row; cascade deletes user_post_photos.
 *
 * @param {string} postId
 * @returns {Promise<{data: null, error: Error|null}>}
 */
export async function deletePost(postId) {
  if (!isValidUuid(postId)) return { data: null, error: new Error('Invalid postId') };

  // 1. Fetch storage paths BEFORE deleting the row (so we still know what to clean
  //    up), but do NOT remove them yet — only after the row delete is confirmed.
  const { data: photos, error: fetchError } = await supabase
    .from('user_post_photos')
    .select('image_path')
    .eq('post_id', postId);

  if (fetchError) {
    logger.error('[deletePost] Fetch photos error:', fetchError);
    throw fetchError;
  }

  // 2. Delete the row first. .select() lets us detect an RLS-blocked / non-existent
  //    delete, which otherwise returns { error: null, data: [] } and looks like success.
  const { data: deleted, error: deleteError } = await supabase
    .from('user_posts')
    .delete()
    .eq('id', postId)
    .select('id');

  if (deleteError) {
    logger.error('[deletePost] Delete post error:', deleteError);
    throw deleteError;
  }
  if (!deleted || deleted.length === 0) {
    logger.error('[deletePost] Blocked or not found — 0 rows affected');
    throw new Error('Post not found or you do not have permission to delete it.');
  }

  // 3. Row is gone (user_post_photos cascade via FK). Now remove storage objects
  //    (best-effort — do not fail the delete if storage cleanup errors). Doing this
  //    AFTER the confirmed delete prevents orphaning a surviving post with its
  //    images already wiped when the delete is silently blocked.
  const paths = (photos ?? []).map((p) => p.image_path).filter(Boolean);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from('uploads').remove(paths);
    if (storageError) logger.error('[deletePost] Storage removal error (non-fatal):', storageError);
  }

  return { data: null, error: null };
}
