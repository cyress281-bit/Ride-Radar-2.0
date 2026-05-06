/**
 * Image Optimization Utilities for Ride Radar 2.0
 *
 * Provides:
 * - WebP conversion with JPEG fallback
 * - Multi-size responsive image generation (thumbnail, small, medium, large)
 * - Blur-up placeholder generation (tiny 20px base64 image)
 * - Supabase Storage URL helpers with transform parameters
 * - Cache-control aware URL generation
 */

import { supabase } from '@/lib/supabase';

// --- Size Presets ---

/** @type {Record<string, { width: number, quality: number }>} */
export const IMAGE_SIZES = {
  placeholder: { width: 20, quality: 0.3 },
  thumbnail: { width: 150, quality: 0.7 },
  small: { width: 400, quality: 0.75 },
  medium: { width: 800, quality: 0.8 },
  large: { width: 1200, quality: 0.82 },
};

/**
 * Size breakpoints for srcset generation (maps to rendered display widths)
 */
export const SRCSET_BREAKPOINTS = [150, 400, 800, 1200];

// --- WebP Support Detection ---

let _webpSupported = null;

/**
 * Detect WebP support in the current browser.
 * Caches result after first check.
 * @returns {Promise<boolean>}
 */
export async function isWebPSupported() {
  if (_webpSupported !== null) return _webpSupported;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const dataUrl = canvas.toDataURL('image/webp');
    _webpSupported = dataUrl.startsWith('data:image/webp');
  } catch {
    _webpSupported = false;
  }
  return _webpSupported;
}

// --- Image Conversion ---

/**
 * Convert an image file to WebP format at the specified dimensions.
 * Falls back to JPEG if WebP is not supported.
 *
 * @param {File|Blob} file - Source image file
 * @param {object} options
 * @param {number} options.maxWidth - Maximum width (height scales proportionally)
 * @param {number} [options.quality=0.8] - Compression quality (0-1)
 * @param {boolean} [options.forceWebP=false] - Force WebP even if browser detection fails
 * @returns {Promise<{ blob: Blob, format: 'webp'|'jpeg', width: number, height: number }>}
 */
export async function convertImage(file, { maxWidth, quality = 0.8, forceWebP = false }) {
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

  const useWebP = forceWebP || (await isWebPSupported());
  const mimeType = useWebP ? 'image/webp' : 'image/jpeg';

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));

  // If WebP blob is null (unlikely but defensive), fall back to JPEG
  if (!blob) {
    const jpegBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    return { blob: jpegBlob, format: 'jpeg', width, height };
  }

  return { blob, format: useWebP ? 'webp' : 'jpeg', width, height };
}

/**
 * Generate a tiny base64 blur placeholder from an image file.
 * Creates a 20px wide image that can be inlined as a data URI.
 *
 * @param {File|Blob} file - Source image
 * @returns {Promise<string>} Base64 data URI
 */
export async function generateBlurPlaceholder(file) {
  const { blob } = await convertImage(file, {
    maxWidth: IMAGE_SIZES.placeholder.width,
    quality: IMAGE_SIZES.placeholder.quality,
  });

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate multiple image sizes from a source file.
 * Returns an array of { size, blob, format, width, height } objects.
 *
 * @param {File|Blob} file - Source image
 * @param {string[]} [sizes=['thumbnail','small','medium','large']] - Size presets to generate
 * @returns {Promise<Array<{ size: string, blob: Blob, format: string, width: number, height: number }>>}
 */
export async function generateResponsiveSizes(file, sizes = ['thumbnail', 'small', 'medium', 'large']) {
  const results = await Promise.all(
    sizes.map(async (size) => {
      const preset = IMAGE_SIZES[size];
      if (!preset) return null;
      const result = await convertImage(file, {
        maxWidth: preset.width,
        quality: preset.quality,
      });
      return { size, ...result };
    })
  );
  return results.filter(Boolean);
}

// --- Supabase Storage URL Helpers ---

/**
 * Get the public URL for a file in Supabase Storage.
 * Appends cache-busting and transform parameters as needed.
 *
 * @param {string} path - Storage path (e.g., 'avatars/abc123/image.webp')
 * @param {object} [options]
 * @param {number} [options.width] - Transform: resize width
 * @param {number} [options.height] - Transform: resize height
 * @param {number} [options.quality] - Transform: quality (1-100)
 * @param {'cover'|'contain'|'fill'} [options.resize] - Transform: resize mode
 * @returns {string} Public URL
 */
export function getStorageUrl(path, options = {}) {
  if (!path) return '';

  // If path is already a full URL, return it (backward compatibility)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('uploads')
    .getPublicUrl(path, {
      transform: options.width || options.height ? {
        width: options.width,
        height: options.height,
        quality: options.quality || 80,
        resize: options.resize || 'cover',
      } : undefined,
    });

  return publicUrl;
}

/**
 * Given a base storage path (without size suffix), generate srcset entries.
 * This handles both the new multi-size upload format and legacy single-file format.
 *
 * New format: path/filename_400.webp, path/filename_800.webp, etc.
 * Legacy format: single URL (returns just that URL at 1x)
 *
 * @param {string} url - The image URL or path
 * @param {object} [options]
 * @param {number[]} [options.widths] - Available widths for srcset
 * @returns {{ srcSet: string, sizes: string } | null}
 */
export function generateSrcSet(url, options = {}) {
  if (!url) return null;

  // If this is a legacy URL (no size variants uploaded), return null
  // The OptimizedImage component will fall back to a single src
  const widths = options.widths || SRCSET_BREAKPOINTS;

  // Check if this URL follows our multi-size naming convention
  // Multi-size URLs have the pattern: base_path/filename_{width}.webp
  const match = url.match(/^(.+?)_(\d+)\.(webp|jpe?g|png)$/);
  if (!match) return null;

  const [, basePath, , ext] = match;
  const srcSetEntries = widths
    .map((w) => `${basePath}_${w}.${ext} ${w}w`)
    .join(', ');

  return {
    srcSet: srcSetEntries,
    sizes: '(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px',
  };
}

/**
 * Upload multiple sizes of an image to Supabase Storage.
 * Returns the metadata needed to construct srcset URLs.
 *
 * @param {File|Blob} file - Source image
 * @param {string} basePath - Storage directory path (e.g., 'avatars/userId')
 * @param {string} fileId - Unique file identifier (without extension)
 * @param {object} [options]
 * @param {string[]} [options.sizes] - Size presets to upload
 * @param {boolean} [options.generatePlaceholder=true] - Generate blur placeholder
 * @returns {Promise<{
 *   urls: Record<string, string>,
 *   placeholder: string|null,
 *   primaryUrl: string,
 *   format: string
 * }>}
 */
export async function uploadResponsiveImages(file, basePath, fileId, options = {}) {
  const { sizes = ['thumbnail', 'small', 'medium', 'large'], generatePlaceholder: genPlaceholder = true } = options;

  // Generate all sizes in parallel
  const [responsiveSizes, placeholder] = await Promise.all([
    generateResponsiveSizes(file, sizes),
    genPlaceholder ? generateBlurPlaceholder(file) : Promise.resolve(null),
  ]);

  // Upload all sizes to storage
  const uploadResults = await Promise.all(
    responsiveSizes.map(async ({ size, blob, format, width }) => {
      const ext = format === 'webp' ? 'webp' : 'jpg';
      const filePath = `${basePath}/${fileId}_${width}.${ext}`;
      const contentType = format === 'webp' ? 'image/webp' : 'image/jpeg';

      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(filePath, blob, {
          contentType,
          cacheControl: '31536000', // 1 year - immutable content-addressed
          upsert: true,
        });

      if (error) {
        console.error(`[imageOptimization] Failed to upload ${size}:`, error);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(data.path);

      return { size, width, url: publicUrl, format };
    })
  );

  const uploaded = uploadResults.filter(Boolean);
  const urls = {};
  for (const item of uploaded) {
    urls[item.size] = item.url;
  }

  // Primary URL is the "medium" size, or largest available
  const primaryUrl = urls.medium || urls.large || urls.small || urls.thumbnail || '';
  const format = uploaded[0]?.format || 'jpeg';

  return { urls, placeholder, primaryUrl, format };
}

/**
 * Parse an optimized image metadata object from the database.
 * Handles both legacy (plain URL string) and new (JSON metadata) formats.
 *
 * @param {string|object} value - Image field value from database
 * @returns {{
 *   src: string,
 *   srcSet: string|null,
 *   placeholder: string|null,
 *   isOptimized: boolean
 * }}
 */
export function parseImageData(value) {
  if (!value) {
    return { src: '', srcSet: null, placeholder: null, isOptimized: false };
  }

  // Legacy format: plain URL string
  if (typeof value === 'string') {
    return { src: value, srcSet: null, placeholder: null, isOptimized: false };
  }

  // New optimized format: { urls, placeholder, primaryUrl }
  if (typeof value === 'object' && value.primaryUrl) {
    const srcSetParts = [];
    if (value.urls) {
      for (const [, url] of Object.entries(value.urls)) {
        // Extract width from URL pattern: ..._400.webp
        const widthMatch = url.match(/_(\d+)\.(webp|jpe?g)$/);
        if (widthMatch) {
          srcSetParts.push(`${url} ${widthMatch[1]}w`);
        }
      }
    }

    return {
      src: value.primaryUrl,
      srcSet: srcSetParts.length > 0 ? srcSetParts.join(', ') : null,
      placeholder: value.placeholder || null,
      isOptimized: true,
    };
  }

  return { src: '', srcSet: null, placeholder: null, isOptimized: false };
}

/**
 * Get the appropriate image URL for a given display size.
 * Handles both legacy URLs and optimized multi-size metadata.
 *
 * @param {string|object} value - Image field value
 * @param {'thumbnail'|'small'|'medium'|'large'} [preferredSize='medium'] - Preferred size
 * @returns {string} URL to use
 */
export function getImageUrlForSize(value, preferredSize = 'medium') {
  if (!value) return '';

  // Legacy format
  if (typeof value === 'string') return value;

  // Optimized format
  if (typeof value === 'object' && value.urls) {
    return value.urls[preferredSize] || value.primaryUrl || '';
  }

  return '';
}
