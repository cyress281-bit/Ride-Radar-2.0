-- Add 'interested' to the event_rsvps status check constraint
-- The frontend already sends 'interested' but the DB rejected it.
-- Also update the default to be more neutral.

ALTER TABLE public.event_rsvps
DROP CONSTRAINT IF EXISTS event_rsvps_status_check;

ALTER TABLE public.event_rsvps
ADD CONSTRAINT event_rsvps_status_check
CHECK (status IN ('interested', 'going', 'maybe', 'not_going'));
