-- =============================================================================
-- Notify all prior commenters on new post comments
-- When a new comment is added, notify:
--   1. The post owner (existing behavior)
--   2. All other distinct commenters who previously commented on this post
--
-- Excludes:
--   - The new commenter themselves (no self-notifications)
--   - The owner from the commenter loop (already notified separately)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_owner_id      uuid;
  v_display_name       text;
  v_username           text;
  v_actor_name         text;
  v_prior_commenter_id uuid;
BEGIN
  -- ---------------------------------------------------------------------------
  -- 1. Look up the post owner
  -- ---------------------------------------------------------------------------
  SELECT user_id
  INTO   v_post_owner_id
  FROM   public.user_posts
  WHERE  id = NEW.post_id;

  IF v_post_owner_id IS NULL THEN
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
  -- 3. Notify the post owner (if not self-commenting)
  -- ---------------------------------------------------------------------------
  IF NEW.author_id != v_post_owner_id THEN
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
  END IF;

  -- ---------------------------------------------------------------------------
  -- 4. Notify all prior distinct commenters (excluding new commenter and owner)
  -- ---------------------------------------------------------------------------
  FOR v_prior_commenter_id IN
    SELECT DISTINCT pc.author_id
    FROM   public.post_comments pc
    WHERE  pc.post_id = NEW.post_id
      AND  pc.author_id != NEW.author_id
      AND  pc.author_id != v_post_owner_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data, read)
    VALUES (
      v_prior_commenter_id,
      'post_comment',
      'New reply on a post you commented on',
      v_actor_name || ' also commented on this post.',
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
  END LOOP;

  RETURN NEW;
END;
$$;
