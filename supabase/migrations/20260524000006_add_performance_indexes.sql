-- Migration: add missing performance indexes and drop redundant ones

-- 1. conversations: index for sorting by last_message_at DESC (conversation list ordering)
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
ON public.conversations USING btree (last_message_at DESC);

-- 2. notifications: composite index for unread notifications query
-- Filters by user_id + read=false, ordered by created_at DESC
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
ON public.notifications USING btree (user_id, read, created_at DESC);

-- 3. event_rsvps: index for finding all RSVPs by a user
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id
ON public.event_rsvps USING btree (user_id);

-- 4. Drop redundant single-column index (composite covers it)
DROP INDEX IF EXISTS public.idx_post_comments_post_id;

-- 5. Drop redundant single-column index (composite covers it)
DROP INDEX IF EXISTS public.idx_user_posts_user_id;
