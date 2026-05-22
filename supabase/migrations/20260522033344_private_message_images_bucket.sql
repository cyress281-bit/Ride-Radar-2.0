-- Private direct-message image storage.
-- Keeps avatars/events/posts on the public uploads bucket, but moves
-- message images to a private bucket with participant-scoped access.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-images',
  'message-images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own message images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own message images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own message images" ON storage.objects;

DROP POLICY IF EXISTS "Conversation participants can read message images" ON storage.objects;
CREATE POLICY "Conversation participants can read message images"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-images'
    AND (storage.foldername(name))[1] = 'messages'
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id::text = (storage.foldername(name))[3]
        AND auth.uid() = ANY(c.participant_ids)
    )
  );

DROP POLICY IF EXISTS "Users can upload own private message images" ON storage.objects;
CREATE POLICY "Users can upload own private message images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'message-images'
    AND (storage.foldername(name))[1] = 'messages'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id::text = (storage.foldername(name))[3]
        AND auth.uid() = ANY(c.participant_ids)
    )
  );

DROP POLICY IF EXISTS "Users can update own private message images" ON storage.objects;
CREATE POLICY "Users can update own private message images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'message-images'
    AND (storage.foldername(name))[1] = 'messages'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id::text = (storage.foldername(name))[3]
        AND auth.uid() = ANY(c.participant_ids)
    )
  )
  WITH CHECK (
    bucket_id = 'message-images'
    AND (storage.foldername(name))[1] = 'messages'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id::text = (storage.foldername(name))[3]
        AND auth.uid() = ANY(c.participant_ids)
    )
  );

DROP POLICY IF EXISTS "Users can delete own private message images" ON storage.objects;
CREATE POLICY "Users can delete own private message images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'message-images'
    AND (storage.foldername(name))[1] = 'messages'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id::text = (storage.foldername(name))[3]
        AND auth.uid() = ANY(c.participant_ids)
    )
  );
