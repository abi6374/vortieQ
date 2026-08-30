# Schema Reference

Generated as part of the database-reliability audit. Reflects the live
schema after applying `data/schema.sql` + `data/migrations/002`–`019` in
order. For the migration-by-migration history and rationale, see
[`../DATABASE_RELIABILITY_AUDIT.md`](../DATABASE_RELIABILITY_AUDIT.md).

## Setup prerequisites for a fresh deployment

1. **A Supabase project** (or self-hosted Supabase stack) with the
   following extensions available — `pgcrypto` and `uuid-ossp` are enabled
   by default on every new Supabase project and require no action;
   **`vector` (pgvector) is not always pre-enabled and must exist** before
   `schema.sql` runs — it's requested there via
   `CREATE EXTENSION IF NOT EXISTS vector;`, which requires the extension
   to be *available* on the Postgres instance (true for any standard
   Supabase project).
2. **Run, in order:** `data/schema.sql`, then every file in
   `data/migrations/` in filename order (`002` → `019`). Every migration
   is additive and idempotent — safe to re-run, safe to run against an
   already-migrated database.
3. **Before creating `018_study_sessions_uniqueness.sql`'s unique index**
   on an existing database with real data: run
   `python -m scripts.db_maintenance --report --only dedupe_study_sessions`
   to check for pre-existing duplicate `task_completed` rows, and
   `--apply` if any are found. A fresh database has zero rows and needs no
   such step.
4. **Two required environment secrets** for the backend to start at all:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (plus `SUPABASE_ANON_KEY`,
   `SUPABASE_JWT_SECRET`, `GROQ_API_KEY` — see `backend/.env.example`).
5. **A Storage bucket named `resumes`** (private, `public: false`) with the
   4 object-level RLS policies — created by
   `016_integrity_hardening.sql`'s `INSERT INTO storage.buckets ...`
   statement; no separate manual dashboard step needed.
6. **Seed data**: `data/courses_raw.csv` via `data/seed_courses.py` (course
   catalog + embeddings) and `010_seed_skills_taxonomy.sql` (canonical
   skills/aliases/prerequisites) are both idempotent
   (`ON CONFLICT DO NOTHING` / dedup-by-title) and safe to run once.

## Tables

Ownership model: every per-user table is scoped by RLS to
`auth.uid() = user_id` (or a join through the owning row for child tables).
The backend always connects with the **service-role key**, which bypasses
RLS entirely — RLS is the last line of defense against a frontend that
somehow talked to Supabase directly with the anon key, not the primary
authorization mechanism (every route also does an explicit ownership check
in Python; see `backend/SECURITY_AUDIT_PHASE4.md`).

| Table | RLS | Purpose |
|---|---|---|
| `profiles` | own row only | Learner profile: goal, level, interests, resume-derived fields, GitHub link |
| `courses` | **public read**, service-role write | The recommendable catalog — seed rows (`source='seed'`) and dynamically-ingested rows (`source='provider_resource'`) |
| `learning_paths` | own row only | One row per generated path; `status` ∈ `active`/`completed`/`archived`; `version`/`last_recomputed_at` for freshness |
| `path_steps` | via owning `learning_paths` | Individual steps; `sequence_order` unique per path (deferrable); `week_number`/`part_*` for the week-splitting model |
| `feedback_events` | own row only | Audit log of every completion/too_easy/too_hard/not_interested/resource_unavailable event |
| `resumes` | own row only | One row per uploaded resume; the file itself lives in the `resumes` Storage bucket at `{user_id}/{filename}` |
| `ai_conversations` / `ai_messages` | own row only | The single shared AI-coach chat thread per user |
| `user_settings` | own row only | Per-user preferences (weekly hours, difficulty preference, notification toggles) |
| `study_sessions` | own row only | Real study-time log; streak and total-minutes stats are derived from this, never a separate counter |
| `skills` / `skill_aliases` / `skill_prerequisites` | **read for any authenticated user**, service-role write | Shared canonical taxonomy — no learner-facing mutation path exists |
| `learner_skill_mastery` | own row only | One row per `(user_id, skill_id)`; the current best mastery estimate, combined via `upsert_mastery_evidence()` |
| `provider_resources` | **read for any authenticated user**, service-role write | Raw ingested record from a real source (web search or YouTube), pre-verification |
| `resource_verification` | **read for any authenticated user**, service-role write | Independent HTTPS/domain/reachability check run before promotion |
| `recommendation_runs` / `recommendation_explanations` | own row only | Audit trail of every recommendation decision — candidates, scores, what was chosen and why |
| `rate_limit_hits` | **RLS enabled, no policies** (service-role only) | Ephemeral rate-limit bookkeeping |
| `idempotency_keys` | **RLS enabled, no policies** (service-role only) | Cached mutation responses for `Idempotency-Key` replay; `request_hash` detects payload mismatch, `expires_at` bounds retention |
| `interview_sessions` / `interview_qa_records` | own row (via session) | AI mock-interview session + per-question transcripts/evaluations |
| `user_hackathons` / `user_internships` | own row only | Persistent application/registration tracking |
| `internships` | **read for any authenticated user**, service-role write | Cached Greenhouse-fetched internship listings |

## Functions

| Function | Kind | Notes |
|---|---|---|
| `match_courses(query_embedding, match_count)` | `SQL STABLE` | pgvector similarity search |
| `update_updated_at()` | `plpgsql` trigger fn | Generic `updated_at = now()` on UPDATE (`profiles`, `user_settings`) |
| `update_updated_at_column()` | `plpgsql` trigger fn | Same purpose, separate fn from migration 015 (`user_hackathons`/`user_internships`/`internships`) — two functions doing the same thing is pre-existing duplication, harmless, not consolidated in this pass to avoid an unrelated risk |
| `touch_path_step()` | `plpgsql` trigger fn | Maintains `path_steps.updated_at`/`completed_at` |
| `create_learning_path_with_steps` | `plpgsql` RPC | Atomic path+steps creation (§3 of the audit report) |
| `bump_path_version` | `plpgsql` RPC | Atomic version increment |
| `swap_path_step` | `plpgsql` RPC | Atomic single-step swap |
| `rebuild_path_tail` | `plpgsql` RPC | Atomic not-started-tail rebuild |
| `upsert_mastery_evidence` | `plpgsql` RPC | Atomic confidence-weighted mastery combine+write |
| `set_course_completion_flag` | `plpgsql` RPC | Atomic `completed_courses` array add/remove |

All 6 RPCs are `SECURITY INVOKER` with `EXECUTE` revoked from
`PUBLIC`/`anon`/`authenticated` and granted only to `service_role` — see
the audit report §3 for why.

## Known, accepted, out-of-scope findings

- `vector` extension is installed in the `public` schema (Supabase advisor:
  `extension_in_public`) — pre-existing; moving it requires recreating the
  extension and is a real risk to the `courses.embedding` column. Not
  touched in this pass.
- Auth "leaked password protection" is disabled (Supabase advisor:
  `auth_leaked_password_protection`) — an Auth dashboard toggle, not a
  schema change. Recommended as a manual follow-up.
- Two functions (`update_updated_at` and `update_updated_at_column`) do the
  same thing under different names, from two different points in this
  project's history. Harmless duplication; not consolidated here to avoid
  touching working trigger wiring for a purely cosmetic gain.
