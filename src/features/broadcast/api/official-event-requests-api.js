import { supabase } from '@/lib/supabase.js';
import { logger } from '@/lib/logger.js';
import { isValidUuid } from '@/lib/utils.js';

function normalizeOptionalText(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed || null;
}

export async function getLatestOfficialEventRequest(broadcastId, requesterId) {
  if (!isValidUuid(broadcastId) || !isValidUuid(requesterId)) {
    return { data: null, error: new Error('Invalid request lookup ids') };
  }

  const { data, error } = await supabase
    .from('official_event_requests')
    .select('*')
    .eq('broadcast_id', broadcastId)
    .eq('requester_id', requesterId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    logger.error('[getLatestOfficialEventRequest] Error:', error);
    return { data: null, error };
  }

  return { data: data || null, error: null };
}

export async function createOfficialEventRequest(request) {
  const payload = {
    broadcast_id: request.broadcastId,
    requester_id: request.requesterId,
    organizer_name: String(request.organizerName || '').trim(),
    website_or_social: normalizeOptionalText(request.websiteOrSocial),
    contact_info: String(request.contactInfo || '').trim(),
    reason: String(request.reason || '').trim(),
  };

  const { data, error } = await supabase
    .from('official_event_requests')
    .insert(payload)
    .select()
    .single();

  if (error) {
    logger.error('[createOfficialEventRequest] Error:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

export async function cancelOfficialEventRequest(requestId) {
  if (!isValidUuid(requestId)) {
    return { data: null, error: new Error('Invalid request id') };
  }

  const { data, error } = await supabase
    .from('official_event_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    logger.error('[cancelOfficialEventRequest] Error:', error);
    return { data: null, error };
  }

  return { data, error: null };
}
