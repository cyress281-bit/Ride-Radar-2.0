import { base44 } from '@/api/base44Client';

export async function listProfilesByIds(ids = []) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  const profiles = await base44.entities.UserProfile.list('-updated_date', 500);
  return profiles.filter((profile) => uniqueIds.includes(profile.id));
}

export async function getProfileByIdSafe(id) {
  const profiles = await listProfilesByIds([id]);
  return profiles[0] || null;
}