-- 013_trusted_provider_flag.sql
--
-- Phase 3 continuation: dynamic resource catalog hardening.
--
-- Adds a real, persisted "is this from our trusted-provider allowlist"
-- flag to provider_resources and courses (catalog_service.
-- TRUSTED_PROVIDER_DOMAINS / is_trusted_provider_domain()). Previously
-- this trust signal, once computed, had nowhere to live - it would have
-- been a function callers compute ad hoc and immediately discard, the
-- same "built but never actually wired to anything persistent" pattern
-- already found and fixed elsewhere this session (too_easy mastery
-- evidence, idempotency keys). Field-level provenance ("store field-level
-- provenance" from the audit) means this belongs on the row, not just in
-- a code comment.
--
-- Purely additive: ADD COLUMN IF NOT EXISTS with a safe default (false) -
-- no existing row's meaning changes (an existing row simply hasn't been
-- backfilled yet, which is honest: we don't retroactively know without
-- re-checking, so we don't guess true).
--
-- Rollback: `ALTER TABLE provider_resources DROP COLUMN IF EXISTS is_trusted_domain;
-- ALTER TABLE courses DROP COLUMN IF EXISTS is_trusted_domain;` - safe at
-- any time, nothing else depends on this column existing (application
-- code treats a missing/false value identically - "not known to be
-- trusted" - never as an error).

ALTER TABLE provider_resources ADD COLUMN IF NOT EXISTS is_trusted_domain BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_trusted_domain BOOLEAN NOT NULL DEFAULT false;
