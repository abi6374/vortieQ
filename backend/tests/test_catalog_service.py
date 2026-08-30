"""Tests for the dynamic catalog ingestion pipeline (migration 007):
provider_resources + resource_verification + promotion into `courses`.
No live network calls - reachability checks are mocked.
"""
from unittest.mock import MagicMock, patch

import pytest

from app.services import catalog_service


class TestIngestWebResult:
    def test_rejects_result_missing_url_or_title(self):
        assert catalog_service.ingest_web_result({"title": "No URL here"}) is None
        assert catalog_service.ingest_web_result({"url": "https://example.com"}) is None

    def test_dedups_by_canonical_url_without_re_verifying(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "existing-id", "canonical_url": "https://real.example/course"}]
        )
        with patch("app.services.catalog_service.supabase_client", mock_supabase):
            result = catalog_service.ingest_web_result(
                {"title": "A Course", "url": "https://real.example/course"}
            )
        assert result["id"] == "existing-id"
        mock_table.insert.assert_not_called()

    def test_new_result_is_inserted_then_verified(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_table.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "new-resource-id", "canonical_url": "https://real.example/new"}]
        )
        with patch("app.services.catalog_service.supabase_client", mock_supabase), \
             patch("app.services.catalog_service.validate_resource_url", return_value=True), \
             patch("app.services.catalog_service._check_url", return_value={
                 "https_ok": True, "domain_allowed": True, "reachable": True, "http_status": 200,
             }):
            result = catalog_service.ingest_web_result(
                {"title": "New Course", "url": "https://real.example/new", "snippet": "Learn things"}
            )
        assert result is not None
        # First insert() call is the provider_resources row - a second
        # follows for resource_verification (same mocked table object, since
        # this test doesn't discriminate by table name).
        insert_payload = mock_table.insert.call_args_list[0].args[0]
        assert insert_payload["source"] == "web_search"
        assert insert_payload["canonical_url"] == "https://real.example/new"
        assert insert_payload["availability_status"] == "unverified"  # true at insert time

    def test_unreachable_result_marked_unavailable_not_dropped_silently(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_table.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "dead-resource-id", "canonical_url": "https://dead.example/gone"}]
        )
        with patch("app.services.catalog_service.supabase_client", mock_supabase), \
             patch("app.services.catalog_service._check_url", return_value={
                 "https_ok": True, "domain_allowed": True, "reachable": False, "http_status": 404,
             }):
            result = catalog_service.ingest_web_result(
                {"title": "Dead Link", "url": "https://dead.example/gone"}
            )
        # Real record is kept (with provenance) but honestly marked unavailable -
        # never silently dropped and never marked available when it isn't.
        assert result["availability_status"] == "unavailable"
        update_call = mock_table.update.call_args[0][0]
        assert update_call["availability_status"] == "unavailable"


class TestPromoteToCourse:
    def test_refuses_to_promote_an_unverified_resource(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "r1", "availability_status": "unverified", "promoted_course_id": None}]
        )
        with patch("app.services.catalog_service.supabase_client", mock_supabase):
            with pytest.raises(catalog_service.ResourceValidationError):
                catalog_service.promote_to_course("r1")
        # Never even attempts the courses insert.
        assert all(c.args[0] != "courses" for c in mock_supabase.table.call_args_list if c.args)

    def test_promoting_an_already_promoted_resource_is_idempotent(self):
        mock_supabase = MagicMock()

        def table(name):
            t = MagicMock()
            if name == "provider_resources":
                t.select.return_value.eq.return_value.execute.return_value = MagicMock(
                    data=[{"id": "r1", "availability_status": "available", "promoted_course_id": "c1"}]
                )
            elif name == "courses":
                t.select.return_value.eq.return_value.execute.return_value = MagicMock(
                    data=[{"id": "c1", "title": "Already Promoted"}]
                )
            return t

        mock_supabase.table.side_effect = table
        with patch("app.services.catalog_service.supabase_client", mock_supabase):
            course = catalog_service.promote_to_course("r1")
        assert course["id"] == "c1"

    def test_promotes_a_verified_resource_with_real_embedding(self):
        mock_supabase = MagicMock()

        def table(name):
            t = MagicMock()
            if name == "provider_resources":
                t.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[{
                    "id": "r1", "availability_status": "available", "promoted_course_id": None,
                    "title": "Verified Course", "description": "desc", "provider": "Web",
                    "difficulty": "beginner", "duration_hrs": 5,
                    "canonical_url": "https://real.example/course", "skill_tags": ["python"],
                    "last_checked_at": "2026-01-01T00:00:00Z",
                }])
                t.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{"id": "r1"}])
            elif name == "courses":
                t.insert.return_value.execute.return_value = MagicMock(data=[{"id": "new-course-id"}])
            return t

        mock_supabase.table.side_effect = table
        with patch("app.services.catalog_service.supabase_client", mock_supabase), \
             patch("app.ml.embedder.embed_text", return_value=[0.1] * 384):
            course = catalog_service.promote_to_course("r1")
        assert course["id"] == "new-course-id"
