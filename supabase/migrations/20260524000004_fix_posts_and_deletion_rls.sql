-- Fix RLS policies on user_posts, user_post_photos, and account_deletion_requests.
--
-- user_posts + user_post_photos: drop older duplicate policies that lack is_admin().
-- The correct user_posts_* and user_post_photos_* policies are kept as-is.
-- No UPDATE policies added — posts and photos are immutable after creation.
--
-- account_deletion_requests: RLS was enabled with zero policies (total lockout).
-- Add INSERT (own row) and SELECT (own row or admin).

-- Step 1: Drop stale duplicate policies on user_posts
DROP POLICY IF EXISTS delete_own_posts ON public.user_posts;
DROP POLICY IF EXISTS insert_own_posts ON public.user_posts;
DROP POLICY IF EXISTS read_user_posts ON public.user_posts;

-- Step 2: Drop stale duplicate policies on user_post_photos
DROP POLICY IF EXISTS delete_own_post_photos ON public.user_post_photos;
DROP POLICY IF EXISTS insert_own_post_photos ON public.user_post_photos;
DROP POLICY IF EXISTS read_user_post_photos ON public.user_post_photos;

-- Step 3: Add INSERT policy on account_deletion_requests
-- Users can only insert a row for themselves.
CREATE POLICY account_deletion_requests_insert ON public.account_deletion_requests
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Step 4: Add SELECT policy on account_deletion_requests
-- Users can read their own request; admins can read all.
CREATE POLICY account_deletion_requests_select ON public.account_deletion_requests
FOR SELECT
USING (user_id = auth.uid() OR is_admin());
