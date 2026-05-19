-- Add is_global column to notifications.
-- Referenced by the admin_read_notifications RLS policy and sendAnnouncement()
-- in admin-api.js, but was absent from the baseline schema.
-- DEFAULT false so existing rows are treated as user-targeted (not global).

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;
