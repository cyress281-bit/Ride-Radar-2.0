-- Add granular notification category preferences to user_settings
-- These are additive boolean columns that work alongside the existing
-- notifications_enabled master toggle. When notifications_enabled is false,
-- all categories are effectively disabled regardless of these values.

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS notify_messages boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_meetups boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_safety_alerts boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_connections boolean DEFAULT true;

COMMENT ON COLUMN user_settings.notify_messages IS 'In-app notifications for direct messages';
COMMENT ON COLUMN user_settings.notify_meetups IS 'In-app notifications for meetups and events';
COMMENT ON COLUMN user_settings.notify_safety_alerts IS 'In-app notifications for safety alerts and bike-down signals';
COMMENT ON COLUMN user_settings.notify_connections IS 'In-app notifications for connection requests and social activity';
