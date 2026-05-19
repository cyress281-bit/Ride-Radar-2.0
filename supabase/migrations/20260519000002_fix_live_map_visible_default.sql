-- Align live_map_visible column default with the app's privacy-first intent.
-- The baseline schema had DEFAULT true, but the app (settings-api.js DEFAULT_SETTINGS)
-- and the live-map hook both default to false (opt-in, not opt-out).
-- This fixes fresh-row creation and communicates intent clearly in the schema.

ALTER TABLE user_settings
  ALTER COLUMN live_map_visible SET DEFAULT false;
