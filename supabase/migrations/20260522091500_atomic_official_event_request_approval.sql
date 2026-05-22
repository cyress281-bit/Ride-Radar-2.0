-- Approve an official event review request atomically.
-- This updates the related broadcasts.is_official flag and the request row
-- inside one SECURITY DEFINER function so approval cannot split across
-- separate client writes.

DROP FUNCTION IF EXISTS public.approve_official_event_request(uuid, text);

CREATE FUNCTION public.approve_official_event_request(
  request_id uuid,
  admin_note text DEFAULT NULL
)
RETURNS SETOF public.official_event_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_request public.official_event_requests%ROWTYPE;
  v_broadcast public.broadcasts%ROWTYPE;
  v_reviewed_at timestamptz := now();
  v_admin_note text := NULLIF(btrim(COALESCE(admin_note, '')), '');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  IF request_id IS NULL THEN
    RAISE EXCEPTION 'Request id is required.';
  END IF;

  SELECT *
  INTO v_request
  FROM public.official_event_requests
  WHERE id = request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Official review request not found.';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending requests can be approved.';
  END IF;

  SELECT *
  INTO v_broadcast
  FROM public.broadcasts
  WHERE id = v_request.broadcast_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Related event broadcast was not found.';
  END IF;

  IF v_broadcast.type <> 'event' THEN
    RAISE EXCEPTION 'Only event broadcasts can be marked official.';
  END IF;

  UPDATE public.broadcasts
  SET is_official = true
  WHERE id = v_broadcast.id;

  UPDATE public.official_event_requests
  SET
    status = 'approved',
    reviewed_by = v_admin_id,
    reviewed_at = v_reviewed_at,
    admin_note = v_admin_note
  WHERE id = v_request.id
  RETURNING * INTO v_request;

  RETURN NEXT v_request;
  RETURN;
END;
$function$;

REVOKE ALL ON FUNCTION public.approve_official_event_request(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_official_event_request(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_official_event_request(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.approve_official_event_request(uuid, text) IS
  'Atomically marks the related event official and approves the official event request.';
