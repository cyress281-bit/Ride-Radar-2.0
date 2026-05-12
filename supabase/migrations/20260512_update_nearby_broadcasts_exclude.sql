-- =============================================================================
-- Update get_nearby_broadcasts to support excluding blocked users
-- =============================================================================

CREATE OR REPLACE FUNCTION get_nearby_broadcasts(
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
) AS $$
BEGIN
  RETURN QUERY
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
    b.created_at,
    b.expires_at,
    (ST_Distance(
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(b.frozen_lng, b.frozen_lat), 4326)::geography
    ) / 1609.344) AS distance_miles
  FROM broadcasts b
  WHERE b.status = 'active'
    AND b.expires_at > now()
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(b.frozen_lng, b.frozen_lat), 4326)::geography,
      radius_miles * 1609.344
    )
    AND (exclude_user_ids IS NULL OR NOT (b.author_id = ANY(exclude_user_ids)))
  ORDER BY distance_miles ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth STABLE;

COMMENT ON FUNCTION get_nearby_broadcasts IS 'Returns active broadcasts within radius_miles of (user_lat, user_lng), optionally excluding blocked user IDs.';
