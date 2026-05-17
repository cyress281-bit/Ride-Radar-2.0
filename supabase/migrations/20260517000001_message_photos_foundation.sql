-- =============================================================================
-- Message photos Phase 1: DB/storage foundation
-- =============================================================================
-- Changes:
--   1. Add nullable image_url column to public.messages
--   2. Make body nullable (existing rows all have body populated — safe)
--   3. Add CHECK constraint: message must have non-empty body OR non-empty image_url
--   4. Storage INSERT/UPDATE/DELETE policies for messages/{userId}/... path
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add image_url column (nullable, idempotent)
-- ----------------------------------------------------------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_url text;

-- ----------------------------------------------------------------------------
-- 2. Make body nullable (idempotent via existence check)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
    AND    table_name   = 'messages'
    AND    column_name  = 'body'
    AND    is_nullable  = 'NO'
  ) THEN
    ALTER TABLE public.messages ALTER COLUMN body DROP NOT NULL;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. CHECK constraint: at least body or image_url must be non-empty
--    (idempotent — skips if constraint already exists)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname    = 'messages_has_content'
    AND    conrelid   = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_has_content
      CHECK (
        (body IS NOT NULL AND btrim(body) <> '')
        OR
        (image_url IS NOT NULL AND btrim(image_url) <> '')
      );
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4a. Storage INSERT policy — message images
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  CREATE POLICY "Users can upload own message images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'uploads'
      AND name LIKE ('messages/' || auth.uid()::text || '/%')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 4b. Storage UPDATE policy — message images
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  CREATE POLICY "Users can update own message images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'uploads'
      AND name LIKE ('messages/' || auth.uid()::text || '/%')
    )
    WITH CHECK (
      bucket_id = 'uploads'
      AND name LIKE ('messages/' || auth.uid()::text || '/%')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 4c. Storage DELETE policy — message images
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  CREATE POLICY "Users can delete own message images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'uploads'
      AND name LIKE ('messages/' || auth.uid()::text || '/%')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
