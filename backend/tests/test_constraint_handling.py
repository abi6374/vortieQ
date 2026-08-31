"""Database-reliability audit: tests for how application code responds to
real integrity constraints being enforced (unique-violation races, DB
constraint rejections). The constraints themselves are verified directly
against the live schema by scripts/verify_constraints_live.py (run
manually, never from pytest); these tests verify the SURROUNDING
application code degrades correctly when the DB says no, using mocks - no
live DB calls.
"""
from unittest.mock import MagicMock, patch

import pytest

from app.services.path_service import ResourceValidationError, _ensure_course_in_catalog


class TestCourseInsertRaceHandling:
    """idx_courses_resource_url_provider_uniq (migration 016) turns a
    concurrent duplicate insert into a unique-violation instead of a
    silent duplicate row - _ensure_course_in_catalog must catch that and
    return the winning row, not crash the swap/rerecommend request that
    triggered it."""

    def _base_mock(self, existing_after_race=None):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        # First two lookups (by resource_url, then by title) both find nothing.
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_table.select.return_value.ilike.return_value.execute.return_value = MagicMock(
            data=existing_after_race or []
        )
        return mock_supabase, mock_table

    def test_concurrent_duplicate_insert_returns_the_winning_row(self):
        winner = {"id": "winner-course-id", "title": "Real Course", "resource_url": "https://example.com/real"}
        mock_supabase, mock_table = self._base_mock()
        mock_table.insert.return_value.execute.side_effect = Exception(
            "duplicate key value violates unique constraint \"idx_courses_resource_url_provider_uniq\""
        )
        # The re-select after the failed insert (by resource_url) finds the
        # row the concurrent winner just created.
        mock_table.select.return_value.eq.return_value.execute.side_effect = [
            MagicMock(data=[]),      # initial existence check: not found yet
            MagicMock(data=[winner]),  # re-check after the race: winner is there now
        ]
        with patch("app.services.path_service.supabase_client", mock_supabase), \
             patch("app.services.path_service._validate_resource_url", return_value=True), \
             patch("app.ml.embedder.embed_text", return_value=[0.1] * 384):
            result = _ensure_course_in_catalog({
                "title": "Real Course", "resource_url": "https://example.com/real",
                "description": "d", "skill_tags": [],
            })
        assert result == winner  # used the real row, never raised, never duplicated

    def test_insert_failure_with_no_winner_found_raises_honestly(self):
        """If the insert fails for a reason OTHER than the race (or the
        re-check genuinely finds nothing), this must fail loudly - never
        fabricate a fake course row to paper over a real DB error."""
        mock_supabase, mock_table = self._base_mock()
        mock_table.insert.return_value.execute.side_effect = Exception("connection reset")
        mock_table.select.return_value.eq.return_value.execute.side_effect = [
            MagicMock(data=[]),
            MagicMock(data=[]),  # re-check still finds nothing - a real failure, not a race
        ]
        with patch("app.services.path_service.supabase_client", mock_supabase), \
             patch("app.services.path_service._validate_resource_url", return_value=True), \
             patch("app.ml.embedder.embed_text", return_value=[0.1] * 384):
            with pytest.raises(ResourceValidationError):
                _ensure_course_in_catalog({
                    "title": "Real Course", "resource_url": "https://example.com/real",
                    "description": "d", "skill_tags": [],
                })

    def test_new_course_insert_records_provider_resource_provenance(self):
        """Database-reliability audit fix: this insert previously omitted
        `source` entirely, silently defaulting to the column's 'seed'
        default even for a dynamically-ingested web resource - which meant
        idx_courses_resource_url_provider_uniq never actually covered these
        rows. Confirms the fix: every course this function creates is
        correctly labeled source='provider_resource'."""
        mock_supabase, mock_table = self._base_mock()
        mock_table.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "new-id", "title": "Real Course", "source": "provider_resource"}]
        )
        with patch("app.services.path_service.supabase_client", mock_supabase), \
             patch("app.services.path_service._validate_resource_url", return_value=True), \
             patch("app.ml.embedder.embed_text", return_value=[0.1] * 384):
            _ensure_course_in_catalog({
                "title": "Real Course", "resource_url": "https://example.com/real",
                "description": "d", "skill_tags": [],
            })
        insert_payload = mock_table.insert.call_args[0][0]
        assert insert_payload["source"] == "provider_resource"


class TestIdempotencyRequestHashConstraintLike:
    """The idempotency_keys.request_hash column (migration 016) is the
    application-level analogue of a uniqueness constraint on (key,
    payload) - a key reused for a genuinely different request must be
    rejected, not silently misapplied. Full coverage lives in
    test_idempotency_service.py; this test exists to make the connection
    to the audit's "constraint violation" test requirement explicit."""

    def test_reusing_a_key_for_a_different_request_is_a_hard_conflict(self):
        from app.services import idempotency_service

        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        original_hash = idempotency_service._hash_request({"step_id": "s1"})
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"user_id": "user-1", "request_hash": original_hash, "response_status": 200, "response_body": {}}]
        )
        with patch("app.services.idempotency_service.supabase_client", mock_supabase):
            result = idempotency_service.check_and_reserve(
                "key-1", "user-1", "steps.swap", request_payload={"step_id": "DIFFERENT_STEP"},
            )
        assert result["status"] == 409


class TestTargetTimelineConstraints:
    """Verifies that requested timelines (e.g. 13 weeks) are correctly parsed,
    and that roadmap week assignment is HONEST about pacing rather than
    lying about it.

    Design change from this class's original version: an earlier version of
    assign_week_numbers "fixed" a real, legitimate concern (a 66/69-week
    roadmap feels absurd) by silently INFLATING the hours used for packing
    far past what the learner actually said they have (a real 5h/week
    learner with ~150h of real course content and a 12-week target was
    packed as if they had 13h/week - 2.6x their stated capacity), then
    clamping any overflow week down onto the target week, which could pile
    multiple weeks' worth of content onto one displayed week. Live-verified
    against a real production path: a learner who stated weekly_hours=8 was
    seeing every week claim 16h - exactly double their real capacity.

    That's the same class of problem this whole app has otherwise gone out
    of its way to never do to a learner (fabricated numbers presented as
    real). The honest fix: always pack at the learner's REAL weekly_hours;
    if that genuinely needs more weeks than the target, say so (see
    assign_week_numbers's returned {weeks_used, target_weeks, over_target}
    and the frontend's pacing banner) instead of hiding it. The real lever
    for keeping timelines reasonable is choosing an appropriately-scoped
    course selection at generation time (path_generate.txt already asks the
    LLM to fit target_timeline_weeks when picking courses) - not lying about
    the learner's own stated hours after the fact.
    """

    def test_extract_target_weeks(self):
        from app.services.profile_service import extract_target_weeks

        assert extract_target_weeks("I want to become a full stack developer in 13 weeks") == 13
        assert extract_target_weeks("13 weeks") == 13
        assert extract_target_weeks("12-week roadmap") == 12
        assert extract_target_weeks("within 3 months") == 13
        assert extract_target_weeks("within 6 months") == 26
        assert extract_target_weeks("General Software Engineer") is None

    def test_week_packing_never_exceeds_the_learners_real_weekly_hours(self):
        """plan_weeks_with_splits itself was never buggy - it correctly packs
        to whatever weekly_hours it's given. The bug was in what
        assign_week_numbers passed it. This asserts the honest invariant
        directly: packing at the learner's REAL stated hours, no single
        week's real total ever exceeds that real number - not an inflated
        stand-in for it."""
        from app.services.roadmap_service import plan_weeks_with_splits

        sample_courses = [
            {"course_id": f"c{i}", "duration_hrs": 20}
            for i in range(7)  # 140 total hours
        ]
        user_weekly_hours = 2  # low, real, stated capacity - never inflated

        plan = plan_weeks_with_splits(sample_courses, user_weekly_hours)

        weekly_totals: dict[int, float] = {}
        for parts in plan:
            for p in parts:
                weekly_totals[p["week_number"]] = weekly_totals.get(p["week_number"], 0) + p["part_hours"]
        assert all(total <= user_weekly_hours + 1e-9 for total in weekly_totals.values())
        # 140h at a real 2h/week honestly needs 70 weeks - this is the
        # correct, honest answer, not something to hide behind a fake
        # higher hours-per-week number.
        assert max(weekly_totals.keys()) == 70

    def test_assign_week_numbers_never_inflates_hours_and_reports_honest_pacing(self):
        """Real regression test for the live-verified production bug: a
        learner with weekly_hours=8 and a 7-week target was seeing every
        week claim 16h. Mocks the DB read to return one 100h pending course
        (realistic multi-course total) and asserts every week the function
        actually writes never exceeds the REAL weekly_hours=8, and that it
        honestly reports needing more than the requested 7 weeks instead of
        silently claiming it fit."""
        from unittest.mock import MagicMock, patch
        from app.services import roadmap_service

        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
            data=[{
                "id": "step-1", "sequence_order": 1, "course_id": "course-1",
                "milestone_label": "Foundations", "explanation": "why", "status": "not_started",
                "week_number": None, "courses": {"duration_hrs": 100},
            }]
        )

        with patch("app.services.roadmap_service.supabase_client", mock_supabase), \
             patch("app.services.roadmap_service._has_parts_schema", return_value=True):
            result = roadmap_service.assign_week_numbers("path-1", weekly_hours=8, target_weeks=7)

        # Every write this function made must carry a real, non-inflated
        # part_hours - never more than the learner's actual weekly_hours.
        for call in mock_table.update.call_args_list:
            payload = call[0][0]
            if "part_hours" in payload:
                assert payload["part_hours"] <= 8 + 1e-9, f"inflated part_hours found: {payload}"

        assert result["target_weeks"] == 7
        assert result["weeks_used"] == 13  # 100h / 8h-per-week, honestly
        assert result["over_target"] is True
