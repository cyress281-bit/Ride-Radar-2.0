-- Migration: Backfill legacy notifications
-- Date: May 7, 2026
-- Purpose: Rewrite legacy profile-linked notification rows so they consistently
--          reference auth user IDs and normalize related_entity_type casing.

WITH legacy_notifications AS (
  SELECT
    n.id,
    recipient_profile.user_id AS recipient_auth_user_id,
    related_profile.user_id AS related_auth_user_id,
    CASE
      WHEN lower(replace(replace(coalesce(n.related_entity_type, ''), '_', ''), '-', '')) = 'userprofile'
        THEN 'user_profile'
      ELSE n.related_entity_type
    END AS normalized_related_entity_type
  FROM notifications n
  LEFT JOIN user_profiles AS recipient_profile
    ON recipient_profile.id = n.user_id
  LEFT JOIN user_profiles AS related_profile
    ON related_profile.id = n.related_entity_id
  WHERE
    recipient_profile.id IS NOT NULL
    OR lower(replace(replace(coalesce(n.related_entity_type, ''), '_', ''), '-', '')) = 'userprofile'
)
UPDATE notifications AS n
SET
  user_id = COALESCE(legacy_notifications.recipient_auth_user_id, n.user_id),
  related_entity_id = CASE
    WHEN legacy_notifications.normalized_related_entity_type = 'user_profile'
      THEN COALESCE(legacy_notifications.related_auth_user_id, n.related_entity_id)
    ELSE n.related_entity_id
  END,
  related_entity_type = legacy_notifications.normalized_related_entity_type
FROM legacy_notifications
WHERE n.id = legacy_notifications.id
  AND (
    n.user_id IS DISTINCT FROM COALESCE(legacy_notifications.recipient_auth_user_id, n.user_id)
    OR n.related_entity_id IS DISTINCT FROM CASE
      WHEN legacy_notifications.normalized_related_entity_type = 'user_profile'
        THEN COALESCE(legacy_notifications.related_auth_user_id, n.related_entity_id)
      ELSE n.related_entity_id
    END
    OR n.related_entity_type IS DISTINCT FROM legacy_notifications.normalized_related_entity_type
  );
