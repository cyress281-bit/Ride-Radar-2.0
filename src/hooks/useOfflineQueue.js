/**
 * Offline Queue Hook
 *
 * Queues mutations when offline and processes them when back online
 * Useful for messages, broadcasts, and other user actions
 */

import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const QUEUE_KEY = 'ride-radar-offline-queue';

/**
 * Get queued items from localStorage
 */
function getQueue() {
  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[Queue] Failed to load queue:', error);
    return [];
  }
}

/**
 * Save queue to localStorage
 */
function saveQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[Queue] Failed to save queue:', error);
  }
}

/**
 * Hook for managing offline queue
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState(getQueue);
  const [processing, setProcessing] = useState(false);
  const isOnline = useOnlineStatus();

  /**
   * Add item to queue
   * @param {string} type - Type of mutation (e.g., 'send-message', 'create-broadcast')
   * @param {Object} data - Data for the mutation
   * @param {Function} handler - Function to execute when back online
   */
  const enqueue = useCallback((type, data, handler) => {
    const item = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
    };

    setQueue((prev) => {
      const newQueue = [...prev, item];
      saveQueue(newQueue);
      return newQueue;
    });

    console.log(`[Queue] Added ${type} to offline queue`, item.id);
    return item.id;
  }, []);

  /**
   * Remove item from queue
   */
  const dequeue = useCallback((itemId) => {
    setQueue((prev) => {
      const newQueue = prev.filter((item) => item.id !== itemId);
      saveQueue(newQueue);
      return newQueue;
    });
  }, []);

  /**
   * Process queue when back online
   */
  const processQueue = useCallback(async (handlers) => {
    if (!isOnline || queue.length === 0 || processing) {
      return;
    }

    setProcessing(true);
    console.log(`[Queue] Processing ${queue.length} queued items`);

    for (const item of queue) {
      try {
        const handler = handlers[item.type];
        if (!handler) {
          console.warn(`[Queue] No handler for type: ${item.type}`);
          dequeue(item.id);
          continue;
        }

        console.log(`[Queue] Processing ${item.type}:`, item.id);
        await handler(item.data);

        dequeue(item.id);
        console.log(`[Queue] Successfully processed ${item.type}:`, item.id);
      } catch (error) {
        console.error(`[Queue] Failed to process ${item.type}:`, error);

        // Remove from queue if too old (older than 24 hours)
        if (Date.now() - item.timestamp > 24 * 60 * 60 * 1000) {
          console.log(`[Queue] Removing stale item: ${item.id}`);
          dequeue(item.id);
        }
      }
    }

    setProcessing(false);
  }, [isOnline, queue, processing, dequeue]);

  /**
   * Clear entire queue
   */
  const clearQueue = useCallback(() => {
    setQueue([]);
    localStorage.removeItem(QUEUE_KEY);
    console.log('[Queue] Cleared queue');
  }, []);

  return {
    queue,
    queueCount: queue.length,
    enqueue,
    dequeue,
    processQueue,
    clearQueue,
    processing,
  };
}

/**
 * Hook specifically for message queue
 * Automatically processes queue when back online
 */
export function useMessageQueue() {
  const { queue, queueCount, enqueue, processQueue } = useOfflineQueue();
  const isOnline = useOnlineStatus();

  // Auto-process when coming back online
  useEffect(() => {
    if (isOnline && queueCount > 0) {
      // Small delay to ensure connection is stable
      const timer = setTimeout(() => {
        processQueue({
          'send-message': async (data) => {
            const { supabase } = await import('@/lib/supabase');
            const { error } = await supabase
              .from('messages')
              .insert({
                conversation_id: data.conversationId,
                sender_id: data.senderId,
                content: data.content,
                created_at: new Date().toISOString(),
              });

            if (error) throw error;
          },
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, queueCount, processQueue]);

  /**
   * Queue a message for sending
   */
  const queueMessage = useCallback(
    (conversationId, senderId, content) => {
      return enqueue('send-message', {
        conversationId,
        senderId,
        content,
      });
    },
    [enqueue]
  );

  return {
    queuedMessages: queue.filter((item) => item.type === 'send-message'),
    queueMessage,
    hasQueuedMessages: queue.some((item) => item.type === 'send-message'),
  };
}
