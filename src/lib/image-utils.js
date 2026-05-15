/**
 * Image utilities for Ride Radar 2.0.
 *
 * - Local image preparation (preview URL + blur placeholder)
 * - Supabase Storage upload with WebP conversion
 * - Public URL generation
 * - Responsive srcset generation
 */

import { supabase } from './supabase.js';
import { logger } from './logger.js';

// ------------------------------------------------------------------
// Validation
// ------------------------------------------------------------------

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/** @type {Record<string, number>} */
const MAX_FILE_SIZES = {
  avatar: 5 * 1024 * 1024,
  bike: 10 * 1024 * 1024,
  event: 10 * 1024 * 1024,
  alert: 10 * 1024 * 1024,
  post: 10 * 1024 * 1024,
};

/**
 * Validate a file's type and size before upload.
 * @param {File} file
 * @param {string} kind
 * @throws {Error} If validation fails
 */
function validateFile(file, kind) {
  if (!file) throw new Error('No file provided');
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPG, PNG, or WebP image.');
  }
  const maxSize = MAX_FILE_SIZES[kind] || 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB.`);
  }
}

// ------------------------------------------------------------------
// Conversion helpers
// ------------------------------------------------------------------

/**
 * Convert an image file to WebP (or JPEG fallback) at the given max width.
 * @param {File|Blob} file
 * @param {number} maxWidth
 * @param {number} [quality=0.8]
 * @returns {Promise<{blob: Blob, format: 'webp'|'jpeg', width: number, height: number}>}
 */
async function convertImage(file, maxWidth, quality = 0.8) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality)
  );

  let format = 'webp';
  if (!blob) {
    blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    );
    format = 'jpeg';
  }

  return { blob, format, width, height };
}

/**
 * Generate a tiny base64 blur placeholder from an image file.
 * @param {File|Blob} file
 * @returns {Promise<string|null>} Base64 data URI
 */
async function generateBlurPlaceholder(file) {
  try {
    const { blob } = await convertImage(file, 20, 0.3);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------
// Exported functions
// ------------------------------------------------------------------

/**
 * Prepare a local image for preview before upload.
 * Generates a preview URL and a blur placeholder.
 *
 * @param {File} file - Image file from a file input
 * @param {string} [kind='event'] - Image kind ('avatar'|'bike'|'event'|'alert')
 * @returns {Promise<{isLocalImage: true, file: File, previewUrl: string, placeholder: string|null, name: string, kind: string}>}
 */
export async function prepareLocalImage(file, kind = 'event') {
  validateFile(file, kind);

  let placeholder = null;
  try {
    placeholder = await generateBlurPlaceholder(file);
  } catch (e) {
    logger.warn('Failed to generate blur placeholder:', e);
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
 * Upload an image to Supabase Storage after converting to WebP.
 *
 * @param {File|Blob} file - Source image
 * @param {string} bucket - Supabase storage bucket name
 * @param {string} path - Target path inside the bucket
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export async function uploadImage(file, bucket, path, kind = 'event') {
  validateFile(file, kind);

  const { blob, format } = await convertImage(file, 1600, 0.82);
  const ext = format === 'webp' ? 'webp' : 'jpg';
  const contentType = format === 'webp' ? 'image/webp' : 'image/jpeg';
  const filePath = path.replace(/\.(jpe?g|png|webp)$/i, `.${ext}`);

  if (!supabase) throw new Error('Supabase client not available');

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, blob, {
      contentType,
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) {
    logger.error('Upload failed:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl;
}

/**
 * Get the public URL for a file in Supabase Storage.
 *
 * @param {string} bucket - Supabase storage bucket name
 * @param {string} path - File path inside the bucket
 * @returns {string}
 */
export function getPublicUrl(bucket, path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (!supabase) return '';

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? '';
}

/**
 * Generate a responsive `srcset` string from a base image URL.
 * Assumes size variants follow the naming pattern: `base_{width}.ext`
 *
 * @param {string} url - Base image URL (e.g. `.../image_800.webp`)
 * @param {number[]} [widths=[150, 400, 800, 1200]]
 * @returns {string|null} srcset string or null if url does not match the pattern
 */
/**
 * Check if a value is a local image object (has previewUrl).
 * @param {any} value
 * @returns {boolean}
 */
export function isLocalImage(value) {
  return value && typeof value === 'object' && 'previewUrl' in value;
}

/**
 * Revoke a local image preview URL to free memory.
 * Call this when the preview is no longer needed (e.g., on unmount or after upload).
 * @param {{ previewUrl?: string }|null} localImage
 */
export function revokeLocalImage(localImage) {
  if (localImage?.previewUrl) {
    URL.revokeObjectURL(localImage.previewUrl);
  }
}

/**
 * Upload a local image if needed, otherwise return the URL as-is.
 * @param {string|object} value — URL string or local image object
 * @param {string} bucket — Supabase storage bucket
 * @param {string} path — Storage path
 * @returns {Promise<string>}
 */
export async function uploadImageIfNeeded(value, bucket = 'images', path = 'uploads') {
  if (!value) return '';
  if (isLocalImage(value)) {
    const file = value.file;
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${path}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const publicUrl = await uploadImage(file, bucket, filePath);
    return publicUrl;
  }
  return String(value);
}

export function generateSrcset(url, widths = [150, 400, 800, 1200]) {
  if (!url) return null;

  const match = url.match(/^(.+?)_(\d+)\.(webp|jpe?g|png)$/);
  if (!match) return null;

  const [, basePath, , ext] = match;
  return widths.map((w) => `${basePath}_${w}.${ext} ${w}w`).join(', ');
}
