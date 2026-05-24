-- Fix post_comments RLS:
-- 1. Drop 3 stale/duplicate policies
-- 2. Drop + recreate read_post_comments and insert_post_comments with block enforcement

-- Step 1: Drop stale policies
DROP POLICY IF EXISTS post_comments_select ON public.post_comments;
DROP POLICY IF EXISTS post_comments_insert ON public.post_comments;
DROP POLICY IF EXISTS delete_post_comments ON public.post_comments;

-- Step 2: Drop policies being replaced
DROP POLICY IF EXISTS read_post_comments ON public.post_comments;
DROP POLICY IF EXISTS insert_post_comments ON public.post_comments;

-- Step 3: Recreate SELECT policy
-- Comment is visible only if the parent post is on a public profile (or own),
-- AND the comment's author is not in a block relationship with the viewer.
CREATE POLICY read_post_comments ON public.post_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM user_posts p
    JOIN user_profiles up ON up.user_id = p.user_id
    WHERE p.id = post_comments.post_id
      AND (up.is_public = true OR up.user_id = auth.uid())
  )
  AND NOT EXISTS (
    SELECT 1
    FROM user_blocks ub
    WHERE (ub.blocker_user_id = auth.uid() AND ub.blocked_user_id = post_comments.author_id)
       OR (ub.blocker_user_id = post_comments.author_id AND ub.blocked_user_id = auth.uid())
  )
);

-- Step 4: Recreate INSERT policy
-- Commenter must be auth.uid(), the post must be visible (public profile or own post),
-- and no block relationship between the commenter and the post author.
CREATE POLICY insert_post_comments ON public.post_comments
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM user_posts p
    JOIN user_profiles up ON up.user_id = p.user_id
    WHERE p.id = post_comments.post_id
      AND (up.is_public = true OR up.user_id = auth.uid())
      AND NOT EXISTS (
        SELECT 1
        FROM user_blocks ub
        WHERE (ub.blocker_user_id = auth.uid() AND ub.blocked_user_id = p.user_id)
           OR (ub.blocker_user_id = p.user_id AND ub.blocked_user_id = auth.uid())
      )
  )
);
