-- =============================================================================
-- Update get_or_create_conversation to verify friendship
-- =============================================================================
-- Prevents any authenticated user from force-creating a conversation with
-- any other user. Now requires an active friendship between participants.

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
  v_other_user_id uuid;
  v_friendship_exists boolean;
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

  -- For DM conversations (exactly 2 participants), verify an active friendship exists
  IF array_length(v_normalized_ids, 1) = 2 THEN
    v_other_user_id := (
      SELECT elem FROM unnest(v_normalized_ids) AS elem WHERE elem <> v_requesting_user_id LIMIT 1
    );

    SELECT EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'active'
        AND (
          (user_a_id = v_requesting_user_id AND user_b_id = v_other_user_id)
          OR (user_a_id = v_other_user_id AND user_b_id = v_requesting_user_id)
        )
    ) INTO v_friendship_exists;

    IF NOT v_friendship_exists THEN
      RAISE EXCEPTION 'You can only start a conversation with a connected friend';
    END IF;
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

COMMENT ON FUNCTION public.get_or_create_conversation IS
  'Atomically gets or creates an active conversation. Requires an active friendship for 1:1 DMs.';
