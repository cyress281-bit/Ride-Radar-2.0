-- Fix reports RLS policies for admin access

-- 1. Drop the old UPDATE policy that has wrong with_check
DROP POLICY IF EXISTS "Users can update own reports" ON public.reports;

-- 2. Recreate UPDATE policy: admins can update any report, users can update their own
CREATE POLICY "Users can update own reports"
  ON public.reports
  FOR UPDATE
  TO authenticated
  USING (is_admin() OR (reporter_user_id = auth.uid()))
  WITH CHECK (is_admin() OR (reporter_user_id = auth.uid()));

-- 3. Add DELETE policy for admins
CREATE POLICY "Admins can delete reports"
  ON public.reports
  FOR DELETE
  TO authenticated
  USING (is_admin());
