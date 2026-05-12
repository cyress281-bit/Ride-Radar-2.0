import { supabase } from '@/lib/supabase.js';
import { getOrCreateConversation } from '@/lib/conversationUtils.js';
import { isValidUuid } from '@/lib/utils.js';
import { throttle } from '@/lib/throttle.js';

/**
 * Fetch pending connection requests for a user.
 * @param {string} userId
 * @returns {Promise<{data: object[], error: Error|null}>}
 */
export async function getConnectionRequests(userId) {
  if (!isValidUuid(userId)) return { data: [], error: new Error('Invalid userId') };

  const { data, error } = await supabase
    .from('connection_requests')
    .select('*')
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return { data: data || [], error };
}

/**
 * Fetch sent connection requests for a user.
 * @param {string} userId
 * @returns {Promise<{data: object[], error: Error|null}>}
 */
export async function getSentRequests(userId) {
  if (!isValidUuid(userId)) return { data: [], error: new Error('Invalid userId') };

  const { data, error } = await supabase
    .from('connection_requests')
    .select('*')
    .eq('from_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return { data: data || [], error };
}

/**
 * Send a connection request.
 * @param {{from_user_id: string, to_user_id: string}} params
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export const sendConnectionRequest = throttle(async function sendConnectionRequest({ from_user_id, to_user_id }) {
  if (!isValidUuid(from_user_id) || !isValidUuid(to_user_id)) {
    return { data: null, error: new Error('Invalid user IDs') };
  }
  if (from_user_id === to_user_id) {
    return { data: null, error: new Error('Cannot send a connection request to yourself') };
  }

  // Prevent duplicate pending requests
  const { data: existingRequest, error: existingError } = await supabase
    .from('connection_requests')
    .select('id')
    .eq('from_user_id', from_user_id)
    .eq('to_user_id', to_user_id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingError) return { data: null, error: existingError };
  if (existingRequest) {
    return { data: null, error: new Error('A pending request to this user already exists') };
  }

  // Prevent requests to existing friends
  const { data: existingFriendship, error: friendshipError } = await supabase
    .from('friendships')
    .select('id')
    .eq('status', 'active')
    .or(
      `and(user_a_id.eq.${from_user_id},user_b_id.eq.${to_user_id}),and(user_a_id.eq.${to_user_id},user_b_id.eq.${from_user_id})`
    )
    .maybeSingle();

  if (friendshipError) return { data: null, error: friendshipError };
  if (existingFriendship) {
    return { data: null, error: new Error('You are already friends with this user') };
  }

  // Prevent requests if either user has blocked the other
  const { data: existingBlock, error: blockError } = await supabase
    .from('user_blocks')
    .select('id')
    .or(
      `and(blocker_user_id.eq.${from_user_id},blocked_user_id.eq.${to_user_id}),and(blocker_user_id.eq.${to_user_id},blocked_user_id.eq.${from_user_id})`
    )
    .maybeSingle();

  if (blockError) return { data: null, error: blockError };
  if (existingBlock) {
    return { data: null, error: new Error('Unable to send request') };
  }

  const { data, error } = await supabase
    .from('connection_requests')
    .insert({ from_user_id, to_user_id, status: 'pending' })
    .select()
    .single();

  return { data, error };
}, 10_000);

/**
 * Accept a connection request, create a friendship, and create a conversation.
 * @param {string} requestId
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function acceptConnectionRequest(requestId) {
  if (!isValidUuid(requestId)) return { data: null, error: new Error('Invalid requestId') };

  // Fetch request to get participant IDs
  const { data: req, error: fetchError } = await supabase
    .from('connection_requests')
    .select('id, from_user_id, to_user_id, status')
    .eq('id', requestId)
    .single();

  if (fetchError) return { data: null, error: fetchError };
  if (!req) return { data: null, error: new Error('Request not found') };

  // If already accepted, just return the conversation
  if (req.status === 'accepted') {
    try {
      const conversation = await getOrCreateConversation({
        participantIds: [req.from_user_id, req.to_user_id],
        type: 'connection',
      });
      return { data: conversation, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // Optimistic lock: only update if still pending
  const { error: updateError } = await supabase
    .from('connection_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (updateError) return { data: null, error: updateError };

  // Create friendship record (ignore if already exists)
  const { error: friendshipError } = await supabase
    .from('friendships')
    .insert({
      user_a_id: req.from_user_id,
      user_b_id: req.to_user_id,
      status: 'active',
    });

  if (friendshipError && friendshipError.code !== '23505') {
    return { data: null, error: friendshipError };
  }

  // Create conversation
  try {
    const conversation = await getOrCreateConversation({
      participantIds: [req.from_user_id, req.to_user_id],
      type: 'connection',
    });
    return { data: conversation, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Decline a connection request.
 * @param {string} requestId
 * @returns {Promise<{data: null, error: Error|null}>}
 */
export async function declineConnectionRequest(requestId) {
  if (!isValidUuid(requestId)) return { data: null, error: new Error('Invalid requestId') };

  const { error } = await supabase
    .from('connection_requests')
    .update({ status: 'declined' })
    .eq('id', requestId);

  return { data: null, error };
}

/**
 * Fetch active friendships for a user.
 * @param {string} userId
 * @returns {Promise<{data: object[], error: Error|null}>}
 */
export async function getFriendships(userId) {
  if (!isValidUuid(userId)) return { data: [], error: new Error('Invalid userId') };

  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  return { data: data || [], error };
}

/**
 * Check if an active friendship exists between two users.
 * @param {string} userAId
 * @param {string} userBId
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function getFriendshipBetween(userAId, userBId) {
  if (!isValidUuid(userAId) || !isValidUuid(userBId)) {
    return { data: null, error: new Error('Invalid userId') };
  }

  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('status', 'active')
    .or(`and(user_a_id.eq.${userAId},user_b_id.eq.${userBId}),and(user_a_id.eq.${userBId},user_b_id.eq.${userAId})`)
    .maybeSingle();

  return { data, error };
}

/**
 * Remove a friendship by ID.
 * @param {string} friendshipId
 * @returns {Promise<{data: null, error: Error|null}>}
 */
export async function removeFriendship(friendshipId) {
  if (!isValidUuid(friendshipId)) return { data: null, error: new Error('Invalid friendshipId') };

  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);

  return { data: null, error };
}
