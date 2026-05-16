-- Fix: notifications table does not have related_entity_type / related_entity_id columns.
-- Update trigger to insert only into real columns; routing fields go into data jsonb only.

CREATE OR REPLACE FUNCTION public.notify_broadcast_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_broadcast_author_id uuid;
BEGIN
  SELECT author_id
  INTO v_broadcast_author_id
  FROM public.broadcasts
  WHERE id = NEW.broadcast_id;

  IF v_broadcast_author_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.author_id = v_broadcast_author_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    read
  ) VALUES (
    v_broadcast_author_id,
    'broadcast_comment',
    'New comment on your signal',
    LEFT(NEW.body, 100),
    jsonb_build_object(
      'broadcast_id',        NEW.broadcast_id,
      'comment_id',          NEW.id,
      'commenter_id',        NEW.author_id,
      'broadcast_owner_id',  v_broadcast_author_id,
      'related_entity_type', 'broadcast',
      'related_entity_id',   NEW.broadcast_id
    ),
    false
  );

  RETURN NEW;
END;
$$;
