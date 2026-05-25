-- Add explicit SELECT RLS policy for authenticated users on notifications table.
-- The admin_read_notifications policy covers regular users via user_id = auth.uid(),
-- but having a dedicated authenticated policy makes the security model explicit
-- and prevents potential edge cases where policy resolution fails.

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- Add dedicated SELECT policy for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications"
      ON public.notifications FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR is_global = true);
  END IF;
END $$;

-- Ensure authenticated role has base table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
