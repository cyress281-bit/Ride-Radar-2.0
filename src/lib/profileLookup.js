import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function getProfileByIdSafe(id) {
  if (!id) return null;
  try {
    const byUserId = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', id)
      .eq('is_public', true)
      .maybeSingle();

    if (byUserId.data) return byUserId.data;

    const byProfileId = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .eq('is_public', true)
      .maybeSingle();

    if (byProfileId.data) return byProfileId.data;

    return null;
  } catch (error) {
    return null;
  }
}

export async function listProfilesByIds(ids = []) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  const [byUserId, byProfileId] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('*')
      .in('user_id', uniqueIds)
      .eq('is_public', true),
    supabase
      .from('user_profiles')
      .select('*')
      .in('id', uniqueIds)
      .eq('is_public', true),
  ]);

  if (byUserId.error) {
    logger.error('[profileLookup] Error fetching profiles by user_id:', byUserId.error);
  }
  if (byProfileId.error) {
    logger.error('[profileLookup] Error fetching profiles by id:', byProfileId.error);
  }

  const merged = [...(byUserId.data || []), ...(byProfileId.data || [])];
  const seen = new Set();
  return merged.filter((profile) => {
    if (!profile?.id || seen.has(profile.id)) return false;
    seen.add(profile.id);
    return true;
  });
}
