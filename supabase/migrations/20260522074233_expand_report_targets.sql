-- ============================================================================
-- Expand moderation reports to first-class community content targets
-- Adds post, post_comment, and image report support while preserving the
-- existing reports queue and legacy target types.
-- ============================================================================

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_target_type_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_target_type_check
  CHECK (target_type IN ('user', 'broadcast', 'message', 'post', 'post_comment', 'image'));

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS target_parent_id uuid,
  ADD COLUMN IF NOT EXISTS target_context jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.reports.target_parent_id IS
  'Optional parent content id for nested or image reports (e.g. post id for a post comment or post image).';

COMMENT ON COLUMN public.reports.target_context IS
  'Optional moderation context payload for report handling (e.g. image kind, source metadata).';

CREATE INDEX IF NOT EXISTS idx_reports_target_parent_id ON public.reports(target_parent_id);
