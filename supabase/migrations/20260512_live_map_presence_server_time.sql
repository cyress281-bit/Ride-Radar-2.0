-- Fix client clock skew in live map presence queries.
-- Replaces client-side .gt('expires_at', new Date().toISOString()) with server-side now().

CREATE OR REPLACE FUNCTION get_live_map_presence()
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
  FROM live_map_presence p
  WHERE p.is_visible = true
    AND p.expires_at > now()
  ORDER BY p.last_seen_at DESC
  LIMIT 250;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_live_map_presence() TO authenticated;
