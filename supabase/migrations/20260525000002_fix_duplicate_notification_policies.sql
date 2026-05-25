-- Fix duplicate SELECT policies on notifications table
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
