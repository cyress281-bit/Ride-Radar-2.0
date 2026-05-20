-- Fix: remove stale iso_subtype reference from get_nearby_broadcasts.
-- The broadcasts table no longer has this column (dropped in a prior migration),
-- causing ERROR 42703 on every RPC call and making all broadcasts invisible.
-- DROP required because PostgreSQL cannot change the RETURNS TABLE signature
-- with CREATE OR REPLACE when OUT columns differ.

DROP FUNCTION IF EXISTS public.get_nearby_broadcasts(
  double precision, double precision, double precision, integer, uuid[]
);

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
  created_at timestamptz,
  expires_at timestamptz,
  distance_miles double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
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
      b.id, b.author_id, b.type, b.status, b.title, b.body,
      b.frozen_lat, b.frozen_lng, b.location_name, b.event_date,
      b.event_image_url, b.alert_type, b.alert_photos,
      b.created_at, b.expires_at,
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
      AND (exclude_user_ids IS NULL OR NOT (b.author_id = ANY(exclude_user_ids)))
      AND NOT EXISTS (
        SELECT 1 FROM public.user_blocks ub
        WHERE (ub.blocker_user_id = auth.uid() AND ub.blocked_user_id = b.author_id)
           OR (ub.blocker_user_id = b.author_id AND ub.blocked_user_id = auth.uid())
      )
  )
  SELECT c.id, c.author_id, c.type, c.status, c.title, c.body,
         c.frozen_lat, c.frozen_lng, c.location_name, c.event_date,
         c.event_image_url, c.alert_type, c.alert_photos,
         c.created_at, c.expires_at, c.distance_miles
  FROM candidates c
  WHERE c.is_global_event OR c.is_bike_down OR c.is_nearby
  ORDER BY
    CASE WHEN c.is_bike_down THEN 0 WHEN c.is_nearby THEN 1 WHEN c.is_global_event THEN 2 ELSE 3 END ASC,
    CASE WHEN c.is_nearby THEN c.distance_miles END ASC NULLS LAST,
    c.created_at DESC
  LIMIT limit_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_nearby_broadcasts(double precision, double precision, double precision, integer, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_nearby_broadcasts(double precision, double precision, double precision, integer, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_nearby_broadcasts(double precision, double precision, double precision, integer, uuid[]) TO authenticated;
