-- =============================================================================
-- Post comment notification trigger
-- Fires: AFTER INSERT ON post_comments
-- Recipient: post owner (user_posts.user_id)
-- Excludes: self-comments (author_id = post owner)
-- Data keys: post_id, post_owner_id, comment_id, commenter_id, actor_id,
--            actor_display_name, actor_username
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_owner_id  uuid;
  v_display_name   text;
  v_username       text;
  v_actor_name     text;
BEGIN
  SELECT user_id
  INTO   v_post_owner_id
  FROM   public.user_posts
  WHERE  id = NEW.post_id;

  IF v_post_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.author_id = v_post_owner_id THEN
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
    v_post_owner_id,
    'post_comment',
    'New comment on your post',
    v_actor_name || ' commented on your post.',
    jsonb_build_object(
      'post_id',            NEW.post_id,
      'post_owner_id',      v_post_owner_id,
      'comment_id',         NEW.id,
      'commenter_id',       NEW.author_id,
      'actor_id',           NEW.author_id,
      'actor_display_name', v_display_name,
      'actor_username',     v_username
    ),
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_comment ON public.post_comments;

CREATE TRIGGER trg_notify_post_comment
  AFTER INSERT
  ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_comment();
