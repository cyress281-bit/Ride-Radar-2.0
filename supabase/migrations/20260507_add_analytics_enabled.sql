-- Add analytics_enabled column to user_settings
-- This allows users to opt-out of privacy-focused analytics

-- Add column if it doesn't exist (safe to run multiple times)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT TRUE;

-- Add comment for documentation
COMMENT ON COLUMN user_settings.analytics_enabled IS 'User opt-in for anonymous usage analytics (Plausible). No PII is collected.';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_settings_analytics_enabled
ON user_settings(analytics_enabled);
