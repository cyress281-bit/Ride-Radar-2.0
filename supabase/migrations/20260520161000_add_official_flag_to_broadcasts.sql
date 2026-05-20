-- Official events v1
-- Adds an admin-only flag for trusted/promoted event broadcasts.

ALTER TABLE public.broadcasts
  ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'broadcasts_is_official_event_check'
      AND conrelid = 'public.broadcasts'::regclass
  ) THEN
    ALTER TABLE public.broadcasts
      ADD CONSTRAINT broadcasts_is_official_event_check
      CHECK (NOT is_official OR type = 'event');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_official_event_broadcast()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF COALESCE(NEW.is_official, false) THEN
    IF NEW.type <> 'event' THEN
      RAISE EXCEPTION 'Only event broadcasts can be official.';
    END IF;

    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only admins can mark event broadcasts official.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcasts_enforce_official_event ON public.broadcasts;

CREATE TRIGGER trg_broadcasts_enforce_official_event
BEFORE INSERT OR UPDATE OF is_official, type
ON public.broadcasts
FOR EACH ROW
EXECUTE FUNCTION public.enforce_official_event_broadcast();

COMMENT ON COLUMN public.broadcasts.is_official IS
  'Marks an event broadcast as Ride Radar official.';
