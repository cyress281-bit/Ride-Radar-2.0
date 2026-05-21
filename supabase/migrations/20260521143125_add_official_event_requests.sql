-- Official event badge review requests
-- Phase A: DB foundation for in-app review requests.

CREATE TABLE public.official_event_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  organizer_name text NOT NULL,
  website_or_social text NULL,
  contact_info text NOT NULL,
  reason text NOT NULL,
  admin_note text NULL,
  reviewed_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT official_event_requests_status_check
    CHECK (status IN ('pending', 'approved', 'declined', 'cancelled')),
  CONSTRAINT official_event_requests_organizer_name_check
    CHECK (char_length(btrim(organizer_name)) > 0),
  CONSTRAINT official_event_requests_contact_info_check
    CHECK (char_length(btrim(contact_info)) > 0),
  CONSTRAINT official_event_requests_reason_check
    CHECK (char_length(btrim(reason)) > 0)
);

COMMENT ON TABLE public.official_event_requests IS
  'Owner-submitted requests for admin review of the Official event badge.';

CREATE UNIQUE INDEX official_event_requests_one_pending_idx
  ON public.official_event_requests (broadcast_id, requester_id)
  WHERE status = 'pending';

ALTER TABLE public.official_event_requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.official_event_requests TO authenticated;

CREATE POLICY official_event_requests_select_owner
  ON public.official_event_requests
  FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid());

CREATE POLICY official_event_requests_select_admin
  ON public.official_event_requests
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY official_event_requests_insert_owner_event
  ON public.official_event_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND admin_note IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.broadcasts AS b
      WHERE b.id = broadcast_id
        AND b.type = 'event'
        AND b.author_id = auth.uid()
    )
  );

CREATE POLICY official_event_requests_update_owner_cancel
  ON public.official_event_requests
  FOR UPDATE
  TO authenticated
  USING (
    requester_id = auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (
    requester_id = auth.uid()
    AND status = 'cancelled'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND admin_note IS NULL
  );

CREATE POLICY official_event_requests_update_admin
  ON public.official_event_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.enforce_official_event_request_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, auth
AS $$
BEGIN
  IF public.is_admin() THEN
    IF NEW.broadcast_id IS DISTINCT FROM OLD.broadcast_id
      OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
      OR NEW.organizer_name IS DISTINCT FROM OLD.organizer_name
      OR NEW.website_or_social IS DISTINCT FROM OLD.website_or_social
      OR NEW.contact_info IS DISTINCT FROM OLD.contact_info
      OR NEW.reason IS DISTINCT FROM OLD.reason
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Admins may only review official event requests.';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.requester_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only update your own official event requests.';
  END IF;

  IF OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending requests can be cancelled.';
  END IF;

  IF NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'You can only cancel your pending official event request.';
  END IF;

  IF NEW.broadcast_id IS DISTINCT FROM OLD.broadcast_id
    OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
    OR NEW.organizer_name IS DISTINCT FROM OLD.organizer_name
    OR NEW.website_or_social IS DISTINCT FROM OLD.website_or_social
    OR NEW.contact_info IS DISTINCT FROM OLD.contact_info
    OR NEW.reason IS DISTINCT FROM OLD.reason
    OR NEW.admin_note IS NOT NULL
    OR NEW.reviewed_by IS NOT NULL
    OR NEW.reviewed_at IS NOT NULL
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'You can only cancel your pending official event request.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_official_event_requests_enforce_update
  ON public.official_event_requests;

CREATE TRIGGER trg_official_event_requests_enforce_update
  BEFORE UPDATE ON public.official_event_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_official_event_request_update();

DROP TRIGGER IF EXISTS trg_official_event_requests_set_updated_at
  ON public.official_event_requests;

CREATE TRIGGER trg_official_event_requests_set_updated_at
  BEFORE UPDATE ON public.official_event_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
