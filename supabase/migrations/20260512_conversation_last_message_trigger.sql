-- =============================================================================
-- Trigger: Auto-update conversations.last_message_at on new message
-- =============================================================================
-- This eliminates the client-side race condition where sendMessage succeeds
-- but the separate conversation update fails, leaving stale timestamps.
--
-- Also updates the conversation's last_message_at when a message is inserted.

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

-- Drop existing trigger if any (idempotent)
DROP TRIGGER IF EXISTS trg_messages_update_conversation ON public.messages;

CREATE TRIGGER trg_messages_update_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message();
