-- ============================================================================
-- Server-side abuse cooldowns for broadcasts and reports
-- Phase 1: lightweight backend enforcement for spam / rapid repeat actions.
--
-- Design:
-- - Keep frontend cooldowns as UX only.
-- - Enforce source-of-truth cooldowns in the database.
-- - Allow admins to bypass cooldowns for moderation / operational use.
-- - Keep Bike Down usable while still discouraging burst spam.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

CREATE OR REPLACE FUNCTION private.enforce_broadcast_creation_cooldown(
  p_author_id uuid,
  p_is_bike_down boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public, auth
AS $$
DECLARE
  v_cooldown interval;
  v_recent_count integer;
BEGIN
  IF public.is_admin() THEN
    RETURN;
  END IF;

  IF p_author_id IS NULL OR p_author_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION USING
      MESSAGE = 'You can only create signals as yourself.',
      ERRCODE = 'P0001';
  END IF;

  v_cooldown := CASE
    WHEN p_is_bike_down THEN interval '20 seconds'
    ELSE interval '10 seconds'
  END;

  SELECT COUNT(*)
  INTO v_recent_count
  FROM public.broadcasts b
  WHERE b.author_id = p_author_id
    AND b.created_at > now() - v_cooldown;

  IF v_recent_count > 0 THEN
    RAISE EXCEPTION USING
      MESSAGE = CASE
        WHEN p_is_bike_down THEN 'Please wait a moment before sending another Bike Down alert.'
        ELSE 'Please wait a moment before creating another signal.'
      END,
      ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_broadcast_creation_cooldown(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.enforce_broadcast_creation_cooldown(uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION private.enforce_broadcast_creation_cooldown(uuid, boolean) FROM authenticated;

CREATE OR REPLACE FUNCTION private.enforce_report_creation_cooldown(p_reporter_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public, auth
AS $$
DECLARE
  v_recent_count integer;
BEGIN
  IF public.is_admin() THEN
    RETURN;
  END IF;

  IF p_reporter_id IS NULL OR p_reporter_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION USING
      MESSAGE = 'You can only submit reports as yourself.',
      ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*)
  INTO v_recent_count
  FROM public.reports r
  WHERE r.reporter_user_id = p_reporter_id
    AND r.created_at > now() - interval '30 seconds';

  IF v_recent_count > 0 THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Please wait a moment before submitting another report.',
      ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_report_creation_cooldown(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.enforce_report_creation_cooldown(uuid) FROM anon;
REVOKE ALL ON FUNCTION private.enforce_report_creation_cooldown(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.enforce_broadcast_creation_cooldown_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM private.enforce_broadcast_creation_cooldown(
    COALESCE(NEW.author_id, auth.uid()),
    COALESCE(NEW.alert_type, '') = 'bike_down'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_report_creation_cooldown_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM private.enforce_report_creation_cooldown(COALESCE(NEW.reporter_user_id, auth.uid()));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcasts_enforce_creation_cooldown ON public.broadcasts;
CREATE TRIGGER trg_broadcasts_enforce_creation_cooldown
BEFORE INSERT ON public.broadcasts
FOR EACH ROW
EXECUTE FUNCTION public.enforce_broadcast_creation_cooldown_trigger();

DROP TRIGGER IF EXISTS trg_reports_enforce_creation_cooldown ON public.reports;
CREATE TRIGGER trg_reports_enforce_creation_cooldown
BEFORE INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.enforce_report_creation_cooldown_trigger();
