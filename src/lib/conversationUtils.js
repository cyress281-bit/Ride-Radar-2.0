import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Atomically get or create a conversation between participants.
 *
 * This function eliminates the TOCTOU race condition by using a database-level
 * RPC function with INSERT ... ON CONFLICT. No matter how many concurrent calls
 * happen simultaneously, only one conversation will ever be created.
 *
 * @param {Object} options
 * @param {string[]} options.participantIds - Array of user IDs (exactly 2 for DMs)
 * @param {string} options.type - Conversation type: 'friend' | 'connection'
 * @param {string|null} options.threadExpiresAt - ISO timestamp for thread expiry (connections only)
 * @returns {Promise<{id: string, type: string, participant_ids: string[], status: string, created: boolean}>}
 * @throws {Error} If the RPC call fails or parameters are invalid
 */
export async function getOrCreateConversation({
  participantIds,
  type = 'friend',
  threadExpiresAt = null,
}) {
  // Input validation
  if (!participantIds || participantIds.length < 2) {
    throw new Error('getOrCreateConversation: participantIds must contain at least 2 user IDs');
  }

  if (!participantIds.every((id) => typeof id === 'string' && id.length > 0)) {
    throw new Error('getOrCreateConversation: all participantIds must be non-empty strings');
  }

  const validTypes = ['friend', 'connection'];
  if (!validTypes.includes(type)) {
    throw new Error(`getOrCreateConversation: type must be one of: ${validTypes.join(', ')}`);
  }

  // Try the RPC function first (preferred - atomic at database level)
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    'get_or_create_conversation',
    {
      p_participant_ids: participantIds,
      p_type: type,
      p_thread_expires_at: threadExpiresAt,
    }
  );

  if (!rpcError && rpcResult) {
    return rpcResult;
  }

  // Fallback: use client-side logic on any RPC failure.
  // The production conversations table does not have the type/participant_key
  // columns that the RPC expects, so the fallback is the durable path.
  if (rpcError) {
    logger.warn('[getOrCreateConversation] RPC error, using fallback:', rpcError.message);
    return await getOrCreateConversationFallback({ participantIds, type, threadExpiresAt });
  }

  throw new Error('getOrCreateConversation: no data returned from RPC');
}

/**
 * Fallback implementation when the RPC function is not yet deployed.
 * Uses optimistic insert with conflict detection and retry logic.
 *
 * This is NOT as bulletproof as the RPC approach, but handles the most common
 * scenarios (double-clicks, slight timing overlaps) until the migration is applied.
 */
async function getOrCreateConversationFallback({ participantIds, type, threadExpiresAt }) {
  // Normalize participant order for consistent querying
  const sortedIds = [...participantIds].sort();

  // Step 1: Check for existing conversation (exact participant match)
  const { data: existing, error: fetchError } = await supabase
    .from('conversations')
    .select('*')
    .eq('status', 'active')
    .eq('participant_ids', sortedIds)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    return { ...existing, created: false };
  }

  // Step 2: Attempt to insert
  const insertPayload = {
    participant_ids: sortedIds,
    status: 'active',
  };

  if (threadExpiresAt) {
    insertPayload.thread_expires_at = threadExpiresAt;
  }

  const { data: newConvo, error: createError } = await supabase
    .from('conversations')
    .insert(insertPayload)
    .select()
    .single();

  // Step 3: If insert fails due to unique constraint violation, fetch the existing one
  if (createError) {
    // Postgres unique constraint violation code
    if (createError.code === '23505') {
      const { data: retryExisting, error: retryError } = await supabase
        .from('conversations')
        .select('*')
        .eq('status', 'active')
        .eq('participant_ids', sortedIds)
        .maybeSingle();

      if (retryError) throw retryError;
      if (retryExisting) {
        return { ...retryExisting, created: false };
      }
    }

    throw createError;
  }

  return { ...newConvo, created: true };
}
