-- =============================================================================
-- Personalize broadcast_comment notification body with actor display name.
-- Replaces LEFT(NEW.body, 100) with "[Name] commented on your signal."
-- Adds actor_id, actor_display_name, actor_username to data JSONB.
-- All existing data keys and trigger preserved unchanged.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_broadcast_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_broadcast_author_id uuid;
  v_display_name        text;
  v_username            text;
  v_actor_name          text;
BEGIN
  SELECT author_id
  INTO   v_broadcast_author_id
  FROM   public.broadcasts
  WHERE  id = NEW.broadcast_id;

  IF v_broadcast_author_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.author_id = v_broadcast_author_id THEN
    RETURN NEW;
  END IF;

  SELECT display_name, username
  INTO   v_display_name, v_username
  FROM   public.user_profiles
  WHERE  user_id = NEW.author_id;

  v_actor_name := COALESCE(
    NULLIF(v_display_name, ''),
    CASE WHEN NULLIF(v_username, '') IS NOT NULL THEN '@' || v_username ELSE NULL END,
    'A rider'
  );

  INSERT INTO public.notifications (user_id, type, title, body, data, read)
  VALUES (
    v_broadcast_author_id,
    'broadcast_comment',
    'New comment on your signal',
    v_actor_name || ' commented on your signal.',
    jsonb_build_object(
      'broadcast_id',        NEW.broadcast_id,
      'comment_id',          NEW.id,
      'commenter_id',        NEW.author_id,
      'broadcast_owner_id',  v_broadcast_author_id,
      'actor_id',            NEW.author_id,
      'actor_display_name',  v_display_name,
      'actor_username',      v_username,
      'related_entity_type', 'broadcast',
      'related_entity_id',   NEW.broadcast_id
    ),
    false
  );

  RETURN NEW;
END;
$$;
