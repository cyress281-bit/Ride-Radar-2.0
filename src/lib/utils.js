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
  const date = new Date(dateString);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return 'just now';
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
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
