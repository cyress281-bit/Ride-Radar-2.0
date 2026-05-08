import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export function isValidUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ''));
}

export async function getProfileByIdSafe(id, options = {}) {
  if (!id) return null;
  if (!isValidUuid(id)) return null;

  const { publicOnly = true } = options;

  try {
    let query = supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', id);

    if (publicOnly) {
      query = query.eq('is_public', true);
    }

    const byUserId = await query.maybeSingle();

    if (byUserId.error) {
      logger.warn('[profileLookup] Error fetching profile by user_id:', byUserId.error);
      return null;
    }

    return byUserId.data || null;
  } catch (error) {
    logger.warn('[profileLookup] Profile lookup failed:', error);
    return null;
  }
}

export async function listProfilesByIds(ids = []) {
  const uniqueIds = Array.from(new Set(ids.filter(isValidUuid)));
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
