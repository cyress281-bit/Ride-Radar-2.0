/**
 * Date grouping utilities for notifications, activity feeds, etc.
 */

export function isToday(dateString) {
  if (!dateString) return false;
  const d = new Date(dateString);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export function isYesterday(dateString) {
  if (!dateString) return false;
  const d = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Group notifications into today / yesterday / earlier buckets.
 * @param {Array<{created_at: string}>} notifications
 * @returns {{today: Array, yesterday: Array, earlier: Array}}
 */
export function groupNotificationsByDate(notifications) {
  const groups = { today: [], yesterday: [], earlier: [] };
  for (const n of notifications) {
    if (isToday(n.created_at)) groups.today.push(n);
    else if (isYesterday(n.created_at)) groups.yesterday.push(n);
    else groups.earlier.push(n);
  }
  return groups;
}
