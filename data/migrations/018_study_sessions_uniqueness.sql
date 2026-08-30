-- 018_study_sessions_uniqueness.sql
--
-- Learner event uniqueness: study_sessions accumulated one new row on
-- every *re*-completion of the same step (confirmed live - one real
-- account had 8 rows logged for a single step from repeated complete/
-- uncomplete toggling), and account_service.get_streak()'s minutes_total
-- is a SUM over these rows, so duplicates directly inflated a number shown
-- to the learner. Scoped to activity='task_completed' only:
-- resource_opened/assessment/manual sessions are legitimately allowed to
-- repeat (opening a resource twice, logging a second study session) and
-- must not be constrained.
--
-- Split into its own migration file, separate from
-- 016_integrity_hardening.sql: on the live database this index cannot be
-- created until scripts/db_maintenance.py's dedupe_study_sessions check has
-- been run with --apply first (Postgres refuses a unique index over data
-- that already violates it). A fresh database starts with zero
-- study_sessions rows and needs no such ordering - this migration is safe
-- to run immediately after 016/017 there.
--
-- Deployment note for the live project: run
--   python -m scripts.db_maintenance --apply --only dedupe_study_sessions
-- and confirm 0 duplicates remain before applying this file.

CREATE UNIQUE INDEX IF NOT EXISTS idx_study_sessions_task_completed_uniq
  ON public.study_sessions (user_id, step_id)
  WHERE activity = 'task_completed' AND step_id IS NOT NULL;
