import { base44 } from '@/api/base44Client';

export async function getProfileByIdSafe(id) {
  if (!id) return null;
  try {
    const profile = await base44.entities.UserProfile.get(id);
    if (!profile || profile.isDeleted === true || profile.isPublic === false) return null;
    return profile;
  } catch (error) {
    return null;
  }
}

export async function listProfilesByIds(ids = []) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return [];
  const profiles = await Promise.all(uniqueIds.map((id) => getProfileByIdSafe(id)));
  return profiles.filter(Boolean);
}