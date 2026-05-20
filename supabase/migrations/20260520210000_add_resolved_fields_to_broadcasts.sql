-- Add resolved_at and resolved_note to broadcasts for Bike Down resolved/safe state.
-- Resolving a Bike Down sets status='expired' + resolved_at=now() so it disappears
-- from Radar immediately while the detail page can show "Rider found safe."
-- Non-destructive: existing rows default to NULL. No status CHECK change. No RLS change.

ALTER TABLE public.broadcasts
  ADD COLUMN IF NOT EXISTS resolved_at  timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS resolved_note text        DEFAULT NULL;
