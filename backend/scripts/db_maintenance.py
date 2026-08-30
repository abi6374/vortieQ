"""Database maintenance: dry-run-capable, idempotent cleanup for legacy/
drifted data found during the database-reliability audit.

Every check function returns a report dict and NEVER mutates the database
unless `apply=True` is passed - the CLI defaults to dry-run (report only).
Every mutation this script can perform is either:
  (a) purely additive/corrective (backfilling a NULL freshness column with a
      safe, documented default), or
  (b) removal of exact-duplicate LOW-VALUE TELEMETRY rows (study_sessions
      logged from repeated toggling, expired idempotency keys) - never a
      user's real learning history, feedback, or catalog content, or
  (c) a QUARANTINE flag (availability_status change / a flag column) rather
      than a DELETE, for anything uncertain (duplicate catalog resources,
      orphaned provider records) - per the audit's explicit instruction to
      quarantine rather than delete uncertain legacy catalog records.

Usage:
    python -m scripts.db_maintenance --report                 # dry-run, all checks
    python -m scripts.db_maintenance --report --only stale_idempotency_keys
    python -m scripts.db_maintenance --apply --only dedupe_study_sessions
    python -m scripts.db_maintenance --apply --only backfill_path_freshness

Run from the `backend/` directory (needs the same .env as the app - it uses
the real app.config.supabase_client, the service-role client). Never run
against production without reading the dry-run report first.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone

from app.config import supabase_client

# ─────────────────────────────────────────────────────────────────────────
# 1. Invalid / untrusted / stale resources
# ─────────────────────────────────────────────────────────────────────────

def check_stale_resources(apply: bool = False) -> dict:
    """Reports provider_resources/courses whose availability_status is
    'unavailable' or 'stale', or provider_resources still 'unverified' long
    after creation (a verification pass that never completed). Never
    deletes or hides these - they may still be legitimately referenced by
    a learner's real path_steps history. Reports only; the fix (re-run
    catalog_service.revalidate_course / the verification pipeline) is a
    deliberate, separate operational action, not something this script
    performs automatically."""
    unavailable_courses = (
        supabase_client.table("courses")
        .select("id, title, resource_url, availability_status, last_verified_at")
        .in_("availability_status", ["unavailable", "stale"])
        .execute()
    ).data or []

    stale_provider_resources = (
        supabase_client.table("provider_resources")
        .select("id, canonical_url, availability_status, created_at, last_checked_at")
        .eq("availability_status", "unverified")
        .execute()
    ).data or []

    return {
        "check": "stale_resources",
        "mode": "report_only",  # this check never mutates, even with apply=True
        "unavailable_or_stale_courses": len(unavailable_courses),
        "unverified_provider_resources": len(stale_provider_resources),
        "details": {
            "unavailable_or_stale_courses": unavailable_courses[:50],
            "unverified_provider_resources": stale_provider_resources[:50],
        },
    }


# ─────────────────────────────────────────────────────────────────────────
# 2. Old paths with missing version/freshness data
# ─────────────────────────────────────────────────────────────────────────

def check_and_fix_path_freshness(apply: bool = False) -> dict:
    """learning_paths.version/last_recomputed_at (migration 008) default to
    1/now() for NEW rows, but any path inserted before that migration ran
    could have NULL in either column - a client comparing `version` to
    detect staleness would misbehave on NULL. Backfills version=1 (the
    correct "never recomputed since generation" value) and
    last_recomputed_at=generated_at (the most honest available timestamp -
    never fabricates a fake recomputation time)."""
    rows = (
        supabase_client.table("learning_paths")
        .select("id, generated_at, version, last_recomputed_at")
        .or_("version.is.null,last_recomputed_at.is.null")
        .execute()
    ).data or []

    fixed = 0
    if apply:
        for row in rows:
            patch = {}
            if row.get("version") is None:
                patch["version"] = 1
            if row.get("last_recomputed_at") is None:
                patch["last_recomputed_at"] = row.get("generated_at") or datetime.now(timezone.utc).isoformat()
            if patch:
                supabase_client.table("learning_paths").update(patch).eq("id", row["id"]).execute()
                fixed += 1

    return {
        "check": "path_freshness_backfill",
        "mode": "applied" if apply else "dry_run",
        "found": len(rows),
        "fixed": fixed if apply else 0,
        "would_fix": len(rows) if not apply else 0,
        "details": rows[:50],
    }


# ─────────────────────────────────────────────────────────────────────────
# 3. Malformed mastery evidence
# ─────────────────────────────────────────────────────────────────────────

def check_malformed_mastery(apply: bool = False) -> dict:
    """Reports learner_skill_mastery rows whose skill_id no longer resolves
    to a real skills row (would only happen if a skill were ever hard-
    deleted outside the FK - the FK itself prevents new occurrences, this
    is a defensive check for pre-constraint drift) and rows with an
    evidence_note suspiciously long (>500 chars truncation not applied -
    would only happen from a pre-length-cap write path). Report-only:
    mastery evidence is real learner signal, never auto-deleted."""
    mastery_rows = (
        supabase_client.table("learner_skill_mastery")
        .select("id, user_id, skill_id, evidence_source, evidence_note")
        .execute()
    ).data or []
    skill_ids = {r["id"] for r in (supabase_client.table("skills").select("id").execute().data or [])}

    orphaned = [r for r in mastery_rows if r["skill_id"] not in skill_ids]
    oversized_notes = [r for r in mastery_rows if len(r.get("evidence_note") or "") > 500]

    return {
        "check": "malformed_mastery_evidence",
        "mode": "report_only",
        "orphaned_skill_references": len(orphaned),
        "oversized_evidence_notes": len(oversized_notes),
        "details": {"orphaned": orphaned[:50], "oversized_notes": oversized_notes[:50]},
    }


# ─────────────────────────────────────────────────────────────────────────
# 4. Duplicate canonical resources
# ─────────────────────────────────────────────────────────────────────────

def check_duplicate_courses(apply: bool = False) -> dict:
    """Reports courses sharing a resource_url. NEVER auto-merges: a
    genuine investigation during this audit found real, legitimately
    DIFFERENT seed courses sharing an overly generic provider landing-page
    URL (e.g. 3 distinct courses all pointing at
    https://www.freecodecamp.org/learn) - merging those would destroy real
    catalog rows and any learner history referencing them. A group is only
    flagged as a likely true duplicate (same resource, accidentally
    inserted twice) when title ALSO matches; everything else is quarantined
    for human review, never touched automatically. Even a likely-true-
    duplicate group is not deleted by this script - see `quarantine`
    below, which flags the loser rows instead."""
    rows = (
        supabase_client.table("courses")
        .select("id, title, resource_url, source, availability_status")
        .not_.is_("resource_url", "null")
        .neq("resource_url", "")
        .execute()
    ).data or []

    by_url: dict[str, list[dict]] = {}
    for r in rows:
        by_url.setdefault(r["resource_url"], []).append(r)

    likely_true_duplicates = []  # same url AND same title - a real accidental duplicate
    needs_human_review = []      # same url, different title - distinct courses, generic URL
    for url, group in by_url.items():
        if len(group) < 2:
            continue
        titles = {g["title"] for g in group}
        if len(titles) == 1:
            likely_true_duplicates.append({"resource_url": url, "rows": group})
        else:
            needs_human_review.append({"resource_url": url, "rows": group})

    quarantined = 0
    if apply:
        # Quarantine (never delete): for a confirmed true duplicate group,
        # keep the earliest-created row as canonical and mark every other
        # row's availability_status='stale' so ranking_engine.hard_filter
        # naturally excludes it from future recommendations, without
        # deleting the row or breaking any existing path_steps.course_id
        # foreign key pointing at it.
        for group in likely_true_duplicates:
            survivors = sorted(group["rows"], key=lambda r: r["id"])
            for loser in survivors[1:]:
                supabase_client.table("courses").update({"availability_status": "stale"}).eq("id", loser["id"]).execute()
                quarantined += 1

    return {
        "check": "duplicate_canonical_resources",
        "mode": "applied" if apply else "dry_run",
        "likely_true_duplicate_groups": len(likely_true_duplicates),
        "needs_human_review_groups": len(needs_human_review),
        "quarantined_rows": quarantined if apply else 0,
        "would_quarantine_rows": sum(len(g["rows"]) - 1 for g in likely_true_duplicates) if not apply else 0,
        "details": {
            "likely_true_duplicates": likely_true_duplicates,
            "needs_human_review": needs_human_review,
        },
    }


# ─────────────────────────────────────────────────────────────────────────
# 5. Orphaned provider/catalog records
# ─────────────────────────────────────────────────────────────────────────

def check_orphaned_provider_resources(apply: bool = False) -> dict:
    """Reports provider_resources rows whose promoted_course_id points at a
    course that no longer exists (should be impossible - the FK is
    ON DELETE SET NULL - this is a defensive check for pre-constraint
    drift) and rows that were ingested long ago, never promoted, and never
    re-checked (candidates for re-verification or quarantine, never
    auto-deleted - a provider_resource is real ingestion history)."""
    resources = (
        supabase_client.table("provider_resources")
        .select("id, canonical_url, promoted_course_id, availability_status, created_at")
        .execute()
    ).data or []
    course_ids = {c["id"] for c in (supabase_client.table("courses").select("id").execute().data or [])}

    dangling_promoted = [
        r for r in resources
        if r.get("promoted_course_id") and r["promoted_course_id"] not in course_ids
    ]
    never_promoted_unverified = [
        r for r in resources
        if not r.get("promoted_course_id") and r.get("availability_status") == "unverified"
    ]

    return {
        "check": "orphaned_provider_resources",
        "mode": "report_only",
        "dangling_promoted_course_id": len(dangling_promoted),
        "never_promoted_and_unverified": len(never_promoted_unverified),
        "details": {"dangling": dangling_promoted[:50], "never_promoted": never_promoted_unverified[:50]},
    }


# ─────────────────────────────────────────────────────────────────────────
# 6. Stale idempotency records
# ─────────────────────────────────────────────────────────────────────────

def check_and_purge_stale_idempotency_keys(apply: bool = False) -> dict:
    """Deletes idempotency_keys rows past their expires_at (migration 016
    added this column with a 7-day default). Safe to delete outright -
    these rows are a pure replay cache with no historical/audit value once
    expired (the real audit trail for what a user did lives in
    feedback_events/path_steps/learning_paths, not here)."""
    now = datetime.now(timezone.utc).isoformat()
    expired = (
        supabase_client.table("idempotency_keys")
        .select("idempotency_key, route, created_at, expires_at")
        .lt("expires_at", now)
        .execute()
    ).data or []

    deleted = 0
    if apply and expired:
        supabase_client.table("idempotency_keys").delete().lt("expires_at", now).execute()
        deleted = len(expired)

    return {
        "check": "stale_idempotency_keys",
        "mode": "applied" if apply else "dry_run",
        "found": len(expired),
        "deleted": deleted,
        "would_delete": len(expired) if not apply else 0,
        "details": expired[:50],
    }


# ─────────────────────────────────────────────────────────────────────────
# 7. Duplicate learner events (study_sessions task_completed)
# ─────────────────────────────────────────────────────────────────────────

def check_and_dedupe_study_sessions(apply: bool = False) -> dict:
    """Confirmed live bug: repeatedly completing/un-completing the same
    step inserts a NEW study_sessions row every time (no dedup), and
    account_service.get_streak()'s minutes_total SUMS these rows - so
    duplicates directly inflate a number shown to the learner. Keeps the
    EARLIEST row per (user_id, step_id) for activity='task_completed' and
    removes the rest - this is safe to delete outright (it's a redundant
    log of the SAME real event, not distinct learner history; the streak
    and total-minutes numbers become MORE accurate after this, not less).
    Required before migration 016's idx_study_sessions_task_completed_uniq
    partial unique index can be created - Postgres refuses a unique index
    over data that already violates it."""
    rows = (
        supabase_client.table("study_sessions")
        .select("id, user_id, step_id, created_at")
        .eq("activity", "task_completed")
        .not_.is_("step_id", "null")
        .order("created_at")
        .execute()
    ).data or []

    seen: set[tuple[str, str]] = set()
    duplicates: list[dict] = []
    for row in rows:
        key = (row["user_id"], row["step_id"])
        if key in seen:
            duplicates.append(row)
        else:
            seen.add(key)

    deleted = 0
    if apply:
        for row in duplicates:
            supabase_client.table("study_sessions").delete().eq("id", row["id"]).execute()
            deleted += 1

    return {
        "check": "dedupe_study_sessions",
        "mode": "applied" if apply else "dry_run",
        "found_duplicate_rows": len(duplicates),
        "deleted": deleted,
        "would_delete": len(duplicates) if not apply else 0,
        "details": duplicates[:50],
    }


CHECKS = {
    "stale_resources": check_stale_resources,
    "backfill_path_freshness": check_and_fix_path_freshness,
    "malformed_mastery": check_malformed_mastery,
    "duplicate_courses": check_duplicate_courses,
    "orphaned_provider_resources": check_orphaned_provider_resources,
    "stale_idempotency_keys": check_and_purge_stale_idempotency_keys,
    "dedupe_study_sessions": check_and_dedupe_study_sessions,
}


def run(only: str | None, apply: bool) -> dict:
    checks_to_run = {only: CHECKS[only]} if only else CHECKS
    results = {name: fn(apply=apply) for name, fn in checks_to_run.items()}
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "apply" if apply else "dry_run",
        "results": results,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--report", action="store_true", help="Dry-run: report findings only (default).")
    mode.add_argument("--apply", action="store_true", help="Actually perform the safe fixes described above.")
    parser.add_argument("--only", choices=sorted(CHECKS.keys()), help="Run a single check instead of all of them.")
    args = parser.parse_args()

    report = run(only=args.only, apply=bool(args.apply))
    print(json.dumps(report, indent=2, default=str))

    if not args.apply:
        print("\n[dry-run] No changes were made. Re-run with --apply to perform the fixes above.", file=sys.stderr)


if __name__ == "__main__":
    main()
