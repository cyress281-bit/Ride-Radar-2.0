import { supabase } from '@/lib/supabase';
import { validateImageUpload } from '@/lib/uploadValidation';
import { logger } from '@/lib/logger';
import {
  convertImage,
  generateBlurPlaceholder,
  uploadResponsiveImages,
} from '@/lib/imageOptimization';

/**
 * Size limits per image kind.
 * maxSize: longest edge in px for the "primary" upload
 * quality: JPEG/WebP quality (0-1)
 * responsive: whether to generate multi-size variants
 * sizes: which responsive sizes to generate
 */
const IMAGE_LIMITS = {
  avatar: { maxSize: 900, quality: 0.82, responsive: true, sizes: ['thumbnail', 'small', 'medium'] },
  bike: { maxSize: 1600, quality: 0.82, responsive: true, sizes: ['thumbnail', 'small', 'medium', 'large'] },
  event: { maxSize: 1800, quality: 0.84, responsive: true, sizes: ['small', 'medium', 'large'] },
  alert: { maxSize: 1600, quality: 0.8, responsive: true, sizes: ['small', 'medium', 'large'] },
};

export function isLocalImage(value) {
  return !!value && typeof value === 'object' && value.isLocalImage;
}

export function getImagePreview(value) {
  return isLocalImage(value) ? value.previewUrl : value || '';
}

export function revokeLocalImage(value) {
  if (isLocalImage(value) && value.previewUrl) URL.revokeObjectURL(value.previewUrl);
}

/**
 * Prepare a local image for upload.
 * Generates a preview URL and a blur placeholder immediately.
 *
 * @param {File} file - Image file from input
 * @param {string} kind - Image kind ('avatar'|'bike'|'event'|'alert')
 * @returns {Promise<object>} Local image descriptor
 */
export async function prepareLocalImage(file, kind) {
  await validateImageUpload(file, kind);

  // Generate blur placeholder in parallel with preview URL
  let placeholder = null;
  try {
    placeholder = await generateBlurPlaceholder(file);
  } catch (e) {
    logger.warn('[prepareLocalImage] Failed to generate placeholder:', e);
  }

  return {
    isLocalImage: true,
    file,
    previewUrl: URL.createObjectURL(file),
    placeholder,
    name: file.name,
    kind,
  };
}

/**
 * Upload an image to Supabase Storage with optimization.
 *
 * For new uploads:
 * - Converts to WebP (with JPEG fallback)
 * - Generates multiple responsive sizes
 * - Generates blur placeholder
 * - Returns the primary (medium) URL as a string for backward compatibility
 *
 * For legacy values (already a URL string), returns as-is.
 *
 * @param {object|string} value - Local image object or existing URL
 * @param {object} [options]
 * @param {boolean} [options.multiSize=true] - Upload multiple sizes
 * @returns {Promise<string>} Public URL of the uploaded image
 */
export async function uploadImageIfNeeded(value, options = {}) {
  if (!isLocalImage(value)) return value || '';

  const { multiSize = true } = options;
  const config = IMAGE_LIMITS[value.kind] || IMAGE_LIMITS.alert;

  if (multiSize && config.responsive) {
    return uploadWithResponsiveSizes(value, config);
  }

  // Single-file upload (fallback path)
  return uploadSingleImage(value, config);
}

/**
 * Upload responsive image variants (multi-size).
 * Returns the medium/primary URL for backward-compatible storage in DB.
 */
async function uploadWithResponsiveSizes(value, config) {
  const fileId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const basePath = `${value.kind}s`;

  try {
    const { primaryUrl } = await uploadResponsiveImages(
      value.file,
      basePath,
      fileId,
      { sizes: config.sizes }
    );

    return primaryUrl;
  } catch (error) {
    logger.warn('[uploadWithResponsiveSizes] Multi-size failed, falling back to single upload:', error);
    // Fallback to single-image upload
    return uploadSingleImage(value, config);
  }
}

/**
 * Upload a single optimized image (WebP preferred, JPEG fallback).
 */
async function uploadSingleImage(value, config) {
  const file = value.file;
  const { maxSize, quality } = config;

  // Convert to WebP (or JPEG fallback)
  const { blob, format } = await convertImage(file, {
    maxWidth: maxSize,
    quality,
  });

  const ext = format === 'webp' ? 'webp' : 'jpg';
  const contentType = format === 'webp' ? 'image/webp' : 'image/jpeg';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
  const filePath = `${value.kind}s/${fileName}`;

  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(filePath, blob, {
      contentType,
      cacheControl: '31536000', // 1 year cache
    });

  if (error) {
    logger.error('[uploadSingleImage] Error:', error);
    throw error;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('uploads')
    .getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Upload multiple images (for alert photos, etc.)
 * @param {Array<object|string>} values - Array of local image objects or URLs
 * @returns {Promise<string[]>} Array of public URLs
 */
export async function uploadImagesIfNeeded(values = []) {
  const uploaded = await Promise.all(values.filter(Boolean).map((v) => uploadImageIfNeeded(v)));
  return uploaded.filter(Boolean);
}

/**
 * @deprecated Use convertImage from imageOptimization.js instead.
 * Kept for backward compatibility with any code that imported this directly.
 */
async function compressImageFile(file, kind) {
  if (!file?.type?.startsWith('image/')) return file;

  const { maxSize, quality } = IMAGE_LIMITS[kind] || IMAGE_LIMITS.alert;
  const { blob, format } = await convertImage(file, { maxWidth: maxSize, quality });

  const ext = format === 'webp' ? 'webp' : 'jpg';
  return new File([blob], file.name.replace(/\.[^.]+$/, `.${ext}`), {
    type: format === 'webp' ? 'image/webp' : 'image/jpeg',
    lastModified: Date.now(),
  });
}
