-- 012_resource_unavailable_event.sql
--
-- Phase 2 continuation: real-time feedback adaptation.
--
-- Widens feedback_events.event_type to add 'resource_unavailable' - a
-- learner reporting that a step's resource_url is dead/broken/paywalled.
-- Wired into feedback_service.handle_feedback: on this event, the course's
-- resource_url is RE-CHECKED LIVE (catalog_service.revalidate_course,
-- which already existed from an earlier round but was "not currently
-- scheduled" per its own docstring - this is its first real caller). Only
-- if the re-check independently confirms it's actually dead does the step
-- get swapped for a verified alternative - a single learner's mistaken or
-- malicious report cannot alone mark a real, working resource unavailable
-- for every other learner.
--
-- Purely additive: DROP + CREATE the same CHECK constraint with one more
-- allowed value. No existing row can violate the new (wider) constraint.
-- Safe to re-run (DROP CONSTRAINT IF EXISTS is idempotent).
--
-- Rollback: `ALTER TABLE feedback_events DROP CONSTRAINT feedback_events_event_type_check;
-- ALTER TABLE feedback_events ADD CONSTRAINT feedback_events_event_type_check
-- CHECK (event_type IN ('completed','too_easy','too_hard','not_interested'));`
-- - safe only if no 'resource_unavailable' row has been written yet;
-- otherwise those rows would need to be re-labeled or removed first
-- (documented here, not performed automatically - deleting real learner
-- feedback rows needs a human decision, not an automatic migration step).

ALTER TABLE feedback_events DROP CONSTRAINT IF EXISTS feedback_events_event_type_check;
ALTER TABLE feedback_events ADD CONSTRAINT feedback_events_event_type_check
  CHECK (event_type IN ('completed', 'too_easy', 'too_hard', 'not_interested', 'resource_unavailable'));
