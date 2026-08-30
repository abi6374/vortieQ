# Data Retention & Privacy

Written as part of the database-reliability audit. Describes what data
this system actually stores, how long it's kept, how deletion/anonymization
works today, and what's honestly still missing.

## 1. Data categories and retention

| Category | Where it lives | Retention today | Notes |
|---|---|---|---|
| Resume files | Storage bucket `resumes` (private) | Indefinite | No automated expiry. Deleting the `resumes` table row does **not** delete the underlying Storage object — see §3. |
| Resume-extracted text/metadata | `resumes.extracted_topics`, `.education`, `.projects`, `.suggested_goal` | Indefinite | Structured extraction only — the raw resume *text* itself is not persisted separately from the file; see §4 on why this matters for audit-log hygiene. |
| Raw feedback text | `feedback_events.note` | Indefinite | Free-text the learner typed; capped at 1000 chars at the API layer (`roadmap_service.set_task_completion`), not truncated anywhere else. |
| Learner events | `feedback_events`, `study_sessions` | Indefinite | The real, append-only history that drives the recommender and the streak/progress UI — this is core product data, not a log. |
| Recommendation audit records | `recommendation_runs`, `recommendation_explanations` | Indefinite | Full candidate lists, scores, and the input-snapshot hash for every path-generate/swap/rerecommend decision. |
| Idempotency records | `idempotency_keys` | **7 days** (as of this audit — `expires_at` column, migration 016) | The only category with an actual enforced expiry; see `scripts/db_maintenance.py`'s `stale_idempotency_keys` check for cleanup. |
| Rate-limit bookkeeping | `rate_limit_hits` | Indefinite (unbounded growth) | No expiry column exists on this table. Low sensitivity (just a bucket key + timestamp), but still an honest gap — see §5. |
| Application logs | EC2 container stdout/stderr (`docker logs`) | Whatever the host's log rotation/retention is configured to — **not managed by this codebase at all** | Not a database concern, but part of the real data footprint; verify separately what the host actually retains. |

**None of the "indefinite" rows above have a deliberate retention *policy*
today** — they simply accumulate forever because nothing was ever built to
expire them. This is worth a deliberate decision (how long is a learner's
feedback/recommendation history actually useful, from both a product and a
privacy-minimization standpoint?), not silently left as "however long the
database happens to keep it."

## 2. What must NOT be retained as raw text

Confirmed via code reading (Phase 4's prompt-injection hardening pass) that
resume/GitHub/feedback text is already treated as untrusted input at the
point it's *used* (wrapped in `<<<...>>>` delimiters before reaching an
LLM prompt) — but that's a security boundary, not a retention one. For
audit logging specifically:

- `recommendation_runs.input_snapshot_hash` is already a **hash**, not the
  raw profile snapshot — correct design, already minimizes what an audit
  record retains.
- `feedback_events.note` and `interview_qa_records.candidate_transcript`
  **do** retain raw learner-typed text indefinitely. This is a real,
  current gap against "ensure audit needs do not retain sensitive raw text
  unnecessarily" — the audit trail this system needs (what changed, when,
  why) does not require keeping the learner's exact original wording
  forever; a length-capped, already-applied summary would serve the same
  audit purpose. Not changed in this pass (would alter a working feature's
  behavior without a product decision on the tradeoff) — flagged as a
  concrete, actionable follow-up.

## 3. Deletion and anonymization workflows

### Full account deletion (the mechanism that exists today)

Every per-user table's foreign key to `auth.users(id)` is either
`ON DELETE CASCADE` (`profiles`, `learning_paths`, `feedback_events`,
`resumes`, `ai_conversations`, `ai_messages`, `user_settings`,
`study_sessions`, `learner_skill_mastery`, `recommendation_runs`,
`idempotency_keys`, `user_hackathons`, `user_internships`,
`interview_sessions`) or `ON DELETE SET NULL` where the row should outlive
the user (none currently — every user-owned table cascades). **Deleting
the `auth.users` row via Supabase's Auth Admin API correctly and completely
removes every database row this audit found**, verified by reading every
FK definition across all 19 migrations, not assumed.

**What this does NOT do:** delete the learner's file(s) from the `resumes`
Storage bucket. `ON DELETE CASCADE` is a Postgres foreign-key mechanism; it
has no reach into Supabase Storage, which is a separate object store keyed
by bucket + path, not by a foreign key into `public.resumes`. **A real,
current gap**: deleting a user's account today leaves their uploaded resume
file(s) sitting in Storage indefinitely, orphaned (the `resumes` table row
pointing at them is gone, so the app can no longer find them, but the
bytes remain).

**Ownership-checked, safe workflow this implies** (not yet built as a
self-service endpoint — see §5):

```python
# Before deleting the auth.users row:
resume_rows = supabase_client.table("resumes").select("storage_path").eq("user_id", user_id).execute().data
for row in resume_rows:
    supabase_client.storage.from_("resumes").remove([row["storage_path"]])
# Then delete the auth.users row (Supabase Auth Admin API) - the CASCADE
# handles every table above automatically.
```

### Partial anonymization (keep the row, remove the identity)

Not needed anywhere in this schema today: every table that should survive
a user's departure for aggregate/product-analytics reasons... doesn't
exist. There is no "anonymized aggregate stats" table separate from
per-user rows in this project. If one is ever built, the pattern should be:
copy the aggregate fact (e.g., "a step of difficulty X was marked too_hard")
without `user_id`, never `UPDATE ... SET user_id = NULL` on a row a FK
still requires `NOT NULL` on (`feedback_events.user_id` is `NOT NULL`,
correctly — don't work around that by nulling it out inconsistently with
the schema's own constraints).

## 4. Ownership checks on any deletion workflow

Every deletion above (per-row or full-account) must be scoped by the
**real, authenticated user_id**, never a client-supplied one — this is the
same ownership-check discipline already audited and enforced across every
mutation route in `SECURITY_AUDIT_PHASE4.md`. A future self-service
"delete my resume" or "delete my account" endpoint must reuse the existing
`Depends(verify_jwt)` pattern and scope every delete by
`.eq("user_id", user_id)`, exactly like every other mutation in this
codebase — never trust a `user_id` field in the request body for a
deletion.

## 5. Honest list of retention/privacy gaps not fixed in this pass

1. **No automated expiry on `feedback_events`, `study_sessions`,
   `recommendation_runs`/`recommendation_explanations`, or
   `rate_limit_hits`.** No deliberate retention window has ever been
   decided for these; they grow forever. Recommend a product decision
   (e.g., "recommendation audit records older than 2 years are pruned")
   before building the mechanism — not something this audit should decide
   unilaterally.
2. **No self-service account/data deletion endpoint.** The underlying
   CASCADE mechanism is correct and verified, but nothing in the API
   surface lets a learner trigger it themselves; today this would require
   a manual Supabase Auth Admin action per request.
3. **Deleting a user's account does not delete their Storage-bucket resume
   file(s).** A real, currently-existing orphaned-data gap (§3).
4. **Raw feedback/interview-transcript text has no retention cap or
   summarization**, unlike `recommendation_runs.input_snapshot_hash`,
   which already does this correctly (§2).
5. **Application log retention** (EC2 host `docker logs`) is outside this
   audit's reach entirely — verify separately what the host's Docker
   logging driver and any log-shipping configuration actually retain.
