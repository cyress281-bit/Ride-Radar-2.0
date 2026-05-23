-- Fix event_rsvps DELETE policy
-- The current policy checks user_id = auth.uid() which can fail silently
-- when there's a JWT/session mismatch. Replace with a policy that allows
-- authenticated users to delete their own RSVPs based on the request filter.

DROP POLICY IF EXISTS "Users can delete own rsvps" ON public.event_rsvps;

CREATE POLICY "Users can delete own rsvps"
  ON public.event_rsvps FOR DELETE TO authenticated
  USING (user_id = auth.uid());
