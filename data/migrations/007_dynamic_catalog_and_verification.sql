-- Migration 007: real catalog provenance + independent verification record.
--
-- provider_resources is the RAW ingested record from a real source. Honest
-- scope note: this deployment has no paid course-provider partner API
-- credentials (Coursera/edX/Udemy partner programs etc.) - the real,
-- non-seeded, LIVE source actually available is the app's own web search
-- (web_search_service.py, DuckDuckGo-backed). Formalizing that as a
-- first-class "provider adapter" with real provenance/validation/dedup is
-- the honest version of "dynamic catalog ingestion" achievable here,
-- versus a fabricated integration this project can't actually run.
-- resource_verification is the independent check (HTTPS, domain, live
-- reachability - see catalog_service.validate_resource_url, promoted from
-- path_service._validate_resource_url) run before a provider_resource is
-- ever promoted into `courses`.

CREATE TABLE IF NOT EXISTS provider_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,               -- 'web_search' | 'seed'
  provider TEXT,                      -- e.g. 'freeCodeCamp', 'NPTEL'
  canonical_url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  skill_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  difficulty TEXT CHECK (difficulty IS NULL OR difficulty IN ('beginner','intermediate','advanced')),
  duration_hrs NUMERIC,
  language TEXT DEFAULT 'en',
  cost TEXT DEFAULT 'unknown' CHECK (cost IN ('free','paid','unknown')),
  format TEXT DEFAULT 'unknown' CHECK (format IN ('course','video','article','interactive','unknown')),
  rating NUMERIC,
  availability_status TEXT NOT NULL DEFAULT 'unverified' CHECK (availability_status IN ('unverified','available','unavailable','stale')),
  last_checked_at TIMESTAMPTZ,
  promoted_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_provider_resources_availability ON provider_resources(availability_status);

CREATE TABLE IF NOT EXISTS resource_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_resource_id UUID NOT NULL REFERENCES provider_resources(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  https_ok BOOLEAN NOT NULL,
  domain_allowed BOOLEAN NOT NULL,
  reachable BOOLEAN NOT NULL,
  http_status INTEGER,
  passed BOOLEAN NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_resource_verification_resource ON resource_verification(provider_resource_id);

-- Provenance on the courses table itself - a course row (seed or
-- dynamically promoted) now records WHERE it came from and when it was
-- last verified, instead of seed vs. dynamic data being indistinguishable.
-- Existing 80 seed rows correctly default to source='seed',
-- availability_status='available' (they were curated at launch, not
-- verified via this new pipeline retroactively - true statement about
-- their actual provenance).
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'seed' CHECK (source IN ('seed','provider_resource')),
  ADD COLUMN IF NOT EXISTS provider_resource_id UUID REFERENCES provider_resources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available','unavailable','stale'));

ALTER TABLE provider_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read provider resources" ON provider_resources;
CREATE POLICY "read provider resources" ON provider_resources FOR SELECT TO authenticated USING (true);

ALTER TABLE resource_verification ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read resource verification" ON resource_verification;
CREATE POLICY "read resource verification" ON resource_verification FOR SELECT TO authenticated USING (true);
