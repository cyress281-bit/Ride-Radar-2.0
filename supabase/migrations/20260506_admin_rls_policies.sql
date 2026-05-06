-- Admin RLS Policies for Ride Radar 2.0
--
-- These policies grant admin users full read access to all tables
-- needed by the admin dashboard, and write access for moderation actions.
--
-- Prerequisites:
-- - The `users` table must have a `role` column (text, default 'user')
-- - Admin users should have role = 'admin' set by another admin or via service role
--
-- Security model:
-- - Admins can read all rows in administrative tables
-- - Admins can update reports, broadcasts, users, profiles, conversations
-- - Admins can delete broadcasts and messages (moderation)
-- - Regular users cannot modify their own `role` column

-- Ensure role column exists on users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
  END IF;
END $$;

-- Helper function: returns true if the current user has admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- READ POLICIES (SELECT) - Admin can read all rows
-- =============================================================================

-- Users table: admin can see all users
CREATE POLICY admin_read_users ON users
  FOR SELECT USING (is_admin() OR id = auth.uid());

-- User profiles: admin can see all profiles
CREATE POLICY admin_read_profiles ON user_profiles
  FOR SELECT USING (is_admin() OR user_id = auth.uid() OR is_public = true);

-- Broadcasts: admin can see all broadcasts
CREATE POLICY admin_read_broadcasts ON broadcasts
  FOR SELECT USING (is_admin() OR status = 'active' OR author_id = auth.uid());

-- Reports: admin can see all reports (regular users see only their own)
CREATE POLICY admin_read_reports ON reports
  FOR SELECT USING (is_admin() OR reporter_profile_id = auth.uid());

-- User blocks: admin can see all blocks
CREATE POLICY admin_read_blocks ON user_blocks
  FOR SELECT USING (is_admin() OR blocker_profile_id = auth.uid());

-- Notifications: admin can see all notifications
CREATE POLICY admin_read_notifications ON notifications
  FOR SELECT USING (is_admin() OR user_id = auth.uid() OR is_global = true);

-- Account deletion requests: admin can see all
CREATE POLICY admin_read_deletions ON account_deletion_requests
  FOR SELECT USING (is_admin() OR user_id = auth.uid());

-- Conversations: admin can see all conversations
CREATE POLICY admin_read_conversations ON conversations
  FOR SELECT USING (
    is_admin()
    OR participant1_id = auth.uid()
    OR participant2_id = auth.uid()
  );

-- =============================================================================
-- WRITE POLICIES (UPDATE) - Admin moderation actions
-- =============================================================================

-- Users: admin can update any user (role changes, etc.)
-- Regular users can only update their own non-role fields
CREATE POLICY admin_update_users ON users
  FOR UPDATE USING (is_admin() OR id = auth.uid())
  WITH CHECK (
    CASE
      WHEN is_admin() THEN true
      -- Non-admins cannot change their own role
      ELSE (role IS NOT DISTINCT FROM (SELECT role FROM users WHERE id = auth.uid()))
    END
  );

-- Reports: admin can update any report status
CREATE POLICY admin_update_reports ON reports
  FOR UPDATE USING (is_admin());

-- Broadcasts: admin can update any broadcast (expire, etc.)
CREATE POLICY admin_update_broadcasts ON broadcasts
  FOR UPDATE USING (is_admin() OR author_id = auth.uid());

-- User profiles: admin can update any profile (e.g., make private)
CREATE POLICY admin_update_profiles ON user_profiles
  FOR UPDATE USING (is_admin() OR user_id = auth.uid());

-- Conversations: admin can archive any conversation
CREATE POLICY admin_update_conversations ON conversations
  FOR UPDATE USING (
    is_admin()
    OR participant1_id = auth.uid()
    OR participant2_id = auth.uid()
  );

-- =============================================================================
-- DELETE POLICIES - Admin moderation actions
-- =============================================================================

-- Broadcasts: admin can delete any broadcast
CREATE POLICY admin_delete_broadcasts ON broadcasts
  FOR DELETE USING (is_admin() OR author_id = auth.uid());

-- Messages: admin can delete any message (content moderation)
CREATE POLICY admin_delete_messages ON messages
  FOR DELETE USING (is_admin() OR sender_id = auth.uid());

-- =============================================================================
-- INSERT POLICIES - Admin notification sending
-- =============================================================================

-- Notifications: admin can insert global notifications
CREATE POLICY admin_insert_notifications ON notifications
  FOR INSERT WITH CHECK (is_admin() OR user_id = auth.uid());
