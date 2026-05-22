-- Tighten raw table read exposure and move public-facing broadcast reads onto
-- explicit visibility RPCs.
--
-- Notes:
-- - Broadcast table SELECT remains broad enough for active, unblocked rows so
--   Postgres Changes subscriptions on broadcasts continue to function.
-- - Public-facing detail/profile reads should use the RPCs below instead of
--   direct table selects.
-- - live_map_presence raw SELECT is tightened to owner/admin only because the
--   app already reads nearby presence through a block-aware, radius-scoped RPC.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

CREATE OR REPLACE FUNCTION private.is_mutually_blocked(other_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_blocks ub
    WHERE (
      ub.blocker_user_id = auth.uid()
      AND ub.blocked_user_id = other_user_id
    ) OR (
      ub.blocker_user_id = other_user_id
      AND ub.blocked_user_id = auth.uid()
    )
  );
$$;

REVOKE ALL ON FUNCTION private.is_mutually_blocked(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_mutually_blocked(uuid) FROM anon;
REVOKE ALL ON FUNCTION private.is_mutually_blocked(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION private.can_view_active_broadcast(broadcast_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.broadcasts b
    WHERE b.id = broadcast_id
      AND (
        public.is_admin()
        OR b.author_id = auth.uid()
        OR (
          b.status = 'active'
          AND (b.expires_at IS NULL OR b.expires_at > now())
          AND NOT private.is_mutually_blocked(b.author_id)
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION private.can_view_active_broadcast(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_view_active_broadcast(uuid) FROM anon;
REVOKE ALL ON FUNCTION private.can_view_active_broadcast(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION private.can_view_author_broadcasts(author_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT
    public.is_admin()
    OR author_user_id = auth.uid()
    OR (
      NOT private.is_mutually_blocked(author_user_id)
      AND (
        EXISTS (
          SELECT 1
          FROM public.user_profiles up
          WHERE up.user_id = author_user_id
            AND up.is_public = true
        )
        OR EXISTS (
          SELECT 1
          FROM public.friendships f
          WHERE f.status = 'active'
            AND (
              (f.user_a_id = auth.uid() AND f.user_b_id = author_user_id)
              OR (f.user_b_id = auth.uid() AND f.user_a_id = author_user_id)
            )
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION private.can_view_author_broadcasts(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_view_author_broadcasts(uuid) FROM anon;
REVOKE ALL ON FUNCTION private.can_view_author_broadcasts(uuid) FROM authenticated;

DROP FUNCTION IF EXISTS public.get_visible_broadcast_by_id(uuid);

CREATE FUNCTION public.get_visible_broadcast_by_id(broadcast_id uuid)
RETURNS public.broadcasts
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT b.*
  FROM public.broadcasts b
  WHERE b.id = broadcast_id
    AND private.can_view_active_broadcast(b.id)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_visible_broadcast_by_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_visible_broadcast_by_id(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_visible_broadcast_by_id(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_visible_broadcast_by_id(uuid)
  IS 'Returns a single broadcast if it is visible to the authenticated viewer under owner/admin or active-unblocked rules.';

DROP FUNCTION IF EXISTS public.get_visible_broadcasts_by_author(uuid, integer);

CREATE FUNCTION public.get_visible_broadcasts_by_author(
  author_user_id uuid,
  limit_count integer DEFAULT 200
)
RETURNS SETOF public.broadcasts
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT b.*
  FROM public.broadcasts b
  WHERE b.author_id = author_user_id
    AND (
      public.is_admin()
      OR b.author_id = auth.uid()
      OR (
        private.can_view_author_broadcasts(author_user_id)
        AND b.status = 'active'
        AND (b.expires_at IS NULL OR b.expires_at > now())
      )
    )
  ORDER BY b.created_at DESC
  LIMIT GREATEST(COALESCE(limit_count, 200), 1);
$$;

REVOKE ALL ON FUNCTION public.get_visible_broadcasts_by_author(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_visible_broadcasts_by_author(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_visible_broadcasts_by_author(uuid, integer) TO authenticated;

COMMENT ON FUNCTION public.get_visible_broadcasts_by_author(uuid, integer)
  IS 'Returns owner/admin broadcasts or profile-visible active broadcasts for the authenticated viewer.';

DROP POLICY IF EXISTS admin_read_broadcasts ON public.broadcasts;
CREATE POLICY admin_read_broadcasts ON public.broadcasts
  FOR SELECT
  USING (
    public.is_admin()
    OR author_id = auth.uid()
    OR (
      status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
      AND NOT private.is_mutually_blocked(author_id)
    )
  );

DROP POLICY IF EXISTS "Authenticated riders can read active visible presence" ON public.live_map_presence;
CREATE POLICY "Authenticated riders can read active visible presence"
  ON public.live_map_presence
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can view comments on visible broadcasts" ON public.broadcast_comments;
CREATE POLICY "Users can view comments on visible broadcasts"
  ON public.broadcast_comments
  FOR SELECT
  TO authenticated
  USING (private.can_view_active_broadcast(broadcast_comments.broadcast_id));

DROP POLICY IF EXISTS "Authenticated users can post broadcast comments" ON public.broadcast_comments;
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
        AND (b.expires_at IS NULL OR b.expires_at > now())
        AND private.can_view_active_broadcast(b.id)
    )
  );
