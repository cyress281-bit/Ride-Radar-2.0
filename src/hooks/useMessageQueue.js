/**
 * Message-specific offline queue hook.
 *
 * Specialization of useOfflineQueue for chat messages.
 * Automatically queues messages sent while offline and syncs when reconnected.
 */

import { useCallback, useMemo } from 'react';
import { useOfflineQueue } from './useOfflineQueue.js';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { sendMessage } from '@/features/chat/api/chat-api.js';
import { logger } from '@/lib/logger.js';

const MESSAGE_STORAGE_KEY = 'rr-message-queue';

/**
 * Hook for message-specific offline queueing.
 * @param {string} conversationId
 * @returns {{queueMessage: Function, processQueue: Function, queuedCount: number, totalQueued: number, clearQueue: Function}}
 */
export function useMessageQueue(conversationId) {
  const { user } = useAuthState();

  const {
    addToQueue,
    processQueue,
    clearQueue,
    queueLength,
    queue,
  } = useOfflineQueue({
    storageKey: MESSAGE_STORAGE_KEY,
    processor: async (payload) => {
      const { error } = await sendMessage(payload);
      if (error) {
        throw error;
      }
    },
  });

  const queuedCount = useMemo(() => {
    if (!conversationId) return 0;
    return queue.filter(
      (item) => item.payload?.conversation_id === conversationId
    ).length;
  }, [queue, conversationId]);

  /**
   * Queue a message body for the current conversation.
   * If offline, adds to the queue. If online, sends immediately.
   * @param {string} body - Message text
   * @returns {{queued: boolean, sent: boolean}}
   */
  const queueMessage = useCallback(
    (body) => {
      if (!conversationId) {
        logger.warn('[useMessageQueue] No conversationId provided');
        return { queued: false, sent: false };
      }

      if (!user?.id) {
        logger.warn('[useMessageQueue] User not authenticated');
        return { queued: false, sent: false };
      }

      const payload = {
        conversation_id: conversationId,
        from_user_id: user.id,
        body: body.trim(),
      };

      if (!navigator.onLine) {
        addToQueue(payload);
        return { queued: true, sent: false };
      }

      // Online: send immediately, but queue on failure for retry
      sendMessage(payload).catch((error) => {
        logger.warn('[useMessageQueue] Send failed, queuing for retry:', error);
        addToQueue(payload);
      });

      return { queued: false, sent: true };
    },
    [conversationId, user?.id, addToQueue]
  );

  return {
    queueMessage,
    processQueue,
    queuedCount,
    totalQueued: queueLength,
    clearQueue,
  };
}
