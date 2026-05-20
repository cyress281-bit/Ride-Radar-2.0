-- Field-test hardening for Radar visibility.
--
-- Product visibility rules:
-- - Live rider presence is nearby/radius-scoped only.
-- - Ride Now / Need Help / Road Warning remain nearby/radius-scoped.
-- - Event/Meetup and Bike Down signals are globally visible.
-- - Block relationships still exclude content server-side.

-- =============================================================================
-- Live rider presence: nearby only, block-aware
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_live_map_presence();

CREATE FUNCTION public.get_live_map_presence(
  viewer_lat double precision,
  viewer_lng double precision,
  radius_miles double precision DEFAULT 50,
  exclude_user_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  vehicle_label text,
  is_visible boolean,
  location_precision text,
  lat double precision,
  lng double precision,
  accuracy_meters int,
  approximate_radius_miles numeric,
  source text,
  last_seen_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  IF viewer_lat IS NULL
    OR viewer_lng IS NULL
    OR radius_miles IS NULL
    OR radius_miles <= 0
  THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.vehicle_label,
    p.is_visible,
    p.location_precision,
    p.lat,
    p.lng,
    p.accuracy_meters,
    p.approximate_radius_miles,
    p.source,
    p.last_seen_at,
    p.expires_at,
    p.updated_at
  FROM public.live_map_presence p
  WHERE p.is_visible = true
    AND p.expires_at > now()
    AND p.lat IS NOT NULL
    AND p.lng IS NOT NULL
    AND p.user_id <> auth.uid()
    AND (
      exclude_user_ids IS NULL
      OR NOT (p.user_id = ANY(exclude_user_ids))
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_blocks ub
      WHERE (
        ub.blocker_user_id = auth.uid()
        AND ub.blocked_user_id = p.user_id
      ) OR (
        ub.blocker_user_id = p.user_id
        AND ub.blocked_user_id = auth.uid()
      )
    )
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(viewer_lng, viewer_lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)::geography,
      radius_miles * 1609.344
    )
  ORDER BY
    ST_Distance(
      ST_SetSRID(ST_MakePoint(viewer_lng, viewer_lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)::geography
    ) ASC,
    p.last_seen_at DESC
  LIMIT 250;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth STABLE;

REVOKE ALL ON FUNCTION public.get_live_map_presence(double precision, double precision, double precision, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_live_map_presence(double precision, double precision, double precision, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_live_map_presence(double precision, double precision, double precision, uuid[]) TO authenticated;

COMMENT ON FUNCTION public.get_live_map_presence(double precision, double precision, double precision, uuid[])
  IS 'Returns nearby active live rider presence for the authenticated viewer, excluding self and mutual blocks.';

-- =============================================================================
-- Broadcast visibility: global events and Bike Down, nearby everything else
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_nearby_broadcasts(double precision, double precision, double precision, integer, uuid[]);

CREATE FUNCTION public.get_nearby_broadcasts(
  user_lat double precision,
  user_lng double precision,
  radius_miles double precision DEFAULT 50,
  limit_count int DEFAULT 100,
  exclude_user_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  author_id uuid,
  type text,
  status text,
  title text,
  body text,
  frozen_lat double precision,
  frozen_lng double precision,
  location_name text,
  event_date timestamptz,
  event_image_url text,
  alert_type text,
  alert_photos jsonb,
  iso_subtype text,
  created_at timestamptz,
  expires_at timestamptz,
  distance_miles double precision
) AS $$
BEGIN
  IF user_lat IS NULL
    OR user_lng IS NULL
    OR radius_miles IS NULL
    OR radius_miles <= 0
  THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      b.id,
      b.author_id,
      b.type,
      b.status,
      b.title,
      b.body,
      b.frozen_lat,
      b.frozen_lng,
      b.location_name,
      b.event_date,
      b.event_image_url,
      b.alert_type,
      b.alert_photos,
      b.iso_subtype,
      b.created_at,
      b.expires_at,
      (ST_Distance(
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(b.frozen_lng, b.frozen_lat), 4326)::geography
      ) / 1609.344) AS distance_miles,
      (b.type = 'event') AS is_global_event,
      (b.type = 'bike_down' OR (b.type = 'alert' AND b.alert_type = 'bike_down')) AS is_bike_down,
      ST_DWithin(
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(b.frozen_lng, b.frozen_lat), 4326)::geography,
        radius_miles * 1609.344
      ) AS is_nearby
    FROM public.broadcasts b
    WHERE b.status = 'active'
      AND b.expires_at > now()
      AND b.frozen_lat IS NOT NULL
      AND b.frozen_lng IS NOT NULL
      AND (
        exclude_user_ids IS NULL
        OR NOT (b.author_id = ANY(exclude_user_ids))
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.user_blocks ub
        WHERE (
          ub.blocker_user_id = auth.uid()
          AND ub.blocked_user_id = b.author_id
        ) OR (
          ub.blocker_user_id = b.author_id
          AND ub.blocked_user_id = auth.uid()
        )
      )
  )
  SELECT
    c.id,
    c.author_id,
    c.type,
    c.status,
    c.title,
    c.body,
    c.frozen_lat,
    c.frozen_lng,
    c.location_name,
    c.event_date,
    c.event_image_url,
    c.alert_type,
    c.alert_photos,
    c.iso_subtype,
    c.created_at,
    c.expires_at,
    c.distance_miles
  FROM candidates c
  WHERE c.is_global_event
    OR c.is_bike_down
    OR c.is_nearby
  ORDER BY
    CASE
      WHEN c.is_bike_down THEN 0
      WHEN c.is_nearby THEN 1
      WHEN c.is_global_event THEN 2
      ELSE 3
    END ASC,
    CASE WHEN c.is_nearby THEN c.distance_miles END ASC NULLS LAST,
    c.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth STABLE;

REVOKE ALL ON FUNCTION public.get_nearby_broadcasts(double precision, double precision, double precision, integer, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_nearby_broadcasts(double precision, double precision, double precision, integer, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_nearby_broadcasts(double precision, double precision, double precision, integer, uuid[]) TO authenticated;

COMMENT ON FUNCTION public.get_nearby_broadcasts(double precision, double precision, double precision, integer, uuid[])
  IS 'Returns active broadcasts: nearby Ride Now/Need Help/Road Warning plus global Event and Bike Down signals, excluding blocked authors.';
