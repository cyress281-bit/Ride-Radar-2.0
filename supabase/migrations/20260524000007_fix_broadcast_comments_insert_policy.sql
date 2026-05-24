-- Fix broadcast_comments INSERT policy
-- Replace overly restrictive private.can_view_active_broadcast() check
-- with simpler, explicit conditions matching post_comments pattern

DROP POLICY IF EXISTS "Authenticated users can post broadcast comments" ON public.broadcast_comments;

CREATE POLICY "Authenticated users can post broadcast comments"
ON public.broadcast_comments
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.broadcasts b
    WHERE b.id = broadcast_comments.broadcast_id
      AND b.status = 'active'
      AND (b.expires_at IS NULL OR b.expires_at > now())
      AND NOT EXISTS (
        SELECT 1 FROM public.user_blocks ub
        WHERE (ub.blocker_user_id = auth.uid() AND ub.blocked_user_id = b.author_id)
           OR (ub.blocker_user_id = b.author_id AND ub.blocked_user_id = auth.uid())
      )
  )
);
