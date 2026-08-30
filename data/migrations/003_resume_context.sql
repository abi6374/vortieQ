-- Migration 003: real resume context beyond just skills.
--
-- Context: the "AI Profile Draft" the learner sees after uploading a resume
-- previously only ever showed extracted skills - Education & Background,
-- Projects mentioned, and Career goals & Target stayed permanently blank
-- because the backend never extracted them. This adds storage for those
-- three real, resume-grounded fields so a returning learner's previous
-- resume can be reused with the full draft, not just their skills.
--
-- Safe to run on the live DB: purely additive, all nullable/defaulted so
-- every existing row is unaffected. Application code (backend/app/routers/
-- profile.py) detects whether these columns exist yet and degrades
-- gracefully (skips persisting/reusing them) if this hasn't been run -
-- nothing breaks either way, the resume upload flow just won't persist
-- these 3 fields for reuse until this migration is applied.
--
-- Fresh-database ordering fix (database-reliability audit): this migration
-- ALTERs a `resumes` table that migration 005_schema_reconciliation.sql is
-- the one that actually CREATEs (that table only ever existed live via a
-- separate, uncommitted migration - see 005_schema_reconciliation.sql's own
-- header). On the real live database `resumes` already existed by the time
-- this ran, so the ALTER always worked there - but replaying the committed
-- migration files in order against a brand-new, empty database hits this
-- file before 005 has created the table at all, and the ALTER fails
-- outright. Creating the base table here too (idempotent, and a strict
-- subset of what 005_schema_reconciliation.sql creates) makes this file
-- self-sufficient on a fresh database while remaining a total no-op
-- against the already-migrated live one.
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  extracted_topics JSONB DEFAULT '[]'::jsonb,
  detected_years_experience INTEGER DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE resumes
  ADD COLUMN IF NOT EXISTS education      TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS projects       TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS suggested_goal TEXT DEFAULT '';

-- Sanity check after running:
-- SELECT education, projects, suggested_goal FROM resumes LIMIT 5;
