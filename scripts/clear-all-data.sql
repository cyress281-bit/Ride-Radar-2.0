-- ============================================
-- RIDE RADAR 2.0 — COMPLETE DATA RESET
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Disable triggers temporarily to avoid cascading issues
ALTER TABLE public.users DISABLE TRIGGER ALL;
ALTER TABLE public.user_profiles DISABLE TRIGGER ALL;
ALTER TABLE public.broadcasts DISABLE TRIGGER ALL;
ALTER TABLE public.messages DISABLE TRIGGER ALL;
ALTER TABLE public.conversations DISABLE TRIGGER ALL;
ALTER TABLE public.friendships DISABLE TRIGGER ALL;
ALTER TABLE public.connection_requests DISABLE TRIGGER ALL;
ALTER TABLE public.reports DISABLE TRIGGER ALL;
ALTER TABLE public.user_blocks DISABLE TRIGGER ALL;
ALTER TABLE public.live_map_presence DISABLE TRIGGER ALL;
ALTER TABLE public.notifications DISABLE TRIGGER ALL;
ALTER TABLE public.push_subscriptions DISABLE TRIGGER ALL;

-- 2. Truncate all user/data tables (keeps schema, RLS policies, functions)
TRUNCATE TABLE public.push_subscriptions CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.live_map_presence CASCADE;
TRUNCATE TABLE public.user_blocks CASCADE;
TRUNCATE TABLE public.reports CASCADE;
TRUNCATE TABLE public.connection_requests CASCADE;
TRUNCATE TABLE public.friendships CASCADE;
TRUNCATE TABLE public.messages CASCADE;
TRUNCATE TABLE public.conversations CASCADE;
TRUNCATE TABLE public.broadcasts CASCADE;
TRUNCATE TABLE public.user_profiles CASCADE;
TRUNCATE TABLE public.users CASCADE;

-- 3. Re-enable triggers
ALTER TABLE public.users ENABLE TRIGGER ALL;
ALTER TABLE public.user_profiles ENABLE TRIGGER ALL;
ALTER TABLE public.broadcasts ENABLE TRIGGER ALL;
ALTER TABLE public.messages ENABLE TRIGGER ALL;
ALTER TABLE public.conversations ENABLE TRIGGER ALL;
ALTER TABLE public.friendships ENABLE TRIGGER ALL;
ALTER TABLE public.connection_requests ENABLE TRIGGER ALL;
ALTER TABLE public.reports ENABLE TRIGGER ALL;
ALTER TABLE public.user_blocks ENABLE TRIGGER ALL;
ALTER TABLE public.live_map_presence ENABLE TRIGGER ALL;
ALTER TABLE public.notifications ENABLE TRIGGER ALL;
ALTER TABLE public.push_subscriptions ENABLE TRIGGER ALL;

-- 4. Reset auth.users (deletes ALL authenticated users)
-- NOTE: This requires service_role or must be done via Dashboard > Auth > Users
-- The below only works if executed with elevated privileges:
-- DELETE FROM auth.users;

SELECT 'All public schema data cleared. Auth users must be deleted separately.' AS status;
