-- Admin moderation + request-cancel DELETE policy gaps (additive, idempotent).
-- Discovered 2026-05-31: admin "remove content" silently no-ops on other users'
-- broadcasts/messages because the only DELETE policies are author/sender-only
-- (no is_admin clause), and connection_requests had NO delete policy at all so
-- cancelling a sent request did nothing server-side. These are PERMISSIVE adds —
-- they only widen who may delete, never restrict existing access.
--
-- Applied to live (iygtbcserdmvhhjicyyp) via Supabase MCP on 2026-05-31 and
-- verified (existing author/sender policies preserved, no new advisor). This
-- file is for repository record-keeping; live application already done.

-- 1. Admins can delete any broadcast (moderation). Authors keep their own via the
--    existing "Users can delete own broadcasts" policy (permissive policies OR).
DROP POLICY IF EXISTS admin_delete_broadcasts ON public.broadcasts;
CREATE POLICY admin_delete_broadcasts ON public.broadcasts
  FOR DELETE TO public
  USING (is_admin());

-- 2. Admins can delete any message (moderation). Senders keep their own.
DROP POLICY IF EXISTS admin_delete_messages ON public.messages;
CREATE POLICY admin_delete_messages ON public.messages
  FOR DELETE TO authenticated
  USING (is_admin());

-- 3. Senders can cancel (delete) their own connection request. There was no
--    DELETE policy on connection_requests, so cancelConnectionRequest no-op'd.
DROP POLICY IF EXISTS senders_can_cancel_connection_requests ON public.connection_requests;
CREATE POLICY senders_can_cancel_connection_requests ON public.connection_requests
  FOR DELETE TO public
  USING (auth.uid() = from_user_id);
