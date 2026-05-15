-- Migration: Create uploads storage bucket and policies for onboarding photos
-- Date: 2026-05-14
-- Purpose: Enables avatar and bike photo uploads during onboarding.

-- ============================================================================
-- 1. Create the uploads bucket if it does not exist
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. Storage policies for authenticated users
-- ============================================================================

-- Allow authenticated users to upload their own avatars
DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;
CREATE POLICY "Users can upload own avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'uploads'
    AND name LIKE 'avatars/' || auth.uid() || '/%'
  );

-- Allow authenticated users to upload their own bike photos
DROP POLICY IF EXISTS "Users can upload own bike photos" ON storage.objects;
CREATE POLICY "Users can upload own bike photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'uploads'
    AND name LIKE 'bikes/' || auth.uid() || '/%'
  );

-- Allow authenticated users to read any object in uploads (public bucket)
DROP POLICY IF EXISTS "Anyone can read uploads" ON storage.objects;
CREATE POLICY "Anyone can read uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'uploads');

-- Allow authenticated users to update their own uploads
DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
CREATE POLICY "Users can update own uploads"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'uploads'
    AND (
      name LIKE 'avatars/' || auth.uid() || '/%'
      OR name LIKE 'bikes/' || auth.uid() || '/%'
    )
  )
  WITH CHECK (
    bucket_id = 'uploads'
    AND (
      name LIKE 'avatars/' || auth.uid() || '/%'
      OR name LIKE 'bikes/' || auth.uid() || '/%'
    )
  );

-- Allow authenticated users to delete their own uploads
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'uploads'
    AND (
      name LIKE 'avatars/' || auth.uid() || '/%'
      OR name LIKE 'bikes/' || auth.uid() || '/%'
    )
  );
