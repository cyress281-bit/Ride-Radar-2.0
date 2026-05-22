-- ============================================================================
-- Server-side abuse cooldowns for user posts and post comments
-- Phase 2: lightweight backend enforcement for spam / rapid repeat actions.
--
-- Design:
-- - Keep frontend cooldowns as UX only.
-- - Enforce source-of-truth cooldowns in the database.
-- - Allow admins to bypass cooldowns for moderation / operational use.
-- - Keep normal posting/commenting usable while discouraging burst spam.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

CREATE OR REPLACE FUNCTION private.enforce_user_post_creation_cooldown(p_user_id uuid)
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

  IF p_user_id IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION USING
      MESSAGE = 'You can only create posts as yourself.',
      ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*)
  INTO v_recent_count
  FROM public.user_posts p
  WHERE p.user_id = p_user_id
    AND p.created_at > now() - interval '60 seconds';

  IF v_recent_count > 0 THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Please wait a moment before creating another post.',
      ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_user_post_creation_cooldown(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.enforce_user_post_creation_cooldown(uuid) FROM anon;
REVOKE ALL ON FUNCTION private.enforce_user_post_creation_cooldown(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION private.enforce_post_comment_creation_cooldown(p_author_id uuid)
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

  IF p_author_id IS NULL OR p_author_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION USING
      MESSAGE = 'You can only comment as yourself.',
      ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*)
  INTO v_recent_count
  FROM public.post_comments c
  WHERE c.author_id = p_author_id
    AND c.created_at > now() - interval '12 seconds';

  IF v_recent_count > 0 THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Please wait a moment before posting another comment.',
      ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_post_comment_creation_cooldown(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.enforce_post_comment_creation_cooldown(uuid) FROM anon;
REVOKE ALL ON FUNCTION private.enforce_post_comment_creation_cooldown(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.enforce_user_post_creation_cooldown_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM private.enforce_user_post_creation_cooldown(COALESCE(NEW.user_id, auth.uid()));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_post_comment_creation_cooldown_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM private.enforce_post_comment_creation_cooldown(COALESCE(NEW.author_id, auth.uid()));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_posts_enforce_creation_cooldown ON public.user_posts;
CREATE TRIGGER trg_user_posts_enforce_creation_cooldown
BEFORE INSERT ON public.user_posts
FOR EACH ROW
EXECUTE FUNCTION public.enforce_user_post_creation_cooldown_trigger();

DROP TRIGGER IF EXISTS trg_post_comments_enforce_creation_cooldown ON public.post_comments;
CREATE TRIGGER trg_post_comments_enforce_creation_cooldown
BEFORE INSERT ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_post_comment_creation_cooldown_trigger();
