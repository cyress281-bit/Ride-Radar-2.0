-- Add analytics_enabled column to user_settings
-- This allows users to opt-out of privacy-focused analytics

DO $$
BEGIN
  IF to_regclass('public.user_settings') IS NOT NULL THEN
    -- Add column if it doesn't exist (safe to run multiple times)
    ALTER TABLE public.user_settings
    ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT TRUE;

    -- Add comment for documentation
    COMMENT ON COLUMN public.user_settings.analytics_enabled IS 'User opt-in for anonymous usage analytics (Plausible). No PII is collected.';

    -- Create index for efficient queries
    CREATE INDEX IF NOT EXISTS idx_user_settings_analytics_enabled
    ON public.user_settings(analytics_enabled);
  END IF;
END
$$;
