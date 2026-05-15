-- Migration: Create auth.users trigger to auto-create public.users rows
-- Date: 2026-05-14
-- Purpose: Guarantees public.users exists for every auth user, eliminating
--          frontend race conditions and FK violations during onboarding.

-- ============================================================================
-- 1. Trigger function: auto-create public.users row for new auth users
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically mirrors new auth.users rows into public.users. '
  'Runs as SECURITY DEFINER to bypass RLS. '
  'Uses ON CONFLICT DO UPDATE to keep email/full_name fresh.';

-- ============================================================================
-- 2. Trigger: run after every insert on auth.users
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. Backfill: repair any existing auth.users missing public.users rows
-- ============================================================================
INSERT INTO public.users (id, email, full_name, role)
SELECT
  au.id,
  au.email,
  au.raw_user_meta_data->>'full_name',
  'user'
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name;
