import { base44 } from '@/api/base44Client';
import { validateImageUpload } from '@/lib/uploadValidation';

const IMAGE_LIMITS = {
  avatar: { maxSize: 900, quality: 0.82 },
  bike: { maxSize: 1600, quality: 0.82 },
  event: { maxSize: 1800, quality: 0.84 },
  alert: { maxSize: 1600, quality: 0.8 },
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

export async function prepareLocalImage(file, kind) {
  await validateImageUpload(file, kind);
  return {
    isLocalImage: true,
    file,
    previewUrl: URL.createObjectURL(file),
    name: file.name,
    kind,
  };
}

export async function uploadImageIfNeeded(value) {
  if (!isLocalImage(value)) return value || '';
  const file = await compressImageFile(value.file, value.kind);
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return file_url;
}

export async function uploadImagesIfNeeded(values = []) {
  const uploaded = await Promise.all(values.filter(Boolean).map(uploadImageIfNeeded));
  return uploaded.filter(Boolean);
}

async function compressImageFile(file, kind) {
  if (!file?.type?.startsWith('image/')) return file;

  const { maxSize, quality } = IMAGE_LIMITS[kind] || IMAGE_LIMITS.alert;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) return file;

  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}