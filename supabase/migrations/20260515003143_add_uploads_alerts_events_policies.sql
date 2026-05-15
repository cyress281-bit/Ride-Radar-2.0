-- Migration: Add owner-scoped storage policies for alert and event uploads
-- Purpose: Enables authenticated users to upload alert photos and event posters
--          to owner-scoped folders in the uploads bucket.

-- ============================================================================
-- 1. INSERT policies for authenticated users
-- ============================================================================

DROP POLICY IF EXISTS "Users can upload own alert photos" ON storage.objects;
CREATE POLICY "Users can upload own alert photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'uploads'
    AND name LIKE 'alerts/' || auth.uid() || '/%'
  );

DROP POLICY IF EXISTS "Users can upload own event posters" ON storage.objects;
CREATE POLICY "Users can upload own event posters"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'uploads'
    AND name LIKE 'events/' || auth.uid() || '/%'
  );

-- ============================================================================
-- 2. UPDATE policies for authenticated users (owner-scoped)
-- ============================================================================

DROP POLICY IF EXISTS "Users can update own alert photos" ON storage.objects;
CREATE POLICY "Users can update own alert photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'uploads'
    AND name LIKE 'alerts/' || auth.uid() || '/%'
  )
  WITH CHECK (
    bucket_id = 'uploads'
    AND name LIKE 'alerts/' || auth.uid() || '/%'
  );

DROP POLICY IF EXISTS "Users can update own event posters" ON storage.objects;
CREATE POLICY "Users can update own event posters"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'uploads'
    AND name LIKE 'events/' || auth.uid() || '/%'
  )
  WITH CHECK (
    bucket_id = 'uploads'
    AND name LIKE 'events/' || auth.uid() || '/%'
  );

-- ============================================================================
-- 3. DELETE policies for authenticated users (owner-scoped)
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own alert photos" ON storage.objects;
CREATE POLICY "Users can delete own alert photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'uploads'
    AND name LIKE 'alerts/' || auth.uid() || '/%'
  );

DROP POLICY IF EXISTS "Users can delete own event posters" ON storage.objects;
CREATE POLICY "Users can delete own event posters"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'uploads'
    AND name LIKE 'events/' || auth.uid() || '/%'
  );
