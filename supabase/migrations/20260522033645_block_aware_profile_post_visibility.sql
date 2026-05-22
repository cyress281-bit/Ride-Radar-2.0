-- Block-aware profile, post, and post-comment visibility.
-- Makes user blocks apply consistently across public profile and post surfaces.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

CREATE OR REPLACE FUNCTION private.can_view_user_profile(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT
    public.is_admin()
    OR target_user_id = auth.uid()
    OR (
      NOT private.is_mutually_blocked(target_user_id)
      AND EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.user_id = target_user_id
          AND up.is_public = true
      )
    );
$$;

REVOKE ALL ON FUNCTION private.can_view_user_profile(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_view_user_profile(uuid) FROM anon;
REVOKE ALL ON FUNCTION private.can_view_user_profile(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION private.can_view_user_post(post_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_posts up
    WHERE up.id = post_uuid
      AND (
        public.is_admin()
        OR up.user_id = auth.uid()
        OR private.can_view_user_profile(up.user_id)
      )
  );
$$;

REVOKE ALL ON FUNCTION private.can_view_user_post(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_view_user_post(uuid) FROM anon;
REVOKE ALL ON FUNCTION private.can_view_user_post(uuid) FROM authenticated;

DROP POLICY IF EXISTS admin_read_profiles ON public.user_profiles;
CREATE POLICY admin_read_profiles ON public.user_profiles
  FOR SELECT
  USING (private.can_view_user_profile(user_id));

DROP POLICY IF EXISTS user_posts_select ON public.user_posts;
CREATE POLICY user_posts_select ON public.user_posts
  FOR SELECT
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR private.can_view_user_profile(user_id)
  );

DROP POLICY IF EXISTS user_post_photos_select ON public.user_post_photos;
CREATE POLICY user_post_photos_select ON public.user_post_photos
  FOR SELECT
  USING (private.can_view_user_post(user_post_photos.post_id));

DROP POLICY IF EXISTS post_comments_select ON public.post_comments;
CREATE POLICY post_comments_select ON public.post_comments
  FOR SELECT
  USING (private.can_view_user_post(post_comments.post_id));

DROP POLICY IF EXISTS post_comments_insert ON public.post_comments;
CREATE POLICY post_comments_insert ON public.post_comments
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND private.can_view_user_post(post_comments.post_id)
  );
