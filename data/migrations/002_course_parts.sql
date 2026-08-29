-- Migration 002: per-part hour tracking for split courses.
--
-- Context: a learning path's weeks are packed by the learner's real
-- weekly_hours budget. Before this migration, a course longer than the
-- remaining budget for a week just silently overshot that week's hour total
-- instead of actually spanning into the next week. This adds real support
-- for splitting one course into multiple trackable parts across weeks
-- (e.g. "Part 1 of 2" this week, "Part 2 of 2" next week), each independently
-- completable.
--
-- Safe to run on the live DB: purely additive, all columns default such that
-- every EXISTING row becomes part_number=1, part_total=1 ("not split", i.e.
-- behaves exactly as it does today) with no backfill needed. part_hours is
-- left NULL on old rows on purpose - application code falls back to the
-- course's own duration_hrs when part_hours is NULL, so nothing breaks for
-- rows written before this migration.
--
-- Run this once in the Supabase SQL Editor (Table Editor -> SQL Editor).
-- No application code depends on this migration having run with a specific
-- timing - the app degrades to "no splitting, same as before" if these
-- columns don't exist yet, but the actual splitting feature needs them.

ALTER TABLE path_steps
  ADD COLUMN IF NOT EXISTS part_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS part_total  INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS part_hours  NUMERIC;

-- Sanity check after running:
-- SELECT part_number, part_total, part_hours FROM path_steps LIMIT 5;
-- Every existing row should show part_number=1, part_total=1, part_hours=NULL.
