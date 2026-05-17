-- =============================================================================
-- Personalize notification title/body with actor display name
-- =============================================================================
-- Purpose: Replace generic "A rider…" text in connection and message
-- notifications with the actor's actual display_name (or @username fallback).
-- Strategy: JOIN user_profiles inside each SECURITY DEFINER trigger function.
-- RLS is bypassed by SECURITY DEFINER, so the JOIN always resolves.
-- Existing routing data keys (from_user_id, to_user_id, conversation_id,
-- connection_request_id, message_id) are preserved unchanged.
-- New data keys added: actor_id, actor_display_name, actor_username.
-- new_message also gains message_preview for future UI use.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. handle_connection_request_notification
--    Fires: AFTER INSERT ON connection_requests
--    Recipient: NEW.to_user_id
--    Actor:     NEW.from_user_id
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_connection_request_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_display_name text;
  v_username     text;
  v_actor_name   text;
BEGIN
  SELECT display_name, username
  INTO   v_display_name, v_username
  FROM   public.user_profiles
  WHERE  user_id = NEW.from_user_id;

  v_actor_name := COALESCE(
    NULLIF(v_display_name, ''),
    CASE WHEN NULLIF(v_username, '') IS NOT NULL THEN '@' || v_username ELSE NULL END,
    'A rider'
  );

  INSERT INTO public.notifications (user_id, type, title, body, data, read)
  VALUES (
    NEW.to_user_id,
    'connection_request',
    'Connection request',
    v_actor_name || ' sent you a connection request.',
    jsonb_build_object(
      'connection_request_id', NEW.id,
      'from_user_id',          NEW.from_user_id,
      'actor_id',              NEW.from_user_id,
      'actor_display_name',    v_display_name,
      'actor_username',        v_username
    ),
    false
  );

  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. handle_connection_accepted_notification
--    Fires: AFTER UPDATE ON connection_requests (pending -> accepted)
--    Recipient: NEW.from_user_id  (original requester)
--    Actor:     NEW.to_user_id    (rider who accepted)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_connection_accepted_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_display_name text;
  v_username     text;
  v_actor_name   text;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT display_name, username
    INTO   v_display_name, v_username
    FROM   public.user_profiles
    WHERE  user_id = NEW.to_user_id;

    v_actor_name := COALESCE(
      NULLIF(v_display_name, ''),
      CASE WHEN NULLIF(v_username, '') IS NOT NULL THEN '@' || v_username ELSE NULL END,
      'A rider'
    );

    INSERT INTO public.notifications (user_id, type, title, body, data, read)
    VALUES (
      NEW.from_user_id,
      'connection_accepted',
      'Connection accepted',
      v_actor_name || ' accepted your connection request.',
      jsonb_build_object(
        'connection_request_id', NEW.id,
        'from_user_id',          NEW.from_user_id,
        'to_user_id',            NEW.to_user_id,
        'actor_id',              NEW.to_user_id,
        'actor_display_name',    v_display_name,
        'actor_username',        v_username
      ),
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. handle_new_message
--    Fires: AFTER INSERT ON messages
--    Recipient: every participant except NEW.from_user_id
--    Actor:     NEW.from_user_id
--    Also updates conversations.last_message_at/preview/sender_id (unchanged)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recipient_id uuid;
  v_display_name text;
  v_username     text;
  v_actor_name   text;
BEGIN
  UPDATE public.conversations
  SET
    last_message_at        = NEW.created_at,
    last_message_preview   = LEFT(NEW.body, 100),
    last_message_sender_id = NEW.from_user_id
  WHERE id = NEW.conversation_id;

  SELECT display_name, username
  INTO   v_display_name, v_username
  FROM   public.user_profiles
  WHERE  user_id = NEW.from_user_id;

  v_actor_name := COALESCE(
    NULLIF(v_display_name, ''),
    CASE WHEN NULLIF(v_username, '') IS NOT NULL THEN '@' || v_username ELSE NULL END,
    'A rider'
  );

  FOR v_recipient_id IN
    SELECT unnest(c.participant_ids)
    FROM   public.conversations c
    WHERE  c.id = NEW.conversation_id
  LOOP
    IF v_recipient_id <> NEW.from_user_id THEN
      INSERT INTO public.notifications (user_id, type, title, body, data, read)
      VALUES (
        v_recipient_id,
        'new_message',
        'New message',
        v_actor_name || ' sent you a message.',
        jsonb_build_object(
          'conversation_id',    NEW.conversation_id,
          'from_user_id',       NEW.from_user_id,
          'message_id',         NEW.id,
          'actor_id',           NEW.from_user_id,
          'actor_display_name', v_display_name,
          'actor_username',     v_username,
          'message_preview',    LEFT(NEW.body, 100)
        ),
        false
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;
