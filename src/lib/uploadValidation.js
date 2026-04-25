import { base44 } from '@/api/base44Client';

export async function validateImageUpload(file, kind) {
  if (!file) return false;
  await base44.functions.invoke('validateUpload', {
    kind,
    contentType: file.type,
    size: file.size
  });
  return true;
}