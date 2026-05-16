-- =============================================================================
-- Signal Comments v1 -- Phase 1
-- Table: public.broadcast_comments
-- Includes: table, indexes, RLS, realtime, notification trigger
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.broadcast_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_id uuid NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_comments_broadcast_id_created_at
  ON public.broadcast_comments (broadcast_id, created_at);

CREATE INDEX IF NOT EXISTS idx_broadcast_comments_author_id
  ON public.broadcast_comments (author_id);

ALTER TABLE public.broadcast_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view comments on visible broadcasts"
  ON public.broadcast_comments;

CREATE POLICY "Users can view comments on visible broadcasts"
  ON public.broadcast_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.broadcasts b
      WHERE b.id = broadcast_comments.broadcast_id
        AND (
          public.is_admin()
          OR b.status = 'active'
          OR b.author_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Authenticated users can post broadcast comments"
  ON public.broadcast_comments;

CREATE POLICY "Authenticated users can post broadcast comments"
  ON public.broadcast_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.broadcasts b
      WHERE b.id = broadcast_comments.broadcast_id
        AND b.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Authors and broadcast owners can delete broadcast comments"
  ON public.broadcast_comments;

CREATE POLICY "Authors and broadcast owners can delete broadcast comments"
  ON public.broadcast_comments
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR author_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.broadcasts b
      WHERE b.id = broadcast_comments.broadcast_id
        AND b.author_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, DELETE ON public.broadcast_comments TO authenticated;

ALTER TABLE public.broadcast_comments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'broadcast_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_comments;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.notify_broadcast_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_broadcast_author_id uuid;
BEGIN
  SELECT author_id
  INTO v_broadcast_author_id
  FROM public.broadcasts
  WHERE id = NEW.broadcast_id;

  IF v_broadcast_author_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.author_id = v_broadcast_author_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    read
  ) VALUES (
    v_broadcast_author_id,
    'broadcast_comment',
    'New comment on your signal',
    LEFT(NEW.body, 100),
    jsonb_build_object(
      'broadcast_id',        NEW.broadcast_id,
      'comment_id',          NEW.id,
      'commenter_id',        NEW.author_id,
      'broadcast_owner_id',  v_broadcast_author_id,
      'related_entity_type', 'broadcast',
      'related_entity_id',   NEW.broadcast_id
    ),
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_broadcast_comment
  ON public.broadcast_comments;

CREATE TRIGGER trg_notify_broadcast_comment
  AFTER INSERT
  ON public.broadcast_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_broadcast_comment();
