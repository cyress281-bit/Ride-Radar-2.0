import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with conditional support.
 * Uses `clsx` for conditional logic and `tailwind-merge` to resolve conflicts.
 * @param  {...(string|object|Array)} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(...inputs));
}

/**
 * Format a distance in miles to a human-readable string.
 * @param {number|null|undefined} miles
 * @returns {string|null}
 */
export function formatDistance(miles) {
  if (miles == null) return null;
  if (miles >= 50) return '50+ mi';
  return `${miles.toFixed(1)} mi`;
}

/**
 * Format a date string as a relative time (e.g. "2h ago").
 * @param {string|Date|null|undefined} dateString
 * @returns {string}
 */
export function timeAgo(dateString) {
  if (!dateString) return 'just now';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

/**
 * Format a date string as time remaining until expiry.
 * @param {string|Date|null|undefined} dateString
 * @returns {string}
 */
export function timeUntilExpiry(dateString) {
  if (!dateString) return 'expired';
  const diffMs = new Date(dateString).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';

  const diffSec = Math.floor(diffMs / 1000);
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);

  if (hours > 0 && minutes > 0) return `Expires in ${hours}h ${minutes}m`;
  if (hours > 0) return `Expires in ${hours}h`;
  if (minutes > 0) return `Expires in ${minutes}m`;
  return 'Expires in <1m';
}

/**
 * Clamp a number between min and max (inclusive).
 * @param {number} num
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

/**
 * Debounce a function so it only fires after `ms` of inactivity.
 * @template T
 * @param {(...args: T[]) => void} fn
 * @param {number} ms
 * @returns {(...args: T[]) => void}
 */
export function debounce(fn, ms) {
  let timeoutId;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
}

/**
 * Validate whether a string is a valid UUID (v4 or generic).
 * @param {string|null|undefined} str
 * @returns {boolean}
 */
export function isValidUuid(str) {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
