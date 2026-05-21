-- Notify admins when an official event review request is submitted.
-- This keeps the request flow in-app and targeted only to admin users.

CREATE OR REPLACE FUNCTION public.handle_official_event_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_event_title text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(b.title, ''), 'Untitled event')
  INTO v_event_title
  FROM public.broadcasts AS b
  WHERE b.id = NEW.broadcast_id
    AND b.type = 'event';

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    read,
    is_global
  )
  SELECT
    admin_user.id,
    'official_event_review_request',
    'Official event review request',
    format('Official review requested for "%s".', v_event_title),
    jsonb_build_object(
      'official_event_request_id', NEW.id,
      'broadcast_id', NEW.broadcast_id,
      'requester_id', NEW.requester_id,
      'event_title', v_event_title,
      'created_at', NEW.created_at
    ),
    false,
    false
  FROM public.users AS admin_user
  WHERE admin_user.role = 'admin';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_official_event_request_notification
  ON public.official_event_requests;

CREATE TRIGGER trg_official_event_request_notification
  AFTER INSERT ON public.official_event_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_official_event_request_notification();
