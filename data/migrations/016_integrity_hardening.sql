-- 016_integrity_hardening.sql
--
-- Database-reliability audit pass. Every finding below was confirmed by
-- reading the live schema (via Supabase's own migration history and
-- information_schema), not assumed. Purely additive; every statement is
-- IF NOT EXISTS / IF EXISTS / DROP-then-CREATE guarded, so this is safe to
-- run once on a fresh database and safe to re-run on the current live one
-- (every fix here has already been verified against the live project
-- before being written as a migration file).
--
-- ── Part 1: schema that existed live but was never captured in any
-- committed migration (confirmed via supabase_migrations.schema_migrations,
-- which recorded 9 migrations applied directly against the live project
-- that have no corresponding file in this directory) ────────────────────────

-- `courses` is a shared, non-per-user catalog table - schema.sql created it
-- but never enabled RLS on it at all (RLS was turned on live separately,
-- migration name "enable_rls_courses_public_read", never committed). Public
-- SELECT is correct here: every authenticated learner needs to read the
-- whole catalog to get recommendations; only the service-role backend ever
-- writes to it.
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read" ON public.courses;
CREATE POLICY "public read" ON public.courses FOR SELECT USING (true);

-- path_steps: a real trigger that keeps updated_at honest and mirrors
-- completed_at to the status transition, applied live (migration name
-- "add_week_model_to_path_steps") but never committed. Code that reads
-- path_steps.completed_at (streak/progress calculations) has been relying
-- on this trigger's existence in production without it ever being in a
-- file a fresh deploy would run.
CREATE OR REPLACE FUNCTION public.touch_path_step()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status <> 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS path_steps_touch ON public.path_steps;
CREATE TRIGGER path_steps_touch
  BEFORE UPDATE ON public.path_steps
  FOR EACH ROW EXECUTE FUNCTION public.touch_path_step();

CREATE INDEX IF NOT EXISTS path_steps_week_idx
  ON public.path_steps (path_id, week_number, sequence_order);

-- user_settings: an updated_at trigger applied live but never committed.
-- Postgres has no CREATE TRIGGER IF NOT EXISTS - DROP-then-CREATE is the
-- idempotent equivalent, same pattern used throughout this migration series.
DROP TRIGGER IF EXISTS user_settings_updated_at ON public.user_settings;
CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- study_sessions / ai_messages: query-pattern indexes applied live
-- ("add_user_settings_and_study_sessions", "add_ai_conversations_and_
-- messages") but never committed.
CREATE INDEX IF NOT EXISTS study_sessions_user_date_idx
  ON public.study_sessions (user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS ai_messages_convo_idx
  ON public.ai_messages (conversation_id, created_at);

-- ── Part 2: a table referenced by real, shipped backend code
-- (app/services/internship_service.py's _upsert_to_supabase/
-- _load_from_supabase/get_internship_by_id) that has never existed in this
-- database at all - every one of those calls has been silently failing
-- (caught, logged as a warning, degrading to the in-memory Greenhouse-API
-- fetch) since the feature was written. Not a new feature: this creates
-- exactly the table the existing code already expects, in the shape it
-- already upserts (id is a pre-computed md5 hex string, not a UUID -
-- matches _normalize_greenhouse_job's real "id" field; external_id must be
-- UNIQUE or the code's `.upsert(..., on_conflict="external_id")` call would
-- fail outright with "there is no unique or exclusion constraint matching
-- the ON CONFLICT specification").
CREATE TABLE IF NOT EXISTS public.internships (
  id                 TEXT PRIMARY KEY,
  external_id        TEXT NOT NULL UNIQUE,
  source             TEXT NOT NULL DEFAULT 'greenhouse',
  title              TEXT NOT NULL,
  company            TEXT,
  location           TEXT,
  is_remote          BOOLEAN DEFAULT false,
  duration           TEXT,
  stipend            TEXT,
  skills_required    JSONB DEFAULT '[]'::jsonb,
  apply_by           TEXT,
  description        TEXT,
  apply_url          TEXT,
  categories         JSONB DEFAULT '[]'::jsonb,
  published_at       TEXT,
  status             TEXT DEFAULT 'open',
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_internships_published_at ON public.internships (published_at DESC);

-- Shared read-only reference data (same trust model as `courses`): every
-- authenticated learner reads the live internship list; only the
-- service-role backend's Greenhouse-fetch cache job writes to it.
ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read internships" ON public.internships;
CREATE POLICY "read internships" ON public.internships FOR SELECT TO authenticated USING (true);

DROP TRIGGER IF EXISTS internships_updated_at ON public.internships;
CREATE TRIGGER internships_updated_at
  BEFORE UPDATE ON public.internships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Part 3: the Supabase Storage bucket + object policies resume uploads
-- actually depend on. profile.py's upload_resume/get_resume_file write to
-- and read from the `resumes` bucket; migration 005_schema_reconciliation
-- created the resumes TABLE, but the STORAGE bucket and its access
-- policies were created live only ("add_resumes_table_and_storage_
-- policies") and never committed - a fresh deployment's Storage would have
-- no `resumes` bucket at all, and resume upload would fail with a
-- confusing "bucket not found" error with no migration to explain why.
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: every object is stored at "{user_id}/{filename}" (see
-- resume_service.py) - split_part(name, '/', 1) recovers the owning user_id
-- from the object path itself, since storage.objects has no user_id column
-- of its own. The service-role key (this backend) bypasses these entirely;
-- they only constrain what the anon/authenticated frontend key could do if
-- it ever talked to Storage directly.
DROP POLICY IF EXISTS "own resume files read" ON storage.objects;
CREATE POLICY "own resume files read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resumes' AND auth.uid()::text = split_part(name, '/', 1)
  );

DROP POLICY IF EXISTS "own resume files write" ON storage.objects;
CREATE POLICY "own resume files write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resumes' AND auth.uid()::text = split_part(name, '/', 1)
  );

DROP POLICY IF EXISTS "own resume files update" ON storage.objects;
CREATE POLICY "own resume files update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'resumes' AND auth.uid()::text = split_part(name, '/', 1)
  );

DROP POLICY IF EXISTS "own resume files delete" ON storage.objects;
CREATE POLICY "own resume files delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'resumes' AND auth.uid()::text = split_part(name, '/', 1)
  );

-- ── Part 4: critical - RLS was disabled on two service-role-only tables.
-- Confirmed live via Supabase's own security advisor: "anyone with the anon
-- key can read or modify every row" in rate_limit_hits and idempotency_keys.
-- The original migration 009 comment's reasoning ("service-role-only
-- bookkeeping table, never read or written through a learner-facing
-- policy") was WRONG for a Supabase deployment - RLS being disabled means
-- the PostgREST API exposes the table to the anon/authenticated roles
-- regardless of whether the APPLICATION ever queries it that way; anyone
-- with the publishable anon key could call the REST API directly. Enabling
-- RLS with ZERO policies is the correct fix for a table that should be
-- service-role-only: it blocks anon/authenticated entirely (no policy ->
-- no access) while the backend's service-role key, which always bypasses
-- RLS, keeps working exactly as before. idempotency_keys is the more
-- serious of the two: it stores full cached response bodies, which can
-- contain another user's data.
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- ── Part 5: idempotency_keys was missing the two columns its own docstring
-- (idempotency_service.py) claims exist: a request hash (to detect a key
-- being reused for a DIFFERENT request body - without this, two different
-- payloads sharing one key would silently replay the FIRST response,
-- masquerading as correct idempotency) and an expiry (so the table doesn't
-- grow forever - see the new maintenance script for cleanup of expired
-- rows).
ALTER TABLE public.idempotency_keys
  ADD COLUMN IF NOT EXISTS request_hash TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days');
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON public.idempotency_keys (expires_at);

-- ── Part 6: integrity constraints named explicitly in the reliability audit
-- ("protect canonical resource URLs, path step ordering, ... recommendation
-- run provenance", "prevent orphaned records", "only valid enum/status
-- values") ──────────────────────────────────────────────────────────────────

-- Path step ordering: nothing before this stopped two steps in the same
-- path from sharing a sequence_order (confirmed no such constraint exists
-- anywhere in the prior 15 migrations). DEFERRABLE INITIALLY DEFERRED is
-- required, not cosmetic: a "shift everything after position N by +1" bulk
-- UPDATE (see the new swap_path_step() RPC in 017) touches many rows in one
-- statement, and Postgres does not guarantee an order that avoids a
-- transient duplicate mid-statement unless uniqueness is checked at
-- COMMIT/end-of-statement instead of per-row.
ALTER TABLE public.path_steps DROP CONSTRAINT IF EXISTS path_steps_path_seq_uniq;
ALTER TABLE public.path_steps
  ADD CONSTRAINT path_steps_path_seq_uniq UNIQUE (path_id, sequence_order) DEFERRABLE INITIALLY DEFERRED;

-- Canonical resource URLs: `courses.resource_url` had no uniqueness at all.
-- Confirmed live duplicates already exist for 3 distinct, legitimately
-- different seed courses that happen to share an overly generic provider
-- landing-page URL (e.g. freecodecamp.org/learn) - those are a real seed-
-- data quality issue, not the bug this fixes, and must not be broken by a
-- blanket constraint (see the maintenance script's report-only duplicate-
-- resource check for that case instead). The actual confirmed, live BUG
-- this closes is a genuine race in path_service._ensure_course_in_catalog:
-- it does a SELECT-then-INSERT check for an existing row by resource_url,
-- and two concurrent swap/rerecommend requests (plausibly from two
-- different users independently getting the same freshly-found web/YouTube
-- result recommended) can both see "not found" and both INSERT, producing
-- a real duplicate for a dynamically-ingested resource. Scoping the unique
-- index to source='provider_resource' protects exactly that path without
-- touching the pre-existing, different seed-data situation.
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_resource_url_provider_uniq
  ON public.courses (resource_url)
  WHERE source = 'provider_resource' AND resource_url IS NOT NULL AND resource_url <> '';

-- Recommendation run provenance: `trigger` was a bare TEXT despite the
-- migration 008 comment itself naming exactly 3 valid values.
ALTER TABLE public.recommendation_runs DROP CONSTRAINT IF EXISTS recommendation_runs_trigger_check;
ALTER TABLE public.recommendation_runs
  ADD CONSTRAINT recommendation_runs_trigger_check
  CHECK (trigger IN ('path_generate', 'swap', 'rerecommend'));

-- Learner event uniqueness (study_sessions dedup): see
-- 018_study_sessions_uniqueness.sql. Split into its own migration on
-- purpose - confirmed live duplicates (one real account has 8 rows logged
-- for a single step from repeated complete/uncomplete toggling) must be
-- removed by scripts/db_maintenance.py's dedupe_study_sessions check
-- BEFORE a unique index over that data can be created (Postgres refuses a
-- unique index over data that already violates it). A fresh database has
-- zero rows and needs no such ordering.

