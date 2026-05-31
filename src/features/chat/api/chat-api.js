import { supabase } from '@/lib/supabase.js';
import { getOrCreateConversation as rpcGetOrCreateConversation } from '@/lib/conversationUtils.js';
import {
  createSignedImageUrl,
  isRemoteImageUrl,
  PRIVATE_MESSAGE_IMAGE_BUCKET,
} from '@/lib/image-utils.js';

async function resolveMessageImage(message) {
  if (!message?.image_url || isRemoteImageUrl(message.image_url)) {
    return message;
  }

  try {
    const signedUrl = await createSignedImageUrl(
      PRIVATE_MESSAGE_IMAGE_BUCKET,
      message.image_url
    );
    return { ...message, resolved_image_url: signedUrl };
  } catch {
    return { ...message, resolved_image_url: null };
  }
}

export async function hydrateMessageImages(messages) {
  const list = Array.isArray(messages) ? messages : [];
  return Promise.all(list.map((message) => resolveMessageImage(message)));
}

/**
 * Fetch all conversations where the user is a participant.
 * @param {string} userId
 * @returns {Promise<{data: Array<object>|null, error: Error|null}>}
 */
export async function getConversations(userId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, participant_ids, status, last_message_at, last_message_preview, last_message')
    .contains('participant_ids', [userId])
    .neq('status', 'archived')
    .order('last_message_at', { ascending: false })
    .limit(50);

  return { data, error };
}

/**
 * Fetch messages for a conversation ordered by created_at ascending.
 * @param {string} conversationId
 * @returns {Promise<{data: Array<object>|null, error: Error|null}>}
 */
export async function getMessages(conversationId, limit = 100) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, from_user_id, body, created_at, image_url')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { data, error };
  const messages = await hydrateMessageImages((data || []).reverse());
  return { data: messages, error };
}

/**
 * Insert a new message into a conversation.
 * @param {Object} payload
 * @param {string} payload.conversation_id
 * @param {string} payload.from_user_id
 * @param {string|null} payload.body
 * @param {string|null} [payload.image_url]
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function sendMessage({ conversation_id, from_user_id, body, image_url = null }) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id, from_user_id, body: body || null, image_url: image_url || null })
    .select()
    .single();

  return { data: data ? await resolveMessageImage(data) : data, error };
}

/**
 * Mark a conversation as read for a user by updating the notification status.
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function markConversationRead(conversationId, userId) {
  const { data, error } = await supabase
    .from('conversation_notifications')
    .upsert(
      { conversation_id: conversationId, user_id: userId, read_at: new Date().toISOString() },
      { onConflict: 'conversation_id,user_id' }
    )
    .select()
    .single();

  return { data, error };
}

/**
 * Create a new conversation with the given participants.
 * @param {string[]} participantIds
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function createConversation(participantIds) {
  const sorted = [...participantIds].sort();
  const { data, error } = await supabase
    .from('conversations')
    .insert({ participant_ids: sorted, status: 'active' })
    .select()
    .single();

  return { data, error };
}

/**
 * Hard-delete a message by ID.
 * @param {string} messageId
 * @returns {Promise<{data: null, error: Error|null}>}
 */
export async function deleteMessage(messageId) {
  const { data, error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)
    .select('id');
  if (error) throw error;
  // An RLS-blocked or non-existent delete returns { error: null, data: [] } —
  // throw so admin moderation can't report a removal that didn't happen.
  if (!data || data.length === 0) {
    throw new Error('Message not found or you do not have permission to delete it.');
  }
  return { data: null, error: null };
}

/**
 * Archive a conversation by updating its status.
 * @param {string} conversationId
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function archiveConversation(conversationId) {
  const { data, error } = await supabase
    .from('conversations')
    .update({ status: 'archived' })
    .eq('id', conversationId)
    .select()
    .single();

  if (error) throw error;
  return { data, error: null };
}

/**
 * Atomically get or create a conversation between participants via RPC.
 * @param {string[]} participantIds
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function getOrCreateConversation(participantIds) {
  try {
    const result = await rpcGetOrCreateConversation({
      participantIds,
      type: 'friend',
      threadExpiresAt: null,
    });
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
