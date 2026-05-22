-- Keep the broadcast detail RPC compatible with Supabase/PostgREST singular
-- row handling. The frontend calls `.maybeSingle()`, so the RPC should expose
-- a zero-or-one row set like the author broadcast RPC, not a scalar composite.

DROP FUNCTION IF EXISTS public.get_visible_broadcast_by_id(uuid);

CREATE FUNCTION public.get_visible_broadcast_by_id(broadcast_id uuid)
RETURNS SETOF public.broadcasts
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT b.*
  FROM public.broadcasts b
  WHERE b.id = broadcast_id
    AND private.can_view_active_broadcast(b.id)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_visible_broadcast_by_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_visible_broadcast_by_id(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_visible_broadcast_by_id(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_visible_broadcast_by_id(uuid)
  IS 'Returns zero or one broadcast rows if visible to the authenticated viewer under owner/admin or active-unblocked rules.';
