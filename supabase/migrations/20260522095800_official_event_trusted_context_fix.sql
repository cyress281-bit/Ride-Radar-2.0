-- Fix official-event updates so trusted admin RPCs can set the official flag
-- without relying on trigger-time auth context, while still blocking direct
-- client writes to broadcasts.is_official.

CREATE OR REPLACE FUNCTION public.enforce_official_event_broadcast()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_official_context text := current_setting('ride_radar.official_event_trusted_context', true);
BEGIN
  IF NEW.is_official IS DISTINCT FROM OLD.is_official OR COALESCE(NEW.is_official, false) THEN
    IF NEW.is_official AND NEW.type <> 'event' THEN
      RAISE EXCEPTION 'Only event broadcasts can be official.';
    END IF;

    IF v_official_context IS DISTINCT FROM 'approve_official_event_request'
      AND v_official_context IS DISTINCT FROM 'set_official_event_status'
      AND v_official_context IS DISTINCT FROM 'repair_official_event_request'
    THEN
      RAISE EXCEPTION 'Only trusted official-event approval flows can change official status.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP FUNCTION IF EXISTS public.set_official_event_status(uuid, boolean);

CREATE FUNCTION public.set_official_event_status(
  broadcast_id uuid,
  p_is_official boolean
)
RETURNS SETOF public.broadcasts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_broadcast public.broadcasts%ROWTYPE;
  v_official_context text := 'set_official_event_status';
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  IF broadcast_id IS NULL THEN
    RAISE EXCEPTION 'Broadcast id is required.';
  END IF;

  SELECT *
  INTO v_broadcast
  FROM public.broadcasts
  WHERE id = broadcast_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Broadcast not found.';
  END IF;

  IF v_broadcast.type <> 'event' THEN
    RAISE EXCEPTION 'Only event broadcasts can be marked official.';
  END IF;

  PERFORM set_config('ride_radar.official_event_trusted_context', v_official_context, true);

  UPDATE public.broadcasts
  SET is_official = COALESCE(p_is_official, false)
  WHERE id = v_broadcast.id
  RETURNING * INTO v_broadcast;

  RETURN NEXT v_broadcast;
  RETURN;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_official_event_status(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_official_event_status(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_official_event_status(uuid, boolean) TO authenticated;

COMMENT ON FUNCTION public.set_official_event_status(uuid, boolean) IS
  'Admin-only RPC for changing the official flag on an event broadcast.';

DROP FUNCTION IF EXISTS public.repair_official_event_request(uuid);

CREATE FUNCTION public.repair_official_event_request(
  request_id uuid
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

  IF v_request.status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved requests can be repaired.';
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

  IF NOT COALESCE(v_broadcast.is_official, false) THEN
    PERFORM set_config('ride_radar.official_event_trusted_context', 'repair_official_event_request', true);

    UPDATE public.broadcasts
    SET is_official = true
    WHERE id = v_broadcast.id;
  END IF;

  RETURN NEXT v_request;
  RETURN;
END;
$function$;

REVOKE ALL ON FUNCTION public.repair_official_event_request(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.repair_official_event_request(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.repair_official_event_request(uuid) TO authenticated;

COMMENT ON FUNCTION public.repair_official_event_request(uuid) IS
  'Admin-only RPC to repair an approved official event request whose broadcast lost the official flag.';

CREATE OR REPLACE FUNCTION public.approve_official_event_request(
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

  PERFORM set_config('ride_radar.official_event_trusted_context', 'approve_official_event_request', true);

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
