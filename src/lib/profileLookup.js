import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function getProfileByIdSafe(id) {
  if (!id) return null;
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', id)
      .eq('is_public', true)
      .single();

    if (error) return null;
    return data;
  } catch (error) {
    return null;
  }
}

export async function listProfilesByIds(ids = []) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .in('user_id', uniqueIds)
    .eq('is_public', true);

  if (error) {
    logger.error('[profileLookup] Error fetching profiles:', error);
    return [];
  }

  return data || [];
}