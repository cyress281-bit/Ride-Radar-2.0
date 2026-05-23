-- =============================================================================
-- Notify all prior commenters on new broadcast comments
-- When a new comment is added, notify:
--   1. The broadcast owner (existing behavior)
--   2. All other distinct commenters who previously commented on this broadcast
--
-- Excludes:
--   - The new commenter themselves (no self-notifications)
--   - The owner from the commenter loop (already notified separately)
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
  v_prior_commenter_id  uuid;
BEGIN
  -- ---------------------------------------------------------------------------
  -- 1. Look up the broadcast owner
  -- ---------------------------------------------------------------------------
  SELECT author_id
  INTO   v_broadcast_author_id
  FROM   public.broadcasts
  WHERE  id = NEW.broadcast_id;

  IF v_broadcast_author_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 2. Look up the commenter's profile for personalized text
  -- ---------------------------------------------------------------------------
  SELECT display_name, username
  INTO   v_display_name, v_username
  FROM   public.user_profiles
  WHERE  user_id = NEW.author_id;

  v_actor_name := COALESCE(
    NULLIF(v_display_name, ''),
    CASE WHEN NULLIF(v_username, '') IS NOT NULL THEN '@' || v_username ELSE NULL END,
    'A rider'
  );

  -- ---------------------------------------------------------------------------
  -- 3. Notify the broadcast owner (if not self-commenting)
  -- ---------------------------------------------------------------------------
  IF NEW.author_id != v_broadcast_author_id THEN
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
  END IF;

  -- ---------------------------------------------------------------------------
  -- 4. Notify all prior distinct commenters (excluding new commenter and owner)
  -- ---------------------------------------------------------------------------
  FOR v_prior_commenter_id IN
    SELECT DISTINCT bc.author_id
    FROM   public.broadcast_comments bc
    WHERE  bc.broadcast_id = NEW.broadcast_id
      AND  bc.author_id != NEW.author_id
      AND  bc.author_id != v_broadcast_author_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data, read)
    VALUES (
      v_prior_commenter_id,
      'broadcast_comment',
      'New reply on a signal you commented on',
      v_actor_name || ' also commented on this signal.',
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
  END LOOP;

  RETURN NEW;
END;
$$;
