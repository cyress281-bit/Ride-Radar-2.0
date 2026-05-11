/**
 * Generic offline mutation queue hook.
 *
 * Queues mutations when offline, processes them when back online,
 * and persists the queue in localStorage with 24-hour expiration.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useOnlineStatus } from './use-online-status.js';
import { logger } from '@/lib/logger.js';

const DEFAULT_STORAGE_KEY = 'rr-offline-queue';
const EXPIRATION_MS = 24 * 60 * 60 * 1000;

/**
 * Hook for generic offline mutation queueing.
 * @param {Object} [options]
 * @param {string} [options.storageKey] - localStorage key (default: 'rr-offline-queue')
 * @param {Function} [options.processor] - Async function to process queue items automatically when back online
 * @returns {{addToQueue: Function, processQueue: Function, clearQueue: Function, queueLength: number, queue: Array<Object>}}
 */
export function useOfflineQueue(options = {}) {
  const { storageKey = DEFAULT_STORAGE_KEY, processor } = options;
  const isOnline = useOnlineStatus();

  const [queue, setQueue] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const queueRef = useRef(queue);
  const processorRef = useRef(processor);
  const wasOnlineRef = useRef(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    processorRef.current = processor;
  }, [processor]);

  // Load queue from localStorage on mount and filter expired items
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cutoff = Date.now() - EXPIRATION_MS;
          const valid = parsed.filter((item) => item.timestamp > cutoff);
          setQueue(valid);
          if (valid.length < parsed.length) {
            logger.debug(
              `[useOfflineQueue] Expired ${parsed.length - valid.length} queue items`
            );
          }
        }
      }
    } catch (error) {
      logger.error('[useOfflineQueue] Failed to load queue:', error);
    } finally {
      setLoaded(true);
    }
  }, [storageKey]);

  // Persist queue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(queue));
    } catch (error) {
      logger.error('[useOfflineQueue] Failed to save queue:', error);
    }
  }, [queue, storageKey]);

  /**
   * Add an item to the offline queue.
   * @param {*} item - Payload to queue
   */
  const addToQueue = useCallback((item) => {
    const entry = {
      id:
        crypto.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      payload: item,
    };
    setQueue((prev) => [...prev, entry]);
  }, []);

  /**
   * Process all pending queue items.
   * @param {Function} [processorFn] - Optional override processor. Falls back to options.processor.
   * @returns {Promise<{processed: number, failed: number, skipped: number}>}
   */
  const processQueue = useCallback(
    async (processorFn) => {
      if (!isOnline) {
        return {
          processed: 0,
          failed: 0,
          skipped: queueRef.current.length,
        };
      }

      if (isProcessingRef.current) {
        logger.debug('[useOfflineQueue] Already processing, skipping duplicate run');
        return { processed: 0, failed: 0, skipped: queueRef.current.length };
      }

      const currentQueue = queueRef.current;
      if (currentQueue.length === 0) {
        return { processed: 0, failed: 0, skipped: 0 };
      }

      const fn = processorFn || processorRef.current;
      if (!fn) {
        logger.warn(
          '[useOfflineQueue] No processor provided, skipping queue processing'
        );
        return { processed: 0, failed: 0, skipped: currentQueue.length };
      }

      isProcessingRef.current = true;
      const remaining = [];
      let processed = 0;

      try {
        for (const entry of currentQueue) {
          try {
            await fn(entry.payload);
            processed++;
          } catch (error) {
            logger.warn(
              '[useOfflineQueue] Item failed, keeping for retry:',
              error
            );
            remaining.push(entry);
          }
        }

        setQueue(remaining);
        return { processed, failed: remaining.length, skipped: 0 };
      } finally {
        isProcessingRef.current = false;
      }
    },
    [isOnline]
  );

  /**
   * Clear the entire queue.
   */
  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  // Auto-process queue when transitioning from offline to online or on mount with pending items
  useEffect(() => {
    if (!loaded) return;

    const transitioningToOnline = isOnline && !wasOnlineRef.current;
    wasOnlineRef.current = isOnline;

    if (
      transitioningToOnline &&
      queueRef.current.length > 0 &&
      processorRef.current
    ) {
      processQueue();
    }
  }, [isOnline, processQueue, loaded]);

  return {
    addToQueue,
    processQueue,
    clearQueue,
    queueLength: queue.length,
    queue,
  };
}
