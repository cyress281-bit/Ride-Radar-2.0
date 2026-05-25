-- ============================================================
-- RLS Gaps Fix — Based on actual schema inspection
-- ============================================================
--
-- ALREADY EXISTS (audit was incorrect about these):
--   - live_map_presence: RLS enabled, all CRUD policies present
--   - broadcast_comments: DELETE policy exists
--   - user_blocks: DELETE policy exists
--   - conversations: SELECT policy exists
--
-- ACTUALLY MISSING:
--   1. messages: No DELETE policy
--   2. user_posts: No UPDATE policy
--
-- ============================================================

-- ============================================================
-- HIGH: Fix messages - add missing DELETE policy
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname = 'Users can delete own messages'
  ) THEN
    CREATE POLICY "Users can delete own messages"
      ON public.messages FOR DELETE TO authenticated
      USING (from_user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- MEDIUM: Fix user_posts - add missing UPDATE policy
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_posts'
      AND policyname = 'Users can update own posts'
  ) THEN
    CREATE POLICY "Users can update own posts"
      ON public.user_posts FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
