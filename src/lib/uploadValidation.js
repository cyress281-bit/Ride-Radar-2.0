// Client-side image validation
const MAX_SIZES = {
  avatar: 5 * 1024 * 1024, // 5MB
  bike: 10 * 1024 * 1024, // 10MB
  event: 10 * 1024 * 1024, // 10MB
  alert: 10 * 1024 * 1024, // 10MB
};

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function validateImageUpload(file, kind) {
  if (!file) return false;

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPG, PNG, or WebP image.');
  }

  // Check file size
  const maxSize = MAX_SIZES[kind] || 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB.`);
  }

  return true;
}