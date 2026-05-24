-- Add last_message columns to conversations table
-- These are denormalized fields updated by trigger for fast conversation list rendering

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS last_message_preview text,
ADD COLUMN IF NOT EXISTS last_message jsonb DEFAULT '{}';

COMMENT ON COLUMN public.conversations.last_message_preview IS 'Plain text preview of the most recent message for conversation list display.';
COMMENT ON COLUMN public.conversations.last_message IS 'Full last message object (id, body, created_at, from_user_id) as JSONB for conversation list.';

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.body, 120),
    last_message = jsonb_build_object(
      'id', NEW.id,
      'body', NEW.body,
      'created_at', NEW.created_at,
      'from_user_id', NEW.from_user_id,
      'image_url', NEW.image_url
    )
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if present (idempotent)
DROP TRIGGER IF EXISTS trg_update_conversation_last_message ON public.messages;

-- Create trigger on messages INSERT
CREATE TRIGGER trg_update_conversation_last_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_last_message();
