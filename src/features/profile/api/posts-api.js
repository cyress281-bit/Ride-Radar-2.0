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

  // 1. Fetch storage paths before the row is gone.
  const { data: photos, error: fetchError } = await supabase
    .from('user_post_photos')
    .select('image_path')
    .eq('post_id', postId);

  if (fetchError) {
    logger.error('[deletePost] Fetch photos error:', fetchError);
    throw fetchError;
  }

  // 2. Remove storage objects (best-effort — do not abort deletion on storage failure).
  const paths = (photos ?? []).map((p) => p.image_path).filter(Boolean);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from('uploads').remove(paths);
    if (storageError) logger.error('[deletePost] Storage removal error (non-fatal):', storageError);
  }

  // 3. Delete row — user_post_photos cascade via FK.
  const { error: deleteError } = await supabase.from('user_posts').delete().eq('id', postId);

  if (deleteError) {
    logger.error('[deletePost] Delete post error:', deleteError);
    throw deleteError;
  }

  return { data: null, error: null };
}
