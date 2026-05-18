-- Allow authenticated users to delete their own notifications.
-- Previously only SELECT and UPDATE policies existed; DELETE was blocked by RLS,
-- causing the swipe-delete to silently no-op and reappear on refetch.
CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());
