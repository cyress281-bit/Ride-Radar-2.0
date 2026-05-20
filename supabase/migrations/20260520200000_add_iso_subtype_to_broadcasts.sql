-- Add iso_subtype column to broadcasts for Need Help (ISO) subtype persistence.
-- Allows NULL (non-ISO broadcasts), 'mechanic', or 'bike_crew'.
-- Non-destructive: existing rows default to NULL.

ALTER TABLE public.broadcasts
  ADD COLUMN IF NOT EXISTS iso_subtype text
  CHECK (iso_subtype IS NULL OR iso_subtype IN ('mechanic', 'bike_crew'));
