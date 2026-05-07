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

    return byUserId.data || null;
  } catch (error) {
    return null;
  }
}

export async function listProfilesByIds(ids = []) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  const byUserId = await supabase
    .from('user_profiles')
    .select('*')
    .in('user_id', uniqueIds)
    .eq('is_public', true);

  if (byUserId.error) {
    logger.error('[profileLookup] Error fetching profiles by user_id:', byUserId.error);
  }

  const merged = byUserId.data || [];
  const seen = new Set();
  return merged.filter((profile) => {
    if (!profile?.id || seen.has(profile.id)) return false;
    seen.add(profile.id);
    return true;
  });
}
