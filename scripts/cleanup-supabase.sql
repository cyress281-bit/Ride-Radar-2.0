-- ============================================================
-- SUPABASE FULL CLEANUP SCRIPT
-- WARNING: This permanently deletes ALL user data.
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ============================================================

-- Step 1: Disable triggers to avoid side-effects during cleanup
SET session_replication_role = replica;

-- Step 2: Truncate all application tables (CASCADE handles FK dependencies)
TRUNCATE TABLE
  public.live_map_presence,
  public.event_rsvps,
  public.conversation_notifications,
  public.messages,
  public.conversations,
  public.connection_requests,
  public.friendships,
  public.user_blocks,
  public.reports,
  public.account_deletion_requests,
  public.notifications,
  public.user_settings,
  public.broadcasts,
  public.user_profiles,
  public.users
RESTART IDENTITY CASCADE;

-- Step 3: Re-enable triggers
SET session_replication_role = DEFAULT;

-- Step 4: Verify counts are zero
SELECT 'users' as table_name, COUNT(*) as count FROM public.users
UNION ALL SELECT 'user_profiles', COUNT(*) FROM public.user_profiles
UNION ALL SELECT 'broadcasts', COUNT(*) FROM public.broadcasts
UNION ALL SELECT 'messages', COUNT(*) FROM public.messages
UNION ALL SELECT 'conversations', COUNT(*) FROM public.conversations
UNION ALL SELECT 'friendships', COUNT(*) FROM public.friendships
UNION ALL SELECT 'connection_requests', COUNT(*) FROM public.connection_requests
UNION ALL SELECT 'user_blocks', COUNT(*) FROM public.user_blocks
UNION ALL SELECT 'reports', COUNT(*) FROM public.reports
UNION ALL SELECT 'notifications', COUNT(*) FROM public.notifications
UNION ALL SELECT 'live_map_presence', COUNT(*) FROM public.live_map_presence;
