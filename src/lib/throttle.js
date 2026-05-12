/**
 * Simple in-memory throttle for client-side rate limiting.
 * Prevents accidental double-clicks and rapid-fire API calls.
 *
 * @param {Function} fn
 * @param {number} limitMs
 * @returns {Function}
 */
export function throttle(fn, limitMs = 5000) {
  const lastRun = new Map();

  return async function throttled(...args) {
    const key = JSON.stringify(args);
    const now = Date.now();
    if (lastRun.has(key) && now - lastRun.get(key) < limitMs) {
      return { data: null, error: new Error('Please wait a moment before trying again.') };
    }
    lastRun.set(key, now);
    return fn.apply(this, args);
  };
}
