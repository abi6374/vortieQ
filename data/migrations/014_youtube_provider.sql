-- 014_youtube_provider.sql
--
-- Phase 3 continuation: YouTube Data API v3 as a second, official,
-- free-quota provider adapter (app/services/youtube_provider.py) - not a
-- paid course-provider integration, not scraping.
--
-- Adds real, field-level provenance columns that the existing
-- provider_resources/courses schema (migration 007) had no place for:
-- a provider-native external_id (for dedup by YouTube's own video ID,
-- independent of canonical_url - two different real videos can share
-- near-identical URLs after canonicalization is wrong in some edge case,
-- and the reverse: the same video can be reached by more than one URL
-- shape even after canonicalization misses something - the video ID is
-- the one truly stable identifier YouTube itself guarantees is unique),
-- channel identity (real provenance - "who published this"), publish
-- timestamp (real provenance - "when"), and a deterministic, auditable
-- quality score/reasons pair (never subscriber/view-count popularity
-- alone - see youtube_provider.py's quality policy).
--
-- Also widens provider_resources.format to allow 'playlist' - a real,
-- distinct resource type YouTube search can return that the existing
-- CHECK constraint (course/video/article/interactive/unknown) had no
-- slot for.
--
-- Purely additive and idempotent: every ADD COLUMN uses IF NOT EXISTS
-- with a safe NULL/default; the format CHECK is DROP+CREATE the same
-- constraint with one more allowed value (no existing row can violate
-- a widened constraint); the unique index is a partial index (WHERE
-- external_id IS NOT NULL) so it imposes nothing on existing seed rows
-- that have no external_id at all.
--
-- Rollback: `ALTER TABLE provider_resources DROP COLUMN IF EXISTS external_id,
-- DROP COLUMN IF EXISTS channel_id, DROP COLUMN IF EXISTS channel_title,
-- DROP COLUMN IF EXISTS published_at, DROP COLUMN IF EXISTS quality_score,
-- DROP COLUMN IF EXISTS quality_reasons; ALTER TABLE courses DROP COLUMN IF
-- EXISTS external_id, DROP COLUMN IF EXISTS channel_id, DROP COLUMN IF
-- EXISTS channel_title, DROP COLUMN IF EXISTS published_at; ALTER TABLE
-- provider_resources DROP CONSTRAINT IF EXISTS provider_resources_format_check;
-- ALTER TABLE provider_resources ADD CONSTRAINT provider_resources_format_check
-- CHECK (format IN ('course','video','article','interactive','unknown'));`
-- - safe at any time; nothing else depends on these columns existing
-- (application code treats their absence the same as NULL, never as an
-- error), except that any 'playlist'-format row would need to be
-- re-labeled first if the format CHECK is rolled back while one exists.

ALTER TABLE provider_resources
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS channel_id TEXT,
  ADD COLUMN IF NOT EXISTS channel_title TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC,
  ADD COLUMN IF NOT EXISTS quality_reasons JSONB DEFAULT '[]'::jsonb;

ALTER TABLE provider_resources DROP CONSTRAINT IF EXISTS provider_resources_format_check;
ALTER TABLE provider_resources ADD CONSTRAINT provider_resources_format_check
  CHECK (format IN ('course', 'video', 'article', 'interactive', 'playlist', 'unknown'));

-- Dedup by provider-native ID, scoped to (source, external_id) so a
-- YouTube video ID and some future different provider's ID scheme can
-- never collide with each other even in the (extremely unlikely) case
-- they happen to share a literal string.
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_resources_source_external_id
  ON provider_resources(source, external_id) WHERE external_id IS NOT NULL;

-- Same provenance fields carried onto courses (the promoted/recommendable
-- table) - "include freshness and provenance in recommendation
-- explanations" needs these to survive promotion, not just live in the
-- pre-promotion staging table.
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS channel_id TEXT,
  ADD COLUMN IF NOT EXISTS channel_title TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
