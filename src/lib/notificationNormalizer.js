/**
 * Normalizes notification rows from Supabase or legacy Base44-shaped payloads.
 *
 * Rules / mapping summary:
 * - Accepts Supabase row shapes (snake_case) and legacy Base44 shapes (camelCase)
 * - Accepts realtime payload envelopes (e.g. { new: { ... } }) and will use the inner record
 * - Normalizes related entity types to snake_case ('Conversation'|'conversation' -> 'conversation')
 * - Maps several legacy numeric type codes to their string equivalents (defensive)
 * - Exposes both snake_case and camelCase aliases the UI expects (user_id / userId, is_read / isRead)
 * - Adds actor_* aliases for common actor fields if present (actor_id / actorId / from_user_id)
 *
 * IMPORTANT: This file focuses on structural normalization only and does not change business logic.
 */

const LEGACY_TYPE_MAP = {
  // Defensive mapping for older numeric codes if any exist in legacy rows.
  // These numeric codes are hypothetical but harmless to include — if numbers are not present nothing changes.
  1: 'connection_request',
  2: 'connection_accepted',
  3: 'new_message',
  4: 'rsvp',
  5: 'event_reminder',
  6: 'broadcast_expired',
  7: 'thread_expired',
  8: 'friend_request',
  9: 'friend_accepted',
  10: 'alert',
  11: 'announcement',
};

function normalizeRelatedEntityType(value) {
  if (!value) return null;

  const normalized = String(value)
    .trim()
    // Split camelCase -> snake_case
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    // Replace separators with underscore
    .replace(/[-\s]+/g, '_')
    .toLowerCase();

  // Common legacy alias
  if (normalized === 'userprofile') return 'user_profile';
  if (normalized === 'conversation') return 'conversation';
  if (normalized === 'broadcast' || normalized === 'broadcasts') return 'broadcast';
  return normalized;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null) ?? null;
}

function extractRecord(payload) {
  // Support realtime envelopes and other wrappers used in the codebase.
  if (!payload) return null;
  if (payload.new) return payload.new;
  if (payload.record) return payload.record;
  if (payload.payload && payload.payload.new) return payload.payload.new;
  return payload;
}

function normalizeType(raw) {
  if (raw === null || raw === undefined) return null;
  // numeric codes -> map them if present
  if (typeof raw === 'number') return LEGACY_TYPE_MAP[raw] ?? String(raw);
  // sometimes a numeric string is stored
  if (/^\d+$/.test(String(raw))) {
    const mapped = LEGACY_TYPE_MAP[Number(raw)];
    if (mapped) return mapped;
  }
  // otherwise normalize string values to snake_case-like format used in Base44 entity definition
  return String(raw).trim().replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase();
}

export function normalizeNotification(notification) {
  const row = extractRecord(notification);
  if (!row) return null;

  const data = row.data ?? {};

  // Determine related entity type (supports multiple field names)
  const relatedEntityTypeRaw = firstDefined(
    row.related_entity_type,
    row.relatedEntityType,
    row.type_name,
    data.related_entity_type,
    data.relatedEntityType,
    data.type_name,
    row.relatedEntityType // fallback
  );
  const relatedEntityType = normalizeRelatedEntityType(relatedEntityTypeRaw);

  // Determine related entity id - support broadcastId, conversationId, and legacy fields
  const relatedEntityId = firstDefined(
    row.related_entity_id,
    row.relatedEntityId,
    row.relatedEntityID,
    row.relatedEntity_id,
    row.related_entityId,
    row.broadcast_id,
    row.broadcastId,
    row.relatedEntityId,
    data.related_entity_id,
    data.relatedEntityId,
    row.relatedEntityId,
    row.relatedEntityID
  );

  // Recipient / user id resolution (many legacy field names)
  const userId = firstDefined(
    row.userAuthId,
    row.user_auth_id,
    data.userAuthId,
    data.user_auth_id,
    row.user_id,
    row.userId,
    data.user_id,
    data.userId
  );

  // Actor (who triggered the notification) - may be fromUserId, actorId, etc.
  const actorId = firstDefined(
    row.actor_id,
    row.actorId,
    row.from_user_id,
    row.fromUserId,
    data.actor_id,
    data.from_user_id
  );

  // Type normalization: handles numeric legacy codes and string types
  const rawType = firstDefined(row.type, row.notification_type, row.kind, data.type, data.type_name, row.type_code, data.type_code);
  const type = normalizeType(rawType);

  // Id and timestamps - accept several common aliases
  const id = firstDefined(row.id, row._id, row.notification_id, data.id);
  const createdAt = firstDefined(row.created_at, row.created_date, row.createdDate, row.createdAt, data.created_at, data.createdAt) ?? null;

  const title = firstDefined(row.title, row.message, row.body, data.title, data.message, data.body) ?? '';
  const body = firstDefined(row.body, row.message, data.body, data.message) ?? '';

  const isRead = firstDefined(row.is_read, row.isRead, row.read, data.is_read, data.isRead) ?? false;
  const isGlobal = firstDefined(row.is_global, row.isGlobal, data.is_global, data.isGlobal) ?? false;

  // Build normalized object exposing both snake_case and camelCase aliases the UI expects.
  return {
    ...row,
    id,
    // Recipient aliases
    user_id: userId,
    userId: userId,
    userAuthId: userId,
    recipient_profile_id: firstDefined(row.recipient_profile_id, data.recipient_profile_id, userId),

    // Actor aliases (may be null)
    actor_id: actorId,
    actorId: actorId,

    // Type and human content
    type,
    title,
    body,

    // Read/global flags
    is_read: isRead,
    isRead: isRead,
    is_global: isGlobal,
    isGlobal: isGlobal,

    // Related entity
    related_entity_id: relatedEntityId,
    relatedEntityId: relatedEntityId,
    related_entity_type: relatedEntityType,
    relatedEntityType: relatedEntityType,

    // Timestamps
    created_at: createdAt,
    createdAt: createdAt,
  };
}

export function normalizeNotifications(notifications) {
  if (!Array.isArray(notifications)) return [];
  return notifications.map(normalizeNotification).filter(Boolean);
}
