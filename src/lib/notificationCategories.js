/**
 * Notification type → user_settings preference key mapping.
 *
 * Used by frontend filtering to respect granular notification preferences.
 * DB triggers do NOT enforce these (they insert unconditionally).
 * This is a beta-safe frontend filter; DB-level enforcement is a future fast-follow.
 *
 * @readonly
 */

/** Maps notification types to their corresponding user_settings key. */
export const NOTIFICATION_TYPE_TO_SETTING = {
  new_message: 'notify_messages',
  connection_request: 'notify_connections',
  connection_accepted: 'notify_connections',
  broadcast_comment: 'notify_connections',
  post_comment: 'notify_connections',
  profile_like: 'notify_connections',
};

/** Types that always show regardless of user preferences (admin/global duty). */
export const BYPASSED_NOTIFICATION_TYPES = new Set([
  'official_event_review_request',
  'announcement',
]);

/**
 * Determine whether a notification should be visible given user settings.
 *
 * @param {object} notification — normalized notification with `type`
 * @param {object|null} settings — user_settings row (or null if loading)
 * @returns {boolean}
 */
export function shouldShowNotification(notification, settings) {
  if (!notification?.type) return false;

  // Always show bypass types (admin duty, global announcements)
  if (BYPASSED_NOTIFICATION_TYPES.has(notification.type)) return true;

  // If settings are unavailable, default to showing (safer than hiding)
  if (!settings) return true;

  // Master toggle off → hide everything except bypass types
  if (settings.notifications_enabled === false) return false;

  // Check category preference
  const settingKey = NOTIFICATION_TYPE_TO_SETTING[notification.type];
  if (!settingKey) {
    // Unknown type: default to showing (defensive)
    return true;
  }

  // If category preference is explicitly false, hide
  if (settings[settingKey] === false) return false;

  return true;
}
