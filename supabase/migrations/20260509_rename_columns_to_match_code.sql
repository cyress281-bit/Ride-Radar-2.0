-- =============================================================================
-- SCHEMA ALIGNMENT: Rename DB columns to match frontend code expectations
-- =============================================================================
-- Date: 2026-05-09
-- Context: The live DB was created with Base44 legacy column names (created_date,
--   sender_id, reporter_profile_id, blocker_profile_id, etc.). The frontend code
--   and newer migrations assume Supabase-native snake_case names (created_at,
--   from_user_id, reporter_user_id, blocker_user_id, etc.).
-- Safety: All affected tables (reports, user_blocks, messages, broadcasts,
--   connection_requests, conversations, event_rsvps, notifications) are EMPTY.
--   users and user_profiles each have 1 row; column rename is metadata-only
--   and safe.
-- =============================================================================

-- =============================================================================
-- STEP 1: Drop policies that reference columns about to be renamed
-- (PostgreSQL policy expressions are text and don't auto-update on RENAME COLUMN)
-- =============================================================================

-- Messages policies reference sender_id
DROP POLICY IF EXISTS "Users send messages" ON public.messages;
DROP POLICY IF EXISTS "Users view their messages" ON public.messages;

-- User blocks policies reference blocker_profile_id / blocked_profile_id
DROP POLICY IF EXISTS "Users create blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Users delete blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Users view own blocks" ON public.user_blocks;

-- =============================================================================
-- STEP 2: Drop FK constraints that will reference wrong columns after rename
-- =============================================================================

-- Messages: sender_id -> users.id becomes from_user_id -> users.id
-- We drop it because the code inserts auth.uid() directly and no FK enforcement
-- is needed for messages (the app ensures the conversation participant exists).
ALTER TABLE IF EXISTS public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- Reports: reporter_profile_id -> user_profiles.id becomes reporter_user_id
-- The code inserts auth.uid() (users.id), not a profile_id.
ALTER TABLE IF EXISTS public.reports DROP CONSTRAINT IF EXISTS reports_reporter_profile_id_fkey;

-- User blocks: blocker_profile_id -> user_profiles.id becomes blocker_user_id
-- User blocks: blocked_profile_id -> user_profiles.id becomes blocked_user_id
-- The code inserts auth.uid() for blocker and profile_id for blocked.
-- We remove FKs because the semantic model changed.
ALTER TABLE IF EXISTS public.user_blocks DROP CONSTRAINT IF EXISTS user_blocks_blocker_profile_id_fkey;
ALTER TABLE IF EXISTS public.user_blocks DROP CONSTRAINT IF EXISTS user_blocks_blocked_profile_id_fkey;

-- =============================================================================
-- STEP 3: Rename created_date -> created_at and updated_date -> updated_at
-- =============================================================================

-- broadcasts
ALTER TABLE IF EXISTS public.broadcasts RENAME COLUMN created_date TO created_at;
ALTER TABLE IF EXISTS public.broadcasts RENAME COLUMN updated_date TO updated_at;

-- connection_requests
ALTER TABLE IF EXISTS public.connection_requests RENAME COLUMN created_date TO created_at;

-- conversations
ALTER TABLE IF EXISTS public.conversations RENAME COLUMN created_date TO created_at;

-- event_rsvps
ALTER TABLE IF EXISTS public.event_rsvps RENAME COLUMN created_date TO created_at;

-- messages
ALTER TABLE IF EXISTS public.messages RENAME COLUMN created_date TO created_at;

-- notifications
ALTER TABLE IF EXISTS public.notifications RENAME COLUMN created_date TO created_at;

-- reports
ALTER TABLE IF EXISTS public.reports RENAME COLUMN created_date TO created_at;

-- user_blocks
ALTER TABLE IF EXISTS public.user_blocks RENAME COLUMN created_date TO created_at;

-- user_profiles
ALTER TABLE IF EXISTS public.user_profiles RENAME COLUMN created_date TO created_at;
ALTER TABLE IF EXISTS public.user_profiles RENAME COLUMN updated_date TO updated_at;

-- users
ALTER TABLE IF EXISTS public.users RENAME COLUMN created_date TO created_at;
ALTER TABLE IF EXISTS public.users RENAME COLUMN updated_date TO updated_at;

-- =============================================================================
-- STEP 4: Rename semantic ID columns to match code expectations
-- =============================================================================

-- messages: sender_id -> from_user_id (auth user UUID)
ALTER TABLE IF EXISTS public.messages RENAME COLUMN sender_id TO from_user_id;

-- reports: reporter_profile_id -> reporter_user_id, target_profile_id -> target_user_id
ALTER TABLE IF EXISTS public.reports RENAME COLUMN reporter_profile_id TO reporter_user_id;
ALTER TABLE IF EXISTS public.reports RENAME COLUMN target_profile_id TO target_user_id;

-- user_blocks: blocker_profile_id -> blocker_user_id, blocked_profile_id -> blocked_user_id
ALTER TABLE IF EXISTS public.user_blocks RENAME COLUMN blocker_profile_id TO blocker_user_id;
ALTER TABLE IF EXISTS public.user_blocks RENAME COLUMN blocked_profile_id TO blocked_user_id;

-- =============================================================================
-- STEP 5: Recreate policies for tables whose columns were renamed
-- =============================================================================

-- Messages policies
CREATE POLICY "Users can view conversation messages"
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

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (public.is_admin() OR from_user_id = auth.uid())
  WITH CHECK (from_user_id = auth.uid());

-- User blocks policies
CREATE POLICY "Users can view own blocks"
  ON public.user_blocks FOR SELECT TO authenticated
  USING (public.is_admin() OR blocker_user_id = auth.uid());

CREATE POLICY "Users can create blocks"
  ON public.user_blocks FOR INSERT TO authenticated
  WITH CHECK (blocker_user_id = auth.uid());

CREATE POLICY "Users can delete own blocks"
  ON public.user_blocks FOR DELETE TO authenticated
  USING (public.is_admin() OR blocker_user_id = auth.uid());

CREATE POLICY "Users can update own blocks"
  ON public.user_blocks FOR UPDATE TO authenticated
  USING (public.is_admin() OR blocker_user_id = auth.uid())
  WITH CHECK (blocker_user_id = auth.uid());

-- Reports policies
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (public.is_admin() OR reporter_user_id = auth.uid());

CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_user_id = auth.uid());

CREATE POLICY "Users can update own reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.is_admin() OR reporter_user_id = auth.uid())
  WITH CHECK (reporter_user_id = auth.uid());

-- =============================================================================
-- STEP 6: Enable RLS on all core tables (idempotent)
-- =============================================================================
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.live_map_presence ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 7: Secure is_admin() function
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
-- STEP 8: Grant table permissions to authenticated role
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_rsvps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_blocks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
