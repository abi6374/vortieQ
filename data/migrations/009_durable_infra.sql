-- Migration 009: Postgres-backed rate limiting + idempotency keys.
--
-- Honest scope note: this deployment has no Redis/shared-cache instance
-- provisioned (single EC2 container; no infra-provisioning access in this
-- engagement to stand one up). Postgres - already the durable,
-- already-provisioned store - is the real substitute for "Redis or another
-- shared durable store": it satisfies the actual requirement (state
-- survives a container restart, and would work correctly if this app were
-- ever scaled to multiple instances, unlike the in-memory dict it
-- replaces), just with higher per-check latency than a real in-memory
-- cache. If Redis is provisioned later, rate_limit.py's _check() is the
-- only function that needs to change.

CREATE TABLE IF NOT EXISTS rate_limit_hits (
  id BIGSERIAL PRIMARY KEY,
  bucket_key TEXT NOT NULL,   -- "{route_name}:{user_id}"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_bucket_time ON rate_limit_hits(bucket_key, created_at);
-- No RLS/FK: service-role-only bookkeeping table, never read or written
-- through a learner-facing policy.

CREATE TABLE IF NOT EXISTS idempotency_keys (
  idempotency_key TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route TEXT NOT NULL,
  response_status INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user ON idempotency_keys(user_id, created_at);
