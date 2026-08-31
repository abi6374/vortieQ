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
    """Verifies that requested timelines (e.g. 13 weeks) are correctly parsed
    and that roadmap week assignment never balloons to 66 or 69 weeks."""

    def test_extract_target_weeks(self):
        from app.services.profile_service import extract_target_weeks

        assert extract_target_weeks("I want to become a full stack developer in 13 weeks") == 13
        assert extract_target_weeks("13 weeks") == 13
        assert extract_target_weeks("12-week roadmap") == 12
        assert extract_target_weeks("within 3 months") == 13
        assert extract_target_weeks("within 6 months") == 26
        assert extract_target_weeks("General Software Engineer") is None

    def test_week_packing_bounds_within_target_weeks(self):
        from app.services.roadmap_service import plan_weeks_with_splits
        import math

        sample_courses = [
            {"course_id": f"c{i}", "duration_hrs": 20}
            for i in range(7)  # 140 total hours
        ]
        target_weeks = 13
        user_weekly_hours = 2  # Low weekly hours that previously blew up to 70 weeks

        # Effective pacing formula
        effective_hours = max(user_weekly_hours, math.ceil(140 / target_weeks))
        plan = plan_weeks_with_splits(sample_courses, effective_hours)

        max_week = max(p["week_number"] for parts in plan for p in parts)
        assert max_week <= target_weeks  # Must strictly finish within 13 weeks!
