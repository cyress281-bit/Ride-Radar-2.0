import { useRef, useCallback } from 'react';

/**
 * Hook that returns a throttled version of a callback.
 * The callback will only execute once per `limitMs` window.
 *
 * @param {Function} fn
 * @param {number} limitMs
 * @returns {Function}
 */
export function useThrottle(fn, limitMs = 5000) {
  const lastRunRef = useRef(0);

  return useCallback(
    (...args) => {
      const now = Date.now();
      if (now - lastRunRef.current < limitMs) {
        return Promise.resolve({ throttled: true });
      }
      lastRunRef.current = now;
      return fn(...args);
    },
    [fn, limitMs]
  );
}
