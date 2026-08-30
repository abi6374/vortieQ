"""Tests for scripts/db_maintenance.py - dry-run-by-default, idempotent
legacy-data maintenance checks. No live DB calls; supabase_client is
mocked throughout, matching this project's test-isolation discipline
(scripts/db_maintenance.py is a real maintenance tool meant to run
manually against production - it must never be exercised against a real
database from an automated test run).
"""
from unittest.mock import MagicMock, patch

from scripts import db_maintenance


def _mock_table(data_by_call):
    """Returns a MagicMock table whose .execute() yields successive
    entries from data_by_call on each call - lets one test simulate a
    sequence of different queries against the same table name."""
    m = MagicMock()
    responses = iter(data_by_call)

    def execute_side_effect(*_a, **_kw):
        return MagicMock(data=next(responses))

    # Every chained method just returns self so arbitrary .select().eq()...
    # chains work; only the terminal .execute() call matters here.
    m.select.return_value = m
    m.eq.return_value = m
    m.neq.return_value = m
    m.lt.return_value = m
    m.gt.return_value = m
    m.not_.is_.return_value = m
    m.in_.return_value = m
    m.or_.return_value = m
    m.order.return_value = m
    m.update.return_value = m
    m.delete.return_value = m
    m.execute.side_effect = execute_side_effect
    return m


class TestDryRunNeverMutates:
    """The core safety guarantee: without --apply (apply=False, the
    default), no check may call .update(), .delete(), or .insert()."""

    def test_backfill_path_freshness_dry_run_does_not_write(self):
        mock_supabase = MagicMock()
        rows = [{"id": "p1", "generated_at": "2025-01-01T00:00:00Z", "version": None, "last_recomputed_at": None}]
        mock_supabase.table.return_value = _mock_table([rows])
        with patch("scripts.db_maintenance.supabase_client", mock_supabase):
            report = db_maintenance.check_and_fix_path_freshness(apply=False)
        assert report["mode"] == "dry_run"
        assert report["would_fix"] == 1
        assert report["fixed"] == 0
        mock_supabase.table.return_value.update.assert_not_called()

    def test_dedupe_study_sessions_dry_run_does_not_delete(self):
        mock_supabase = MagicMock()
        rows = [
            {"id": "s1", "user_id": "u1", "step_id": "st1", "created_at": "2026-01-01T00:00:00Z"},
            {"id": "s2", "user_id": "u1", "step_id": "st1", "created_at": "2026-01-01T00:01:00Z"},
        ]
        mock_supabase.table.return_value = _mock_table([rows])
        with patch("scripts.db_maintenance.supabase_client", mock_supabase):
            report = db_maintenance.check_and_dedupe_study_sessions(apply=False)
        assert report["mode"] == "dry_run"
        assert report["found_duplicate_rows"] == 1  # keeps the first, flags the rest
        assert report["deleted"] == 0
        mock_supabase.table.return_value.delete.assert_not_called()

    def test_purge_stale_idempotency_keys_dry_run_does_not_delete(self):
        mock_supabase = MagicMock()
        rows = [{"idempotency_key": "k1", "route": "steps.swap", "created_at": "x", "expires_at": "2020-01-01T00:00:00Z"}]
        mock_supabase.table.return_value = _mock_table([rows])
        with patch("scripts.db_maintenance.supabase_client", mock_supabase):
            report = db_maintenance.check_and_purge_stale_idempotency_keys(apply=False)
        assert report["mode"] == "dry_run"
        assert report["would_delete"] == 1
        mock_supabase.table.return_value.delete.assert_not_called()

    def test_duplicate_courses_dry_run_does_not_quarantine(self):
        mock_supabase = MagicMock()
        rows = [
            {"id": "c1", "title": "Same Title", "resource_url": "https://x.example/one", "source": "provider_resource", "availability_status": "available"},
            {"id": "c2", "title": "Same Title", "resource_url": "https://x.example/one", "source": "provider_resource", "availability_status": "available"},
        ]
        mock_supabase.table.return_value = _mock_table([rows])
        with patch("scripts.db_maintenance.supabase_client", mock_supabase):
            report = db_maintenance.check_duplicate_courses(apply=False)
        assert report["mode"] == "dry_run"
        assert report["likely_true_duplicate_groups"] == 1
        assert report["would_quarantine_rows"] == 1
        mock_supabase.table.return_value.update.assert_not_called()


class TestApplyPerformsTheDescribedFix:
    def test_backfill_path_freshness_apply_writes_safe_defaults(self):
        mock_supabase = MagicMock()
        rows = [{"id": "p1", "generated_at": "2025-01-01T00:00:00Z", "version": None, "last_recomputed_at": None}]
        # One execute() for the initial select, one per fixed row's update.
        mock_supabase.table.return_value = _mock_table([rows, None])
        with patch("scripts.db_maintenance.supabase_client", mock_supabase):
            report = db_maintenance.check_and_fix_path_freshness(apply=True)
        assert report["fixed"] == 1
        update_call = mock_supabase.table.return_value.update.call_args[0][0]
        assert update_call["version"] == 1
        assert update_call["last_recomputed_at"] == "2025-01-01T00:00:00Z"  # honest fallback, never fabricated

    def test_dedupe_study_sessions_apply_keeps_earliest_deletes_rest(self):
        mock_supabase = MagicMock()
        rows = [
            {"id": "s1", "user_id": "u1", "step_id": "st1", "created_at": "2026-01-01T00:00:00Z"},
            {"id": "s2", "user_id": "u1", "step_id": "st1", "created_at": "2026-01-01T00:01:00Z"},
            {"id": "s3", "user_id": "u1", "step_id": "st1", "created_at": "2026-01-01T00:02:00Z"},
        ]
        # One execute() for the select, one per deleted duplicate (2 dupes).
        mock_supabase.table.return_value = _mock_table([rows, None, None])
        with patch("scripts.db_maintenance.supabase_client", mock_supabase):
            report = db_maintenance.check_and_dedupe_study_sessions(apply=True)
        assert report["deleted"] == 2  # s1 (earliest) survives
        deleted_ids = {row["id"] for row in report["details"]}
        assert deleted_ids == {"s2", "s3"}
        assert "s1" not in deleted_ids

    def test_never_deletes_distinct_users_or_steps(self):
        """Two DIFFERENT (user_id, step_id) pairs must never be treated as
        duplicates of each other - this is what "preserve completed user
        history" means in practice for this check."""
        mock_supabase = MagicMock()
        rows = [
            {"id": "s1", "user_id": "u1", "step_id": "st1", "created_at": "2026-01-01T00:00:00Z"},
            {"id": "s2", "user_id": "u2", "step_id": "st1", "created_at": "2026-01-01T00:01:00Z"},
            {"id": "s3", "user_id": "u1", "step_id": "st2", "created_at": "2026-01-01T00:02:00Z"},
        ]
        mock_supabase.table.return_value = _mock_table([rows])
        with patch("scripts.db_maintenance.supabase_client", mock_supabase):
            report = db_maintenance.check_and_dedupe_study_sessions(apply=True)
        assert report["deleted"] == 0

    def test_purge_stale_idempotency_keys_apply_deletes_only_expired(self):
        mock_supabase = MagicMock()
        rows = [{"idempotency_key": "k1", "route": "steps.swap", "created_at": "x", "expires_at": "2020-01-01T00:00:00Z"}]
        # One execute() for the select, one for the delete.
        mock_supabase.table.return_value = _mock_table([rows, None])
        with patch("scripts.db_maintenance.supabase_client", mock_supabase):
            report = db_maintenance.check_and_purge_stale_idempotency_keys(apply=True)
        assert report["deleted"] == 1
        mock_supabase.table.return_value.delete.assert_called_once()
        # Scoped by expires_at (both the select and the delete filter on it),
        # never a blanket delete of the whole table.
        assert all(c.args[0] == "expires_at" for c in mock_supabase.table.return_value.lt.call_args_list)

    def test_duplicate_courses_apply_quarantines_never_deletes(self):
        """Quarantine = availability_status change, never a DELETE - the row
        (and any path_steps FK pointing at it) must survive."""
        mock_supabase = MagicMock()
        rows = [
            {"id": "c1", "title": "Same Title", "resource_url": "https://x.example/one", "source": "provider_resource", "availability_status": "available"},
            {"id": "c2", "title": "Same Title", "resource_url": "https://x.example/one", "source": "provider_resource", "availability_status": "available"},
        ]
        # One execute() for the select, one per quarantined loser row (1 loser).
        mock_supabase.table.return_value = _mock_table([rows, None])
        with patch("scripts.db_maintenance.supabase_client", mock_supabase):
            report = db_maintenance.check_duplicate_courses(apply=True)
        assert report["quarantined_rows"] == 1
        mock_supabase.table.return_value.delete.assert_not_called()
        update_payload = mock_supabase.table.return_value.update.call_args[0][0]
        assert update_payload == {"availability_status": "stale"}

    def test_duplicate_courses_never_quarantines_different_titles(self):
        """Confirmed real seed-data case (freecodecamp.org/learn shared by 3
        distinct courses): different titles sharing a URL must be reported
        for human review only, never auto-quarantined."""
        mock_supabase = MagicMock()
        rows = [
            {"id": "c1", "title": "Python Programming Fundamentals", "resource_url": "https://www.freecodecamp.org/learn", "source": "seed", "availability_status": "available"},
            {"id": "c2", "title": "Responsive Web Design", "resource_url": "https://www.freecodecamp.org/learn", "source": "seed", "availability_status": "available"},
        ]
        mock_supabase.table.return_value = _mock_table([rows])
        with patch("scripts.db_maintenance.supabase_client", mock_supabase):
            report = db_maintenance.check_duplicate_courses(apply=True)
        assert report["likely_true_duplicate_groups"] == 0
        assert report["needs_human_review_groups"] == 1
        assert report["quarantined_rows"] == 0
        mock_supabase.table.return_value.update.assert_not_called()


class TestReportOnlyChecksNeverMutateEvenWithApply:
    """stale_resources, malformed_mastery, and orphaned_provider_resources
    are pure report-only checks by design (real learner/catalog data that
    must never be auto-modified) - apply=True must be a no-op for them."""

    def test_stale_resources_never_writes(self):
        mock_supabase = MagicMock()
        mock_supabase.table.return_value = _mock_table([[], []])
        with patch("scripts.db_maintenance.supabase_client", mock_supabase):
            report = db_maintenance.check_stale_resources(apply=True)
        assert report["mode"] == "report_only"
        mock_supabase.table.return_value.update.assert_not_called()
        mock_supabase.table.return_value.delete.assert_not_called()

    def test_malformed_mastery_never_writes(self):
        mock_supabase = MagicMock()
        mock_supabase.table.return_value = _mock_table([[], []])
        with patch("scripts.db_maintenance.supabase_client", mock_supabase):
            report = db_maintenance.check_malformed_mastery(apply=True)
        assert report["mode"] == "report_only"
        mock_supabase.table.return_value.update.assert_not_called()
        mock_supabase.table.return_value.delete.assert_not_called()

    def test_orphaned_provider_resources_never_writes(self):
        mock_supabase = MagicMock()
        mock_supabase.table.return_value = _mock_table([[], []])
        with patch("scripts.db_maintenance.supabase_client", mock_supabase):
            report = db_maintenance.check_orphaned_provider_resources(apply=True)
        assert report["mode"] == "report_only"
        mock_supabase.table.return_value.update.assert_not_called()
        mock_supabase.table.return_value.delete.assert_not_called()


class TestRunAndCLI:
    def test_run_only_executes_a_single_named_check(self):
        mock_supabase = MagicMock()
        mock_supabase.table.return_value = _mock_table([[], []])  # mastery + skills selects
        with patch("scripts.db_maintenance.supabase_client", mock_supabase):
            report = db_maintenance.run(only="malformed_mastery", apply=False)
        assert list(report["results"].keys()) == ["malformed_mastery"]

    def test_run_all_executes_every_check(self):
        mock_supabase = MagicMock()
        mock_supabase.table.return_value = _mock_table([[]] * 20)
        with patch("scripts.db_maintenance.supabase_client", mock_supabase):
            report = db_maintenance.run(only=None, apply=False)
        assert set(report["results"].keys()) == set(db_maintenance.CHECKS.keys())
