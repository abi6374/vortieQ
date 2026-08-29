-- Migration 006: canonical skills taxonomy + per-skill learner mastery.
--
-- Replaces "one global current_level + a flat interests array". A skill
-- (e.g. "javascript") can have many aliases ("js", "javascript" - NOT
-- "react.js", which is a separate skill that DEPENDS on javascript, see
-- skill_prerequisites). Free-text skill_tags/interests from courses,
-- resumes, GitHub analysis, and self-assessment are all mapped to ONE
-- canonical skill_id through skill_aliases, so "JS" and "JavaScript" are
-- recognized as the same skill instead of silently creating two
-- disconnected signals - and "interested in Docker" is never conflated
-- with "has verified Docker competency".

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL UNIQUE,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  alias TEXT NOT NULL UNIQUE  -- stored lowercase; app normalizes before lookup/insert
);
CREATE INDEX IF NOT EXISTS idx_skill_aliases_alias ON skill_aliases(alias);

-- Explicit prerequisite EDGES between skills (a real, curated graph, not
-- "interested in X implies has Y prerequisites"). required_level is the
-- MINIMUM mastery_probability (0-1) of the prerequisite skill a learner
-- should have before the dependent skill is considered "ready".
CREATE TABLE IF NOT EXISTS skill_prerequisites (
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  prerequisite_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  required_level NUMERIC NOT NULL DEFAULT 0.5 CHECK (required_level >= 0 AND required_level <= 1),
  PRIMARY KEY (skill_id, prerequisite_skill_id),
  CHECK (skill_id <> prerequisite_skill_id)
);

-- Per-skill mastery, replacing the single global current_level. One row per
-- (user_id, skill_id) - the current best estimate, recomputed whenever new
-- evidence arrives (see mastery_service.py). What PRODUCED the estimate is
-- summarized in evidence_source/evidence_note rather than kept as a
-- separate append-only audit table, to keep updates a plain upsert; the
-- real evidence itself still lives in its own source of truth (resumes,
-- feedback_events, github_repos_summary) if a fuller audit trail is ever
-- needed.
CREATE TABLE IF NOT EXISTS learner_skill_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  mastery_probability NUMERIC NOT NULL DEFAULT 0 CHECK (mastery_probability >= 0 AND mastery_probability <= 1),
  confidence NUMERIC NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  evidence_source TEXT NOT NULL CHECK (evidence_source IN ('resume','github','self_assessment','quiz','completion','feedback')),
  evidence_note TEXT DEFAULT '',
  target_level NUMERIC CHECK (target_level IS NULL OR (target_level >= 0 AND target_level <= 1)),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decay_version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (user_id, skill_id)
);
CREATE INDEX IF NOT EXISTS idx_learner_skill_mastery_user ON learner_skill_mastery(user_id);

ALTER TABLE learner_skill_mastery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own mastery" ON learner_skill_mastery;
CREATE POLICY "own mastery" ON learner_skill_mastery FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- skills/skill_aliases/skill_prerequisites are a shared reference taxonomy,
-- readable by any authenticated user (the app needs to map/display skill
-- names) - writable only via the service role (migrations/seeding), no
-- learner-facing mutation path exists for these.
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read skills" ON skills;
CREATE POLICY "read skills" ON skills FOR SELECT TO authenticated USING (true);

ALTER TABLE skill_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read skill aliases" ON skill_aliases;
CREATE POLICY "read skill aliases" ON skill_aliases FOR SELECT TO authenticated USING (true);

ALTER TABLE skill_prerequisites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read skill prerequisites" ON skill_prerequisites;
CREATE POLICY "read skill prerequisites" ON skill_prerequisites FOR SELECT TO authenticated USING (true);
