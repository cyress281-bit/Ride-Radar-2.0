-- Migration: Add updated_at triggers to core tables
-- Purpose: Automatically set updated_at = now() on every UPDATE where the column exists.

-- 1. Trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_updated_at() IS 'Generic BEFORE UPDATE trigger function that stamps updated_at.';

-- 2. Attach triggers to tables with an updated_at column
DO $$
BEGIN
  -- users
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_users_set_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;

  -- user_profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_profiles_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_profiles_set_updated_at
      BEFORE UPDATE ON user_profiles
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;

  -- broadcasts
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_broadcasts_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_broadcasts_set_updated_at
      BEFORE UPDATE ON broadcasts
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;

  -- friendships
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_friendships_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_friendships_set_updated_at
      BEFORE UPDATE ON friendships
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;

  -- user_settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_settings_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_settings_set_updated_at
      BEFORE UPDATE ON user_settings
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;

  -- live_map_presence
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_live_map_presence_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_live_map_presence_set_updated_at
      BEFORE UPDATE ON live_map_presence
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
