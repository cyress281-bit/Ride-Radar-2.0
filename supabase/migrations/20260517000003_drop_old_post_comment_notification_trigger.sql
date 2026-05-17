-- Drop the pre-existing untracked post comment notification trigger and its function.
-- Replaced by trg_notify_post_comment / notify_post_comment (20260517000002).
-- Old function: handle_post_comment_notification
--   - Generic title/body ("New comment", "A rider commented on your post.")
--   - No actor_id, actor_display_name, actor_username in data payload
--   - Not tracked in migrations
DROP TRIGGER IF EXISTS trg_post_comment_notification ON public.post_comments;
DROP FUNCTION IF EXISTS public.handle_post_comment_notification();
