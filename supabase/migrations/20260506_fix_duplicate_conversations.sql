-- Migration: Fix TOCTOU race condition causing duplicate conversations
-- Date: 2026-05-06
-- Problem: Concurrent requests can create duplicate conversations between the same participants.
-- Solution:
--   1. Add a deterministic participant key generated from participant_ids.
--   2. Archive existing duplicate active conversations before creating the unique index.
--   3. Create an atomic, permission-checked RPC function using INSERT ... ON CONFLICT.

-- PostgreSQL generated columns cannot contain subqueries directly, so the
-- normalization logic lives in an immutable helper function.
CREATE OR REPLACE FUNCTION public.conversation_participant_key(p_participant_ids uuid[])
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public
AS $$
  SELECT array_to_string(
    ARRAY(
      SELECT DISTINCT elem::text
      FROM unnest(p_participant_ids) AS elem
      WHERE elem IS NOT NULL
      ORDER BY elem::text
    ),
    ','
  );
$$;

COMMENT ON FUNCTION public.conversation_participant_key(uuid[]) IS
  'Returns a deterministic, sorted, comma-separated key for a participant UUID array.';

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS participant_key text
GENERATED ALWAYS AS (public.conversation_participant_key(participant_ids)) STORED;

-- Clean up existing duplicate active conversations before adding the unique index.
-- Keep the oldest row for each participant/type pair and archive later duplicates.
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY participant_key, type
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.conversations
  WHERE status = 'active'
    AND participant_key IS NOT NULL
)
UPDATE public.conversations
SET status = 'archived'
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_unique_active_participants
ON public.conversations (participant_key, type)
WHERE status = 'active';

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_participant_ids uuid[],
  p_type text DEFAULT 'friend',
  p_thread_expires_at timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requesting_user_id uuid;
  v_normalized_ids uuid[];
  v_participant_key text;
  v_result public.conversations%ROWTYPE;
  v_created boolean := false;
BEGIN
  v_requesting_user_id := auth.uid();

  IF v_requesting_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT elem
    FROM unnest(p_participant_ids) AS elem
    WHERE elem IS NOT NULL
    ORDER BY elem
  )
  INTO v_normalized_ids;

  IF array_length(v_normalized_ids, 1) < 2 THEN
    RAISE EXCEPTION 'At least two participants are required';
  END IF;

  IF NOT v_requesting_user_id = ANY(v_normalized_ids) THEN
    RAISE EXCEPTION 'Conversation must include the requesting user';
  END IF;

  IF p_type NOT IN ('friend', 'connection') THEN
    RAISE EXCEPTION 'Unsupported conversation type: %', p_type;
  END IF;

  v_participant_key := public.conversation_participant_key(v_normalized_ids);

  INSERT INTO public.conversations (type, participant_ids, status, thread_expires_at)
  VALUES (p_type, v_normalized_ids, 'active', p_thread_expires_at)
  ON CONFLICT (participant_key, type) WHERE status = 'active'
  DO NOTHING
  RETURNING * INTO v_result;

  IF FOUND THEN
    v_created := true;
  ELSE
    SELECT * INTO v_result
    FROM public.conversations
    WHERE participant_key = v_participant_key
      AND type = p_type
      AND status = 'active'
    LIMIT 1;

    IF v_result.id IS NULL THEN
      RAISE EXCEPTION 'Unable to get or create conversation';
    END IF;
  END IF;

  RETURN json_build_object(
    'id', v_result.id,
    'type', v_result.type,
    'participant_ids', v_result.participant_ids,
    'status', v_result.status,
    'thread_expires_at', v_result.thread_expires_at,
    'last_message_at', v_result.last_message_at,
    'created_at', v_result.created_at,
    'created', v_created
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_conversation(uuid[], text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_or_create_conversation(uuid[], text, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid[], text, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.get_or_create_conversation(uuid[], text, timestamptz) IS
  'Atomically gets or creates an active conversation. The caller must be authenticated and included in participant_ids.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_unique_pair
ON public.friendships (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id))
WHERE status IN ('pending', 'active');
