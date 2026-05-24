import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { useOnlineStatus } from '@/hooks/use-online-status.js';
import { sendMessage as apiSendMessage } from '@/features/chat/api/chat-api.js';
import { PRIVATE_MESSAGE_IMAGE_BUCKET, uploadPrivateImage } from '@/lib/image-utils.js';
import { toast } from 'sonner';
import { logger } from '@/lib/logger.js';
import { trackMessageSent } from '@/lib/analytics.js';

/**
 * Hook to send a message in a conversation.
 *
 * Accepts { body, imageFile, _tempId }:
 *   body      — optional text string
 *   imageFile — optional File object; uploaded before insert
 *   _tempId   — stable client ID; used for optimistic dedup and offline queue
 *
 * Offline behaviour: text messages are queued to localStorage and sent
 * automatically when connectivity is restored. Failed sends are marked
 * _failed so the UI can show a retry tap target.
 */

const QUEUE_KEY = 'rr:message-queue';

function loadQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}
function saveQueue(q) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {}
}
function addToQueue(item) {
  const q = loadQueue();
  if (!q.find((e) => e._tempId === item._tempId)) { q.push(item); saveQueue(q); }
}
function removeFromQueue(tempId) {
  saveQueue(loadQueue().filter((e) => e._tempId !== tempId));
}

export function useSendMessage(conversationId) {
  const { user } = useAuthState();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  const mutation = useMutation({
    mutationFn: async ({ body, imageFile, _tempId } = {}) => {
      if (!user) throw new Error('Must be authenticated to send message');

      // Queue text messages when offline; image sends fall through to fail naturally
      if (!isOnline && !imageFile) {
        addToQueue({ conversationId, body: body?.trim() || null, _tempId });
        const err = new Error('You are offline. Your message will be sent when you reconnect.');
        err._offline = true;
        throw err;
      }

      const trimmedBody = body?.trim() || null;
      if (!trimmedBody && !imageFile) throw new Error('Message cannot be empty');

      let image_url = null;
      if (imageFile) {
        const path = `messages/${user.id}/${conversationId}/${Date.now()}_${Math.random().toString(36).slice(2)}`;
        image_url = await uploadPrivateImage(imageFile, PRIVATE_MESSAGE_IMAGE_BUCKET, path, 'message');
      }

      const { data: message, error: messageError } = await apiSendMessage({
        conversation_id: conversationId,
        from_user_id: user.id,
        body: trimmedBody,
        image_url,
      });

      if (messageError) {
        logger.error('[useSendMessage] Error creating message:', messageError);
        throw messageError;
      }

      if (_tempId) removeFromQueue(_tempId);
      return message;
    },

    onMutate: async ({ body, imageFile, _tempId } = {}) => {
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });

      const previousMessages = queryClient.getQueryData(['messages', conversationId]);

      const trimmedBody = body?.trim() || null;
      const optimisticImageUrl = imageFile ? URL.createObjectURL(imageFile) : null;

      // Use caller-supplied _tempId so retries and queue drains replace the same bubble
      const optimisticId = _tempId || `optimistic-${Date.now()}`;
      const optimisticMessage = {
        id: optimisticId,
        conversation_id: conversationId,
        from_user_id: user.id,
        body: trimmedBody,
        image_url: optimisticImageUrl,
        created_at: new Date().toISOString(),
        _optimistic: true,
        _pending: true,
        _localImageUrl: optimisticImageUrl,
      };

      queryClient.setQueryData(['messages', conversationId], (old = []) => {
        const hasExisting = old.some((m) => m.id === optimisticId);
        if (hasExisting) return old.map((m) => m.id === optimisticId ? { ...optimisticMessage } : m);
        return [...old, optimisticMessage];
      });

      queryClient.setQueryData(['conversations', user?.id], (old = []) => {
        const updated = old.map((conv) =>
          conv.id === conversationId
            ? { ...conv, last_message_at: new Date().toISOString() }
            : conv
        );
        return updated.sort(
          (a, b) =>
            new Date(b.last_message_at || 0).getTime() -
            new Date(a.last_message_at || 0).getTime()
        );
      });

      return { previousMessages, optimisticMessage };
    },

    onSuccess: (serverMessage, _variables, context) => {
      if (context?.optimisticMessage?._localImageUrl) {
        URL.revokeObjectURL(context.optimisticMessage._localImageUrl);
      }

      trackMessageSent();

      queryClient.setQueryData(['messages', conversationId], (old = []) =>
        old.map((msg) =>
          msg.id === context.optimisticMessage.id ? serverMessage : msg
        )
      );

      queryClient.setQueryData(['conversations', user?.id], (old = []) => {
        const updated = old.map((conv) =>
          conv.id === conversationId
            ? { ...conv, last_message_at: serverMessage.created_at }
            : conv
        );
        return updated.sort(
          (a, b) =>
            new Date(b.last_message_at || 0).getTime() -
            new Date(a.last_message_at || 0).getTime()
        );
      });
    },

    onError: (error, _variables, context) => {
      if (context?.optimisticMessage?._localImageUrl) {
        URL.revokeObjectURL(context.optimisticMessage._localImageUrl);
      }

      if (error._offline) {
        // Keep the _pending optimistic bubble; no toast — user can see they're offline
        return;
      }

      // Mark as failed so the UI can show a retry tap target (not rolled back)
      queryClient.setQueryData(['messages', conversationId], (old = []) =>
        old.map((msg) =>
          msg.id === context?.optimisticMessage?.id
            ? { ...msg, _pending: false, _failed: true }
            : msg
        )
      );
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });

      toast.error('Failed to send message', {
        description: error?.message || 'Please try again.',
      });
    },
  });

  // Drain queued messages for this conversation when connectivity is restored
  useEffect(() => {
    if (!isOnline) return;
    const queue = loadQueue().filter((item) => item.conversationId === conversationId);
    if (queue.length === 0) return;
    for (const item of queue) {
      mutation.mutate({ body: item.body, _tempId: item._tempId });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, conversationId]);

  return mutation;
}
