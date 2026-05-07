-- Live map privacy and event placement plumbing.
-- Adds opt-in rider presence plus privacy metadata for mapped broadcasts.

DO $$
BEGIN
  IF to_regclass('public.user_settings') IS NOT NULL THEN
    ALTER TABLE public.user_settings
      ADD COLUMN IF NOT EXISTS live_map_visible boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS live_map_location_precision text NOT NULL DEFAULT 'approximate';

    UPDATE public.user_settings
    SET live_map_location_precision = 'approximate'
    WHERE live_map_location_precision IS NULL
       OR live_map_location_precision NOT IN ('approximate', 'precise');

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'user_settings_live_map_location_precision_check'
        AND conrelid = 'public.user_settings'::regclass
    ) THEN
      ALTER TABLE public.user_settings
        ADD CONSTRAINT user_settings_live_map_location_precision_check
        CHECK (live_map_location_precision IN ('approximate', 'precise'));
    END IF;

    COMMENT ON COLUMN public.user_settings.live_map_visible IS
      'Opt-in control for showing the rider on the live map.';
    COMMENT ON COLUMN public.user_settings.live_map_location_precision IS
      'Controls whether live map presence uses an approximate or precise marker.';

    CREATE INDEX IF NOT EXISTS idx_user_settings_live_map_visible
      ON public.user_settings(live_map_visible)
      WHERE live_map_visible = true;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.broadcasts') IS NOT NULL THEN
    ALTER TABLE public.broadcasts
      ADD COLUMN IF NOT EXISTS location_privacy text NOT NULL DEFAULT 'approximate',
      ADD COLUMN IF NOT EXISTS location_geocoded_at timestamptz,
      ADD COLUMN IF NOT EXISTS location_geocode_provider text,
      ADD COLUMN IF NOT EXISTS location_geocode_query text;

    UPDATE public.broadcasts
    SET location_privacy = CASE
      WHEN type = 'event' THEN 'exact_event'
      WHEN frozen_lat IS NULL OR frozen_lng IS NULL THEN 'none'
      ELSE 'approximate'
    END
    WHERE location_privacy IS NULL
       OR location_privacy NOT IN ('none', 'approximate', 'exact_event', 'precise');

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'broadcasts_location_privacy_check'
        AND conrelid = 'public.broadcasts'::regclass
    ) THEN
      ALTER TABLE public.broadcasts
        ADD CONSTRAINT broadcasts_location_privacy_check
        CHECK (location_privacy IN ('none', 'approximate', 'exact_event', 'precise'));
    END IF;

    COMMENT ON COLUMN public.broadcasts.location_privacy IS
      'Privacy treatment for the stored map coordinate: none, approximate, exact_event, or precise.';
    COMMENT ON COLUMN public.broadcasts.location_geocoded_at IS
      'Timestamp when text location was resolved to map coordinates.';
    COMMENT ON COLUMN public.broadcasts.location_geocode_provider IS
      'Provider used to resolve text location.';
    COMMENT ON COLUMN public.broadcasts.location_geocode_query IS
      'Normalized text submitted for geocoding.';

    CREATE INDEX IF NOT EXISTS idx_broadcasts_active_map_locations
      ON public.broadcasts(status, type, expires_at)
      WHERE type IN ('event', 'alert')
        AND frozen_lat IS NOT NULL
        AND frozen_lng IS NOT NULL;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.live_map_presence (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  vehicle_label text,
  is_visible boolean NOT NULL DEFAULT false,
  location_precision text NOT NULL DEFAULT 'approximate'
    CHECK (location_precision IN ('approximate', 'precise')),
  lat double precision,
  lng double precision,
  accuracy_meters integer CHECK (accuracy_meters IS NULL OR accuracy_meters >= 0),
  approximate_radius_miles numeric(4,2)
    CHECK (approximate_radius_miles IS NULL OR approximate_radius_miles >= 0),
  source text NOT NULL DEFAULT 'settings',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT live_map_presence_lat_lng_together_check
    CHECK ((lat IS NULL AND lng IS NULL) OR (lat IS NOT NULL AND lng IS NOT NULL)),
  CONSTRAINT live_map_presence_lat_range_check
    CHECK (lat IS NULL OR (lat >= -90 AND lat <= 90)),
  CONSTRAINT live_map_presence_lng_range_check
    CHECK (lng IS NULL OR (lng >= -180 AND lng <= 180)),
  CONSTRAINT live_map_presence_visible_location_check
    CHECK (is_visible = false OR (lat IS NOT NULL AND lng IS NOT NULL))
);

COMMENT ON TABLE public.live_map_presence IS
  'Current opt-in live map rider markers. Approximate mode stores only the fuzzed marker coordinate.';
COMMENT ON COLUMN public.live_map_presence.location_precision IS
  'Marker precision chosen by the rider: approximate stores only fuzzed coordinates, precise stores the GPS coordinate.';
COMMENT ON COLUMN public.live_map_presence.expires_at IS
  'Presence is considered inactive after this time unless refreshed by the client.';

CREATE INDEX IF NOT EXISTS idx_live_map_presence_visible_expires
  ON public.live_map_presence(is_visible, expires_at DESC)
  WHERE is_visible = true;

CREATE INDEX IF NOT EXISTS idx_live_map_presence_last_seen
  ON public.live_map_presence(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_map_presence_lat_lng
  ON public.live_map_presence(lat, lng)
  WHERE is_visible = true
    AND lat IS NOT NULL
    AND lng IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_live_map_presence_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_live_map_presence_updated_at ON public.live_map_presence;
CREATE TRIGGER set_live_map_presence_updated_at
  BEFORE UPDATE ON public.live_map_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.set_live_map_presence_updated_at();

ALTER TABLE public.live_map_presence ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.live_map_presence FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_map_presence TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'live_map_presence'
      AND policyname = 'Authenticated riders can read active visible presence'
  ) THEN
    CREATE POLICY "Authenticated riders can read active visible presence"
      ON public.live_map_presence
      FOR SELECT
      TO authenticated
      USING (
        (select public.is_admin())
        OR user_id = (select auth.uid())
        OR (
          is_visible = true
          AND expires_at > now()
          AND lat IS NOT NULL
          AND lng IS NOT NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'live_map_presence'
      AND policyname = 'Riders can insert own live map presence'
  ) THEN
    CREATE POLICY "Riders can insert own live map presence"
      ON public.live_map_presence
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = (select auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'live_map_presence'
      AND policyname = 'Riders can update own live map presence'
  ) THEN
    CREATE POLICY "Riders can update own live map presence"
      ON public.live_map_presence
      FOR UPDATE
      TO authenticated
      USING ((select public.is_admin()) OR user_id = (select auth.uid()))
      WITH CHECK ((select public.is_admin()) OR user_id = (select auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'live_map_presence'
      AND policyname = 'Riders can delete own live map presence'
  ) THEN
    CREATE POLICY "Riders can delete own live map presence"
      ON public.live_map_presence
      FOR DELETE
      TO authenticated
      USING ((select public.is_admin()) OR user_id = (select auth.uid()));
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'live_map_presence'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_map_presence;
  END IF;
END
$$;
