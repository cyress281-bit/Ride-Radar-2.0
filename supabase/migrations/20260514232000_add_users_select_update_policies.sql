-- Migration: Add missing SELECT and UPDATE RLS policies on public.users
-- Date: 2026-05-14
-- Purpose: Allows authenticated users to read and update their own public.users
--          row, which is required after the auth.users trigger auto-creates it.

-- ============================================================================
-- 1. SELECT policy: users can view their own row
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own row" ON public.users;
CREATE POLICY "Users can view own row"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- ============================================================================
-- 2. UPDATE policy: users can update their own row
-- ============================================================================
DROP POLICY IF EXISTS "Users can update own row" ON public.users;
CREATE POLICY "Users can update own row"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
