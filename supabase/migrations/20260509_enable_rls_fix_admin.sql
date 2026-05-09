-- =============================================================================
-- CRITICAL SECURITY FIX: Enable RLS + Fix is_admin() search_path
-- =============================================================================
-- Date: 2026-05-09
-- Issue 1: RLS was not enabled on core tables — policies existed but were inactive.
-- Issue 2: is_admin() lacked SET search_path, making it vulnerable to search_path hijacking.
-- =============================================================================

-- =============================================================================
-- FIX 1: Secure is_admin() function
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, auth;

COMMENT ON FUNCTION public.is_admin() IS
  'Returns true if the current authenticated user has role = admin. '
  'Uses SECURITY DEFINER with explicit search_path to prevent hijacking.';

-- =============================================================================
-- FIX 2: Enable RLS on all application tables
-- =============================================================================
DO $$
BEGIN
  -- Core tables with existing policies
  ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.broadcasts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.reports ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.user_blocks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

  -- Tables without existing policies
  ALTER TABLE IF EXISTS public.friendships ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.connection_requests ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.event_rsvps ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.user_settings ENABLE ROW LEVEL SECURITY;
END $$;

-- =============================================================================
-- FIX 3: Add missing policies for messages
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'Users can read conversation messages'
  ) THEN
    CREATE POLICY "Users can read conversation messages"
      ON public.messages FOR SELECT TO authenticated
      USING (
        public.is_admin()
        OR from_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.conversations
          WHERE id = messages.conversation_id
            AND auth.uid() = ANY(participant_ids)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'Users can send messages'
  ) THEN
    CREATE POLICY "Users can send messages"
      ON public.messages FOR INSERT TO authenticated
      WITH CHECK (
        from_user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.conversations
          WHERE id = messages.conversation_id
            AND auth.uid() = ANY(participant_ids)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'Users can update own messages'
  ) THEN
    CREATE POLICY "Users can update own messages"
      ON public.messages FOR UPDATE TO authenticated
      USING (public.is_admin() OR from_user_id = auth.uid())
      WITH CHECK (from_user_id = auth.uid());
  END IF;
END $$;

-- =============================================================================
-- FIX 4: Add policies for friendships
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'friendships' AND policyname = 'Users can view own friendships'
  ) THEN
    CREATE POLICY "Users can view own friendships"
      ON public.friendships FOR SELECT TO authenticated
      USING (
        public.is_admin()
        OR user_a_id = auth.uid()
        OR user_b_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'friendships' AND policyname = 'Users can create friendships'
  ) THEN
    CREATE POLICY "Users can create friendships"
      ON public.friendships FOR INSERT TO authenticated
      WITH CHECK (user_a_id = auth.uid() OR user_b_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'friendships' AND policyname = 'Users can update own friendships'
  ) THEN
    CREATE POLICY "Users can update own friendships"
      ON public.friendships FOR UPDATE TO authenticated
      USING (
        public.is_admin()
        OR user_a_id = auth.uid()
        OR user_b_id = auth.uid()
      )
      WITH CHECK (
        user_a_id = auth.uid()
        OR user_b_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'friendships' AND policyname = 'Users can delete own friendships'
  ) THEN
    CREATE POLICY "Users can delete own friendships"
      ON public.friendships FOR DELETE TO authenticated
      USING (
        public.is_admin()
        OR user_a_id = auth.uid()
        OR user_b_id = auth.uid()
      );
  END IF;
END $$;

-- =============================================================================
-- FIX 5: Add policies for connection_requests
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'connection_requests' AND policyname = 'Users can view own connection requests'
  ) THEN
    CREATE POLICY "Users can view own connection requests"
      ON public.connection_requests FOR SELECT TO authenticated
      USING (
        public.is_admin()
        OR from_user_id = auth.uid()
        OR to_user_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'connection_requests' AND policyname = 'Users can send connection requests'
  ) THEN
    CREATE POLICY "Users can send connection requests"
      ON public.connection_requests FOR INSERT TO authenticated
      WITH CHECK (from_user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'connection_requests' AND policyname = 'Users can update own connection requests'
  ) THEN
    CREATE POLICY "Users can update own connection requests"
      ON public.connection_requests FOR UPDATE TO authenticated
      USING (
        public.is_admin()
        OR from_user_id = auth.uid()
        OR to_user_id = auth.uid()
      )
      WITH CHECK (
        from_user_id = auth.uid()
        OR to_user_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'connection_requests' AND policyname = 'Users can delete own connection requests'
  ) THEN
    CREATE POLICY "Users can delete own connection requests"
      ON public.connection_requests FOR DELETE TO authenticated
      USING (
        public.is_admin()
        OR from_user_id = auth.uid()
        OR to_user_id = auth.uid()
      );
  END IF;
END $$;

-- =============================================================================
-- FIX 6: Add policies for event_rsvps
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'event_rsvps' AND policyname = 'Users can view event rsvps'
  ) THEN
    CREATE POLICY "Users can view event rsvps"
      ON public.event_rsvps FOR SELECT TO authenticated
      USING (
        public.is_admin()
        OR user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.broadcasts
          WHERE id = event_rsvps.broadcast_id
            AND author_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'event_rsvps' AND policyname = 'Users can rsvp to events'
  ) THEN
    CREATE POLICY "Users can rsvp to events"
      ON public.event_rsvps FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'event_rsvps' AND policyname = 'Users can update own rsvps'
  ) THEN
    CREATE POLICY "Users can update own rsvps"
      ON public.event_rsvps FOR UPDATE TO authenticated
      USING (public.is_admin() OR user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'event_rsvps' AND policyname = 'Users can delete own rsvps'
  ) THEN
    CREATE POLICY "Users can delete own rsvps"
      ON public.event_rsvps FOR DELETE TO authenticated
      USING (public.is_admin() OR user_id = auth.uid());
  END IF;
END $$;

-- =============================================================================
-- FIX 7: Add policies for user_settings
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'Users can view own settings'
  ) THEN
    CREATE POLICY "Users can view own settings"
      ON public.user_settings FOR SELECT TO authenticated
      USING (public.is_admin() OR user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'Users can create own settings'
  ) THEN
    CREATE POLICY "Users can create own settings"
      ON public.user_settings FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'Users can update own settings'
  ) THEN
    CREATE POLICY "Users can update own settings"
      ON public.user_settings FOR UPDATE TO authenticated
      USING (public.is_admin() OR user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'Users can delete own settings'
  ) THEN
    CREATE POLICY "Users can delete own settings"
      ON public.user_settings FOR DELETE TO authenticated
      USING (public.is_admin() OR user_id = auth.uid());
  END IF;
END $$;

-- =============================================================================
-- FIX 8: Grant table permissions to authenticated role
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_rsvps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
