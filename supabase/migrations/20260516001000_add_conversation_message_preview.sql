-- =============================================================================
-- Add last_message_preview and last_message_sender_id to conversations
-- =============================================================================
-- Purpose: Conversation list rows should show the latest message text instead
-- of falling back to "Start a conversation" for threads that have messages.
-- Strategy: Denormalize preview text into conversations via the existing
-- handle_new_message trigger. No extra query per conversation at read time.
-- =============================================================================

-- Step 1: Add new columns
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_message_preview text,
  ADD COLUMN IF NOT EXISTS last_message_sender_id uuid
    REFERENCES public.users(id) ON DELETE SET NULL;

-- Step 2: Replace handle_new_message to also populate the new columns.
-- Preserves exactly: SECURITY DEFINER, search_path, notification loop,
-- recipient filter (skip sender), notifications INSERT shape, RETURN NEW.
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recipient_id uuid;
BEGIN
  UPDATE public.conversations
  SET
    last_message_at        = NEW.created_at,
    last_message_preview   = LEFT(NEW.body, 100),
    last_message_sender_id = NEW.from_user_id
  WHERE id = NEW.conversation_id;

  FOR recipient_id IN
    SELECT unnest(c.participant_ids)
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id
  LOOP
    IF recipient_id <> NEW.from_user_id THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        body,
        data,
        read
      ) VALUES (
        recipient_id,
        'new_message',
        'New message',
        left(NEW.body, 100),
        jsonb_build_object(
          'conversation_id', NEW.conversation_id,
          'from_user_id', NEW.from_user_id,
          'message_id', NEW.id
        ),
        false
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Step 3: Backfill existing conversations from their latest message.
-- Conversations with zero messages are untouched (preview stays NULL).
UPDATE public.conversations c
SET
  last_message_at        = latest.created_at,
  last_message_preview   = LEFT(latest.body, 100),
  last_message_sender_id = latest.from_user_id
FROM (
  SELECT DISTINCT ON (conversation_id)
    conversation_id,
    body,
    from_user_id,
    created_at
  FROM public.messages
  ORDER BY conversation_id, created_at DESC
) latest
WHERE c.id = latest.conversation_id;
