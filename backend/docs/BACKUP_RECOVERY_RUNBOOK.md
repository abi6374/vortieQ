# Backup & Recovery Runbook

Written as part of the database-reliability audit. Every claim below is
marked either **confirmed** (checked directly against this project) or
**not independently confirmed** (could not be checked with the tools
available in this engagement — do not assume either way; verify in the
Supabase dashboard before relying on it).

## 1. What backup coverage actually exists

**Not independently confirmed.** This engagement's tooling has no way to
read a Supabase project's backup/PITR configuration or billing tier
directly. What *is* confirmed: Supabase's branching feature required
explicit cost confirmation when attempted during this audit, which implies
this project is on a plan tier where branching is offered (typically Pro or
above) — but branching availability and backup/PITR configuration are
separate settings, and one does not imply the other is turned on.

**Action required, not automatable from here:** in the Supabase dashboard,
check **Project Settings → Database → Backups**. Confirm and record:

- Whether daily backups are enabled, and the retention window.
- Whether Point-in-Time Recovery (PITR) is enabled, and how far back it
  reaches.
- Whether backups are tested (Supabase's own "restore" flow, or an export
  you control).

**Do not treat this document as confirming backups exist.** If the
dashboard shows backups are not enabled, that is a real, immediate gap —
treat enabling them as the single highest-priority follow-up from this
entire audit, since every other fix in this pass assumes recoverability in
the event of catastrophic failure.

## 2. What you can do yourself, right now, regardless of plan tier

- **Manual logical export**: `pg_dump` against the project's connection
  string (Project Settings → Database → Connection string) produces a
  portable SQL dump you control, independent of Supabase's own backup
  system. Recommended as a supplement even if managed backups are enabled,
  since it gives you an export you can store anywhere.
- **Storage bucket contents** (the `resumes` bucket) are **not** included
  in a `pg_dump` of the database — object storage is backed up separately
  by Supabase (or not, depending on plan) and must be verified
  independently. A database-only backup strategy would silently lose every
  uploaded resume file (though not the `resumes` table's metadata rows,
  which point at files that would no longer exist).
- **Migration files** (`data/schema.sql` + `data/migrations/*.sql`) are
  themselves a recovery asset: replaying them against a fresh Postgres
  instance reconstructs the full schema (tables, RLS, indexes, functions,
  triggers) from nothing but this git repository — verified during this
  audit (see `DATABASE_RELIABILITY_AUDIT.md` §1.5). This does **not**
  reconstruct data, only structure.

## 3. Rollback boundaries

### Application-code rollback

Safe and cheap: redeploy the previous Docker image
(`deploy-backend.yml`'s image tags are timestamped; `docker run` the
previous tag). No schema coordination needed as long as the previous
application version's expectations are a *subset* of the current schema —
true for every migration in this project so far, since every migration is
additive (`ADD COLUMN`, `CREATE TABLE IF NOT EXISTS`, widened `CHECK`
constraints only ever add allowed values, never remove them).

### Schema rollback

**Riskier, and not all migrations in this project have a safe rollback.**
Rule of thumb used throughout this project's migration comments (see e.g.
`011_realtime_feedback_events.sql`'s own rollback note): a migration that
only ever *adds* (a column, a table, an allowed enum value) can be rolled
back safely **only if no row has used the new capability yet** — rolling
back a widened `CHECK` constraint while a row already uses the new value
would immediately violate the narrowed constraint. Before rolling back any
schema migration:

1. Check whether any row actually uses the new capability (e.g., for
   `012_resource_unavailable_event.sql`: `SELECT count(*) FROM
   feedback_events WHERE event_type = 'resource_unavailable'`).
2. If the count is 0, the rollback SQL in that migration's own header
   comment is safe to run.
3. If the count is non-zero, rolling back requires a human decision about
   those rows first (re-label or remove them) — never do this
   automatically; deleting or altering real learner feedback needs a
   person to decide, consistent with this project's broader rule against
   automated destructive action on real data.

**The 6 new RPC functions (`017_transactional_rpcs.sql`) roll back
trivially**: `DROP FUNCTION IF EXISTS <name>(<signature>);` for each — they
have no data dependency, only application code depends on their existence
(and the corresponding application-code rollback must happen in the same
deploy, since the Python callers use `.rpc(...)` directly with no
fallback path).

### The one boundary that is NOT safe to cross

Never roll back a migration that a **later** migration already depends on.
Concretely: `017`'s RPCs reference `018`'s unique index implicitly (the
`swap_path_step` RPC's set-based sequence-shift relies on
`016`'s `path_steps_path_seq_uniq` being `DEFERRABLE`) — rolling back `016`
while `017` is still deployed would break `swap_path_step` at the first
concurrent swap. Roll back in reverse dependency order: `019` → `018` →
`017` → `016`, never skip ahead.

## 4. Restore testing procedure

Recommended cadence: quarterly, or before any major schema change.

1. Take (or use the most recent) backup/export.
2. Restore it into a **separate** Postgres instance or Supabase project —
   never restore over the live project to "test."
3. Run the full committed migration chain (`schema.sql` + `002`–`019`)
   against the restored copy and confirm it completes with no errors (this
   also re-validates that the migration chain is still fresh-database-safe
   as the codebase evolves).
4. Spot-check row counts against the source (`profiles`, `learning_paths`,
   `path_steps`, `feedback_events` at minimum) and run
   `python -m scripts.db_maintenance --report` against the restored copy —
   a clean report (or only expected findings) is a good sign the restore is
   structurally sound.
5. Document the actual restore time achieved — this is your real Recovery
   Time Objective (RTO), not a number from a vendor page.

## 5. Production recovery steps (if this is ever needed for real)

1. **Stop writes first.** Take the backend container down
   (`docker stop career-path-backend` on the EC2 host, or scale to 0) so
   nothing writes to a database mid-restore.
2. **Restore** the database from the most recent good backup/PITR point,
   following Supabase's own restore flow for your plan tier (or your own
   `pg_dump` export via `psql`/`pg_restore` if managed backups are not
   available — see §1).
3. **Verify** before resuming traffic: run
   `python -m scripts.db_maintenance --report` and skim for anything
   unexpected; spot-check a few real user rows if you have their IDs from
   support tickets.
4. **Resume the backend** and watch `/health` and application logs closely
   for the first 15–30 minutes.
5. **Post-incident**: record what was lost (the gap between the last good
   backup/PITR point and the incident) and communicate it honestly to
   affected users if learner data (a path, feedback, a resume) was lost —
   never silently paper over data loss.
