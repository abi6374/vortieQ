-- 011_realtime_feedback_events.sql
--
-- Phase 2 of the platform-audit continuation: real-time feedback adaptation.
--
-- Widens feedback_events.event_type to add 'too_hard' - the symmetric
-- opposite of the existing 'too_easy' ('the recommender OVERESTIMATED this
-- skill', vs. 'too_easy' meaning it underestimated it). Both are handled by
-- feedback_service.handle_feedback and mastery_service.update_mastery_from_
-- feedback (see those files for the real, evidenced behavior - too_hard
-- lowers mastery/confidence and requests an easier swap; it never fabricates
-- a "prerequisite" that isn't a real skill_prerequisites edge).
--
-- Purely additive: DROP + CREATE the same CHECK constraint with one more
-- allowed value. No existing row can violate the new (wider) constraint,
-- since every existing value is still in the allowed set. Safe to re-run
-- (DROP CONSTRAINT IF EXISTS is idempotent).
--
-- Rollback: `ALTER TABLE feedback_events DROP CONSTRAINT feedback_events_event_type_check;
-- ALTER TABLE feedback_events ADD CONSTRAINT feedback_events_event_type_check
-- CHECK (event_type IN ('completed','too_easy','not_interested'));` - safe only
-- if no 'too_hard' row has been written yet; otherwise those rows would need
-- to be re-labeled or removed first (documented here, not performed
-- automatically, since deleting/altering real learner feedback rows is
-- exactly the kind of destructive action this project's rules require a
-- human decision for).

ALTER TABLE feedback_events DROP CONSTRAINT IF EXISTS feedback_events_event_type_check;
ALTER TABLE feedback_events ADD CONSTRAINT feedback_events_event_type_check
  CHECK (event_type IN ('completed', 'too_easy', 'too_hard', 'not_interested'));
