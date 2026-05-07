/**
 * Normalizes notification rows from Supabase or legacy Base44-shaped payloads.
 * Keeps the raw row intact and adds aliases the UI can safely consume.
 */

function normalizeRelatedEntityType(value) {
  if (!value) return null;

  const normalized = String(value)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();

  if (normalized === 'userprofile') return 'user_profile';
  return normalized;
}

export function normalizeNotification(notification) {
  if (!notification) return null;

  const relatedEntityType = normalizeRelatedEntityType(
    notification.related_entity_type ??
    notification.relatedEntityType ??
    notification.type_name ??
    notification.data?.relatedEntityType
  );

  return {
    ...notification,
    user_id: notification.user_id ?? notification.userAuthId ?? notification.user_auth_id ?? notification.userId ?? null,
    userId: notification.userId ?? notification.user_id ?? null,
    userAuthId: notification.userAuthId ?? notification.user_auth_id ?? notification.user_id ?? null,
    recipient_profile_id: notification.recipient_profile_id ?? notification.userId ?? notification.user_id ?? null,
    type: notification.type ?? notification.notification_type ?? notification.kind ?? null,
    title: notification.title ?? '',
    body: notification.body ?? notification.message ?? '',
    is_read: notification.is_read ?? notification.isRead ?? notification.read ?? false,
    isRead: notification.isRead ?? notification.is_read ?? notification.read ?? false,
    is_global: notification.is_global ?? notification.isGlobal ?? false,
    isGlobal: notification.isGlobal ?? notification.is_global ?? false,
    related_entity_id:
      notification.related_entity_id ??
      notification.relatedEntityId ??
      notification.data?.relatedEntityId ??
      null,
    relatedEntityId: notification.relatedEntityId ?? notification.related_entity_id ?? notification.data?.relatedEntityId ?? null,
    related_entity_type: relatedEntityType,
    relatedEntityType: relatedEntityType,
    created_at: notification.created_at ?? notification.created_date ?? notification.createdDate ?? notification.createdAt ?? null,
    createdAt: notification.createdAt ?? notification.created_at ?? notification.created_date ?? notification.createdDate ?? null,
  };
}

export function normalizeNotifications(notifications) {
  if (!Array.isArray(notifications)) return [];
  return notifications.map(normalizeNotification);
}
