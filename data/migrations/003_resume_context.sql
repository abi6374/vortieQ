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

ALTER TABLE resumes
  ADD COLUMN IF NOT EXISTS education      TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS projects       TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS suggested_goal TEXT DEFAULT '';

-- Sanity check after running:
-- SELECT education, projects, suggested_goal FROM resumes LIMIT 5;
