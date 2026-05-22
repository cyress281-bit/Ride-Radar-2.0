-- Fix the official-event trigger so normal event inserts with is_official = false/null
-- are allowed, while unauthorized attempts to set or change the official flag remain blocked.

CREATE OR REPLACE FUNCTION public.enforce_official_event_broadcast()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_official_context text := current_setting('ride_radar.official_event_trusted_context', true);
  v_trusted_context boolean := v_official_context IN (
    'approve_official_event_request',
    'set_official_event_status',
    'repair_official_event_request'
  );
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Allow normal event creation as long as the row is not being created as official.
    IF COALESCE(NEW.is_official, false) THEN
      IF NEW.type <> 'event' THEN
        RAISE EXCEPTION 'Only event broadcasts can be official.';
      END IF;

      IF NOT v_trusted_context THEN
        RAISE EXCEPTION 'Only trusted official-event approval flows can change official status.';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Only block actual official-flag changes; normal edits must pass through.
    IF NEW.is_official IS DISTINCT FROM OLD.is_official THEN
      IF COALESCE(NEW.is_official, false) AND NEW.type <> 'event' THEN
        RAISE EXCEPTION 'Only event broadcasts can be official.';
      END IF;

      IF NOT v_trusted_context THEN
        RAISE EXCEPTION 'Only trusted official-event approval flows can change official status.';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.enforce_official_event_broadcast() IS
  'Restricts official-status changes to trusted admin approval flows while allowing normal event inserts and non-official edits.';
