# Database Reliability Audit

**Scope:** make the database schema, migrations, path mutations, recovery
behavior, and data lifecycle production-safe, reproducible, and auditable —
without adding new provider adapters or unrelated product features.

**Method:** every finding below was confirmed against the real, live
database (via `information_schema`, Supabase's own migration history table
`supabase_migrations.schema_migrations`, and direct data queries) before
being treated as a fact, never assumed from filenames or comments alone.
Every fix was verified either by a rolled-back dry-run against the live
schema, a real functional test against the live database with immediate
cleanup, or a mocked pytest test — see **Test results** below for exactly
which method covered which claim.

---

## 1. Migration audit

### 1.1 The core finding: 9 live migrations were never committed as files

Querying `supabase_migrations.schema_migrations` directly (the source of
truth for what has actually been applied to the live project) revealed 9
migrations applied via direct dashboard/API access that have **no
corresponding file** anywhere in this repository:

| Live migration name | What it did | Committed? |
|---|---|---|
| `enable_rls_courses_public_read` | Enabled RLS + public-read policy on `courses` | ❌ never committed |
| `add_provider_to_match_courses` | Fixed `match_courses()` to return `provider` | ✅ superseded — committed `schema.sql` already includes this |
| `add_resumes_table_and_storage_policies` | Created `resumes` table + the `resumes` Storage bucket + 4 object policies | ⚠️ table later re-covered by `005_schema_reconciliation.sql`; the **Storage bucket and its policies were never committed at all** |
| `cascade_feedback_events_on_user_delete` | Fixed a missing `ON DELETE CASCADE` | ✅ superseded — committed `schema.sql` already has this |
| `add_ai_conversations_and_messages` | Created `ai_conversations`/`ai_messages` + 2 indexes | ⚠️ tables later re-covered; **`ai_messages_convo_idx` index was never committed** |
| `add_week_model_to_path_steps` | Added `week_number`/`completed_at`/`updated_at`, **a real trigger (`touch_path_step`) that auto-maintains them**, an index, and a one-time backfill | ❌ **the trigger and index were never committed at all** — production has been relying on a trigger that a fresh deploy would never create |
| `rebackfill_contiguous_week_numbers` | A one-time data-repair backfill for `week_number` | N/A — historical data fix, not schema; not applicable to a fresh DB |
| `add_user_settings_and_study_sessions` | Created `user_settings`/`study_sessions` + an index + an `updated_at` trigger + a backfill | ⚠️ tables later re-covered; **the index and the trigger were never committed** |
| `schema_and_rls_patch` | RLS policy restatement + FK fixes + indexes | ✅ superseded — committed `005_schema_reconciliation.sql` already covers this |

**Root cause of "a clean database could not be reproduced from what was
committed":** confirmed, concrete, and now fixed in
[`016_integrity_hardening.sql`](../data/migrations/016_integrity_hardening.sql):
RLS on `courses`, the `touch_path_step` trigger + index, the `user_settings`
trigger, the `study_sessions`/`ai_messages` indexes, and — the most
operationally serious gap — the `resumes` Storage bucket and its 4 object
policies, without which resume upload on a fresh deployment would fail with
an opaque "bucket not found" error and no migration explaining why.

### 1.2 A genuine fresh-database ordering bug

Replaying the committed files in filename order (`002` → `003` → `004` →
`005_interview_sessions` → `005_schema_reconciliation` → `006`…`015`) fails
outright on a truly empty database: **`003_resume_context.sql` `ALTER`s a
`resumes` table that doesn't exist yet** — the table is only ever created by
`005_schema_reconciliation.sql`, which runs later in the sequence.

This never broke the *live* database (there, `resumes` already existed via
the uncommitted `add_resumes_table_and_storage_policies` migration before
`003` ever ran), which is exactly why it went undetected. Fixed by making
`003_resume_context.sql` self-sufficient — it now creates the base table
(idempotent `CREATE TABLE IF NOT EXISTS`, a strict subset of what
`005_schema_reconciliation.sql` creates) before altering it, a total no-op
against the already-migrated live database and a genuine fix for a fresh
one.

### 1.3 A duplicate, misnumbered migration file

[`backend/migrations/001_create_tracking_tables.sql`](../migrations/001_create_tracking_tables.sql)
was byte-for-byte the same table/trigger/policy definitions as
[`data/migrations/015_hackathon_internship_tracking.sql`](../data/migrations/015_hackathon_internship_tracking.sql),
living in a second, untracked migrations directory, numbered "001" despite
being created after everything else. Removed — `data/migrations/` is now
the single canonical migration directory, confirmed via grep that nothing
else in the repository referenced the `backend/migrations/` path.

### 1.4 A table referenced by shipped code that has never existed

`app/services/internship_service.py`'s `_upsert_to_supabase` /
`_load_from_supabase` / `get_internship_by_id` all call
`.table("internships")` — a table that does not exist in the live database
at all. Every call has been silently failing (caught, logged as a warning)
since the feature was written; the feature still works in practice because
the live Greenhouse API fetch succeeds on almost every call and the
Supabase write/read is only ever a best-effort cache. Not a new feature:
[`016_integrity_hardening.sql`](../data/migrations/016_integrity_hardening.sql)
creates exactly the table the existing code already expects — `id` as
`TEXT` (matching the code's pre-computed MD5-hex id, not a `UUID`), and
`external_id UNIQUE` (required for the code's existing
`.upsert(..., on_conflict="external_id")` call to work at all).

### 1.5 Migration audit summary table

| # | File | Status |
|---|---|---|
| — | `data/schema.sql` | base schema — unedited, historically accurate |
| 002–015 | `data/migrations/*.sql` | reviewed line by line; all additive and idempotent except the `003` ordering bug (fixed in place, see 1.2) |
| 016 | `016_integrity_hardening.sql` | **new** — the 9 uncommitted-migration gaps (1.1), the `internships` table (1.4), RLS enabled on `rate_limit_hits`/`idempotency_keys` (2.1), new constraints (§2) |
| 017 | `017_transactional_rpcs.sql` | **new** — 6 atomic RPC functions (§3) |
| 018 | `018_study_sessions_uniqueness.sql` | **new** — split out from 016 because it depends on a live-data dedup running first (§4) |
| 019 | `019_pin_function_search_paths.sql` | **new** — closes a `function_search_path_mutable` advisor finding surfaced by applying 016/017 |

**Fresh-database reproducibility:** every statement across `schema.sql` and
`002`–`019` was re-run against the live (already-migrated) database wrapped
in `BEGIN; … ROLLBACK;` and separately confirmed to complete with zero
errors — proving both "applies cleanly to an unseen target" (the live DB,
from `016` onward, was unseen by these exact statements before this audit)
and "safe to re-run" (the whole set was replayed a second time after real
application, again with zero errors). A from-empty-database branch replay
was the more rigorous test originally planned for this — see **Infrastructure
gaps** for why that specific method wasn't available and what was done
instead.

---

## 2. Integrity constraints added

All in [`016_integrity_hardening.sql`](../data/migrations/016_integrity_hardening.sql)
and [`018_study_sessions_uniqueness.sql`](../data/migrations/018_study_sessions_uniqueness.sql),
every one verified live to actually reject bad data (see **Test results**):

| Constraint | Table | Protects |
|---|---|---|
| `ENABLE ROW LEVEL SECURITY` (no policies) | `rate_limit_hits`, `idempotency_keys` | **Critical, flagged by Supabase's own advisor**: both tables were fully readable/writable by anyone holding the anon key. `idempotency_keys` stores cached response bodies — could have leaked another user's data. |
| `UNIQUE (path_id, sequence_order) DEFERRABLE INITIALLY DEFERRED` | `path_steps` | Path step ordering — nothing before this stopped two steps in the same path sharing a position |
| `UNIQUE (resource_url) WHERE source='provider_resource'` | `courses` | Canonical resource URLs — closes a confirmed race in `_ensure_course_in_catalog` (§3) |
| `CHECK (trigger IN ('path_generate','swap','rerecommend'))` | `recommendation_runs` | Recommendation run provenance — was a bare `TEXT` despite the original migration's own comment naming exactly 3 valid values |
| `UNIQUE (user_id, step_id) WHERE activity='task_completed'` | `study_sessions` | Learner event uniqueness — confirmed live bug: repeated complete/uncomplete toggling logged unbounded duplicate rows, inflating the learner-visible `minutes_total` stat |
| `request_hash`, `expires_at` columns | `idempotency_keys` | Idempotency-record integrity — a key reused for a *different* payload now gets a 409 instead of silently replaying the first response; rows now expire instead of growing forever |

**Explicitly not added:** a blanket `UNIQUE(resource_url)` on `courses`
without the `source='provider_resource'` scope. Live data has 3 groups of
genuinely different seed courses sharing an overly generic provider
landing-page URL (e.g. 3 distinct courses all pointing at
`https://www.freecodecamp.org/learn`) — a real, pre-existing seed-data
quality issue, not the race this fixes. A blanket constraint would have
either failed to apply or forced a destructive merge of real, distinct
catalog rows. See `scripts/db_maintenance.py`'s `duplicate_courses` check
for how this is handled instead (report + quarantine, never auto-merge
across different titles).

---

## 3. Transactional path state — 6 atomic RPC functions

All Supabase Python calls are individual PostgREST requests; there is no
multi-statement transaction the client SDK can express. Every multi-step
mutation in this codebase was, before this audit, a *sequence* of
independent calls — a crash or timeout between any two of them left
whatever the first call had already committed. Confirmed, concrete failure
modes closed by
[`017_transactional_rpcs.sql`](../data/migrations/017_transactional_rpcs.sql):

| RPC | Replaces | Real failure mode closed |
|---|---|---|
| `create_learning_path_with_steps` | `path_service.generate_path`'s archive-UPDATE + insert-path + N×insert-step loop | A crash partway through the step-insert loop left an `active` path with only some of its steps, served to the learner as if complete |
| `swap_path_step` | `path_service.swap_step`'s N sequential per-row sequence-bump UPDATEs + separate skip-UPDATE + separate insert | A crash mid-loop left duplicate or gapped `sequence_order` values with no step actually replaced |
| `bump_path_version` | `roadmap_service.bump_path_version`'s SELECT-then-compute-then-UPDATE | **Confirmed and reproduced live**: a classic lost-update race — see Test results, 20 concurrent calls under the old pattern reached version 5 instead of 21 |
| `upsert_mastery_evidence` | `mastery_service._upsert_mastery`'s SELECT-then-combine-then-UPSERT | The same lost-update race pattern, on learner mastery evidence — two concurrent evidence writes for the same skill (e.g. resume + GitHub analysis both completing during onboarding) could silently clobber each other |
| `rebuild_path_tail` | `feedback_service._regenerate_tail`'s delete-tail-FIRST, insert-replacements-after | The function's own old comment admitted the failure mode: "tail already deleted, but the frontend will just render fewer steps" — a real, accepted data-loss risk. Now every LLM/network call happens *before* any DB write; the delete+insert happen together, atomically, only once a valid replacement exists |
| `set_course_completion_flag` | `roadmap_service`/`feedback_service`'s SELECT-array-modify-UPDATE on `profiles.completed_courses` | The same lost-update race pattern on the completed-courses array |

**Security on the RPCs:** every function is `SECURITY INVOKER` (the
Postgres default — no `SECURITY DEFINER` anywhere), since the backend
always calls them with the service-role key, which already has full table
access. Because Postgres grants `EXECUTE` on a new function to `PUBLIC` by
default and Supabase's PostgREST layer auto-exposes every `public`-schema
function as an RPC endpoint, every function explicitly `REVOKE`s
`PUBLIC`/`anon`/`authenticated` and grants only `service_role` — without
this, the frontend's anon key could have called these mutation functions
directly, bypassing every ownership/auth check that lives in the Python
layer.

**Not converted to an RPC, deliberately:** `roadmap_service.
assign_week_numbers` (the week/part-splitting re-planner). It has real
branching logic (collapse pending rows, clone/drop "part N of M" rows) that
would be a substantial, risky rewrite to port into PL/pgSQL without
extensive regression testing — out of proportion to this pass given it is
**naturally idempotent and self-healing**: it always recomputes the full
plan from current `path_steps` state rather than incrementally patching, so
a crash mid-call is a temporary inconsistency automatically corrected the
next time the function runs (the next `weekly_hours` change, or a manual
retry), not a permanent corruption. `feedback_service.apply_recent_feedback`
was also left as sequential per-row updates: each row update is
independently atomic, and a partial application ("some steps adapted, some
not") is a graceful degradation, not the duplicate/orphaned/inconsistent
states this audit's failure modes describe.

---

## 4. Legacy data maintenance — `scripts/db_maintenance.py`

Dry-run by default (`--report`), every fix opt-in via `--apply`. Never
deletes real learner history; quarantines (an `availability_status` flag
change) rather than deletes anything uncertain.

| Check | Category | Action on `--apply` |
|---|---|---|
| `stale_resources` | invalid/untrusted/stale resources | report-only, never mutates |
| `backfill_path_freshness` | old paths with missing version/freshness data | backfills `version=1`, `last_recomputed_at=generated_at` (never a fabricated timestamp) |
| `malformed_mastery` | malformed mastery evidence | report-only, never mutates |
| `duplicate_courses` | duplicate canonical resources | quarantines (marks `stale`) only when **both** `resource_url` and `title` match; anything with a differing title is reported for human review only, never touched |
| `orphaned_provider_resources` | orphaned provider/catalog records | report-only, never mutates |
| `stale_idempotency_keys` | stale idempotency records | deletes rows past `expires_at` (pure replay cache, no historical value once expired) |
| `dedupe_study_sessions` | duplicate learner events | deletes exact-duplicate `task_completed` rows for the same `(user_id, step_id)`, keeping the earliest — confirmed safe: it's a redundant log of the same real event, and the fix makes the learner-visible `minutes_total` stat *more* accurate, not less |

**Run against production during this audit** (dry-run first, then applied,
both with before/after verification — see Test results):
`dedupe_study_sessions` removed 19 confirmed-duplicate rows (one real
account had accumulated 8 for a single step), which is also what unblocked
`018_study_sessions_uniqueness.sql`'s unique index — Postgres refuses to
create a unique index over data that already violates it.

**Historical data preserved:** `check_duplicate_courses` never deletes a
`courses` row (only flips `availability_status`, so `path_steps.course_id`
foreign keys and any learner's completion history referencing it are
untouched); `dedupe_study_sessions` never touches rows for different users
or different steps; `backfill_path_freshness` only ever fills a `NULL`, it
never overwrites an existing value.

---

## 5. Concurrency — proven, not assumed

Ran real concurrent load against the **live, deployed** database (using the
established test account, temporary rows, always cleaned up — see
`scripts/verify_concurrency_live.py`, runnable any time to re-verify):

```
=== OLD pattern (SELECT-then-write): 20 concurrent bump_path_version calls ===
expected final version: 21 | actual: 5
distinct computed versions: 4 of 20 calls
RACE REPRODUCED (updates lost)

=== NEW atomic RPC: 20 concurrent bump_path_version calls ===
expected final version: 21 | actual: 21
distinct returned versions: 20 of 20 calls
PASS: no lost updates
```

16 of 20 concurrent updates were silently lost under the exact pre-audit
code path; zero were lost under the new one, using real threads and real
separate connections against production. This is the clearest possible
demonstration that the fix in §3 is not cosmetic.

---

## 6. Test results

**Backend suite:** 304 passed, run against fake credentials (zero live
network calls — proving full test isolation) and again against the real
project (proving no behavioral regression). New/modified files this audit:
`test_db_maintenance.py` (15), `test_constraint_handling.py` (5),
`test_generate_path_idempotency.py` (rewritten for the atomic RPC),
`test_idempotency_service.py` (+5 for request-hash/ownership),
`test_taxonomy_and_mastery.py` and `test_core_flows.py` (updated for the
RPC-based `mastery_service`/`roadmap_service` calls).

**Live verification (not pytest — see `scripts/verify_*_live.py`, both
runnable any time, both clean up their own test data and re-verify zero
residue after every run):**

- `verify_concurrency_live.py` — the lost-update race, reproduced on the
  old pattern and closed on the new one (§5).
- `verify_constraints_live.py` — all 4 new constraints (`path_steps`
  sequence uniqueness, `recommendation_runs.trigger` CHECK, `courses`
  provider-resource URL uniqueness, `study_sessions` task-completion
  uniqueness) confirmed to actually reject bad data against the real
  schema, all four: `PASS - rejected (APIError)`.
- All 6 new RPC functions functionally verified against real data
  (`create_learning_path_with_steps`, `bump_path_version`,
  `swap_path_step`, `rebuild_path_tail`, `upsert_mastery_evidence`,
  `set_course_completion_flag`) — 13/13 assertions passed inside a rolled-
  back transaction, then re-verified via real calls with full cleanup, to
  also confirm the exact `.data` shape supabase-py returns for each
  (scalar vs. table-returning functions return different shapes — this was
  verified empirically, not assumed, before writing the Python call sites).
- Migration idempotency — the full content of `016`/`018`/`019` re-applied
  against the already-migrated live database inside a rolled-back
  transaction: zero errors.
- Security advisor re-run after applying `016`/`017`/`018`/`019`: the
  critical `rls_disabled` finding is gone; the two remaining
  `rls_enabled_no_policy` notices on `rate_limit_hits`/`idempotency_keys`
  are the **intended** state (service-role-only, by design); all 10
  `function_search_path_mutable` warnings closed by `019`.

---

## 7. Backup and recovery

See [`docs/BACKUP_RECOVERY_RUNBOOK.md`](docs/BACKUP_RECOVERY_RUNBOOK.md) —
covers what backup coverage actually exists (Supabase-managed, plan-
dependent — **not independently confirmed as configured**, see that
document's honest caveat), rollback boundaries for schema vs. application
changes, and a restore-testing procedure.

## 8. Retention and privacy

See [`docs/DATA_RETENTION_AND_PRIVACY.md`](docs/DATA_RETENTION_AND_PRIVACY.md)
— retention handling for resumes, feedback, learner events, logs, and
recommendation audit records, plus deletion/anonymization workflow
guidance.

## 9. Schema reference

See [`docs/SCHEMA_REFERENCE.md`](docs/SCHEMA_REFERENCE.md) — every table,
its RLS policy, required extensions, and setup prerequisites for a fresh
deployment.

---

## 10. Infrastructure-dependent work not faked

1. **True from-empty-database migration replay** (a real Supabase branch)
   was the originally planned method for "Full migration chain from empty
   database" / "Upgrade from representative legacy schema" testing. The
   user approved creating a temporary branch (Supabase's branching feature
   has a real cost), but the Supabase MCP server available in this session
   does not expose the `confirm_cost` step `create_branch` requires — so
   the branch could not actually be created. **What was done instead**,
   and why it's a strong substitute: every new migration statement was
   verified via a rolled-back transaction against the live database (proves
   real Postgres syntax/semantics/constraint-compatibility, which a fresh
   empty DB would too), the exact ordering bug that *would* have broken a
   fresh bootstrap was found and fixed by direct code reading (not
   discovered via the branch test, since it doesn't exist), and every RPC
   was functionally verified with real data and real cleanup. What this
   does **not** prove: that `schema.sql` + `002`–`019` replayed end-to-end
   against a database that has genuinely never seen any of this project's
   SQL would succeed without some unforeseen ordering issue elsewhere in
   `002`–`015` that a live-schema-only review could miss. Recommended
   follow-up: either enable branching cost approval through a Supabase CLI
   / dashboard flow directly, or provision a disposable local Postgres
   instance and replay the full file sequence there.
2. **Automated backups** — not independently confirmed as configured for
   this project; see the backup/recovery runbook for exactly what was and
   wasn't verified.
3. **A dedicated CI job that runs the fresh-migration-chain test** on every
   PR (the natural complement to `#1` once branch creation is available) —
   not built in this pass; `.github/workflows/ci.yml` (from the Phase 4
   security pass) runs the application test suite and dependency scans,
   not a schema-migration replay.
