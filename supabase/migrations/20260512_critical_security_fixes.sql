-- =============================================================================
-- CRITICAL SECURITY FIXES — 2026-05-12
-- =============================================================================
-- 1. Add missing INSERT/DELETE RLS policies for core tables.
-- 2. Lock down custom RPCs: revoke from PUBLIC, grant to authenticated only.
-- 3. Create conversation_notifications table with RLS policies.
-- =============================================================================

-- =============================================================================
-- FIX 1: Missing INSERT policies for core tables
-- =============================================================================

-- Users: allow authenticated users to insert their own row (e.g., post-signup hook)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can insert own row'
  ) THEN
    CREATE POLICY "Users can insert own row"
      ON public.users FOR INSERT TO authenticated
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- User profiles: allow users to create their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can create own profile'
  ) THEN
    CREATE POLICY "Users can create own profile"
      ON public.user_profiles FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Broadcasts: allow users to create broadcasts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'broadcasts' AND policyname = 'Users can create broadcasts'
  ) THEN
    CREATE POLICY "Users can create broadcasts"
      ON public.broadcasts FOR INSERT TO authenticated
      WITH CHECK (author_id = auth.uid());
  END IF;
END $$;

-- Conversations: allow users to create conversations they participate in
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'Users can create conversations'
  ) THEN
    CREATE POLICY "Users can create conversations"
      ON public.conversations FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = ANY(participant_ids));
  END IF;
END $$;

-- Reports: allow users to submit reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports' AND policyname = 'Users can submit reports'
  ) THEN
    CREATE POLICY "Users can submit reports"
      ON public.reports FOR INSERT TO authenticated
      WITH CHECK (reporter_user_id = auth.uid());
  END IF;
END $$;

-- User blocks: allow users to block others
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_blocks' AND policyname = 'Users can create blocks'
  ) THEN
    CREATE POLICY "Users can create blocks"
      ON public.user_blocks FOR INSERT TO authenticated
      WITH CHECK (blocker_user_id = auth.uid());
  END IF;
END $$;

-- Account deletion requests: allow users to request deletion
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'account_deletion_requests' AND policyname = 'Users can request deletion'
  ) THEN
    CREATE POLICY "Users can request deletion"
      ON public.account_deletion_requests FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Notifications: allow users to insert their own notifications (system-generated)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can insert own notifications'
  ) THEN
    CREATE POLICY "Users can insert own notifications"
      ON public.notifications FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Live map presence: allow users to insert their own presence
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'live_map_presence' AND policyname = 'Users can insert own presence'
  ) THEN
    CREATE POLICY "Users can insert own presence"
      ON public.live_map_presence FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- =============================================================================
-- FIX 1b: Missing DELETE policies for tables that need them
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can delete own account'
  ) THEN
    CREATE POLICY "Users can delete own account"
      ON public.users FOR DELETE TO authenticated
      USING (id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can delete own profile'
  ) THEN
    CREATE POLICY "Users can delete own profile"
      ON public.user_profiles FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'Users can delete own conversations'
  ) THEN
    CREATE POLICY "Users can delete own conversations"
      ON public.conversations FOR DELETE TO authenticated
      USING (auth.uid() = ANY(participant_ids));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports' AND policyname = 'Users can delete own reports'
  ) THEN
    CREATE POLICY "Users can delete own reports"
      ON public.reports FOR DELETE TO authenticated
      USING (reporter_user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'live_map_presence' AND policyname = 'Users can delete own presence'
  ) THEN
    CREATE POLICY "Users can delete own presence"
      ON public.live_map_presence FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- =============================================================================
-- FIX 2: Lock down custom RPCs — revoke from PUBLIC, grant to authenticated
-- =============================================================================

REVOKE ALL ON FUNCTION public.get_nearby_broadcasts(double precision, double precision, double precision, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_nearby_broadcasts(double precision, double precision, double precision, int) TO authenticated;

REVOKE ALL ON FUNCTION public.get_public_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profiles() TO authenticated;

REVOKE ALL ON FUNCTION public.get_or_create_conversation(uuid[], text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid[], text, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;

-- =============================================================================
-- FIX 3: Create conversation_notifications table with RLS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.conversation_notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

COMMENT ON TABLE public.conversation_notifications IS 'Per-user read receipts for conversations.';

CREATE INDEX IF NOT EXISTS idx_conversation_notifications_user_id ON public.conversation_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_notifications_conversation_id ON public.conversation_notifications(conversation_id);

-- Enable RLS
ALTER TABLE public.conversation_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own read receipts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversation_notifications' AND policyname = 'Users can view own read receipts'
  ) THEN
    CREATE POLICY "Users can view own read receipts"
      ON public.conversation_notifications FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Users can upsert their own read receipts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversation_notifications' AND policyname = 'Users can upsert own read receipts'
  ) THEN
    CREATE POLICY "Users can upsert own read receipts"
      ON public.conversation_notifications FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_notifications TO authenticated;
