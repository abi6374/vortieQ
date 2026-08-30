"""Tests for the dynamic catalog ingestion pipeline (migration 007):
provider_resources + resource_verification + promotion into `courses`.
No live network calls - reachability checks are mocked.
"""
from unittest.mock import MagicMock, patch

import pytest

from app.services import catalog_service


class TestUrlCanonicalizationAndTrust:
    def test_canonicalize_strips_tracking_params_and_trailing_slash(self):
        a = catalog_service.canonicalize_url("https://Real.Example/course/?utm_source=x&ref=y&id=42")
        assert a == "https://real.example/course?id=42"  # real param kept, tracking params stripped

        b = catalog_service.canonicalize_url("https://real.example/course/?utm_source=newsletter")
        assert b == "https://real.example/course"  # trailing slash and tracking-only query both gone

    def test_canonicalize_lowercases_host_but_not_path(self):
        assert catalog_service.canonicalize_url("https://EXAMPLE.com/Course-Name") == "https://example.com/Course-Name"

    def test_canonicalize_returns_input_unchanged_for_malformed_url(self):
        assert catalog_service.canonicalize_url("not a url") == "not a url"

    def test_trusted_provider_domain_recognizes_known_provider(self):
        assert catalog_service.is_trusted_provider_domain("https://www.coursera.org/learn/python") is True
        assert catalog_service.is_trusted_provider_domain("https://some-random-blog.example/post") is False

    def test_shortener_domain_rejected_even_when_reachable(self):
        # "reject... unapproved shorteners" - a shortener must be rejected on
        # domain grounds alone, without even attempting the live reachability
        # check that would otherwise happily confirm bit.ly itself is up.
        v = catalog_service._check_url("https://bit.ly/3xample")
        assert v["domain_allowed"] is False
        assert v["reachable"] is False  # never even attempted

    def test_bare_search_engine_homepage_still_rejected(self):
        # Regression guard for the pre-existing blocklist behavior, now
        # sharing the same domain_allowed gate as the new shortener check.
        v = catalog_service._check_url("https://www.google.com")
        assert v["domain_allowed"] is False


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

    def test_dedups_a_url_that_only_differs_by_tracking_params(self):
        """Real gap this closes: previously ingest_web_result matched
        canonical_url as an exact string, so the SAME real resource
        reachable via a tracking-param-decorated link would have been
        ingested as a second, distinct provider_resources row."""
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        # The lookup must be keyed by the CANONICALIZED url, not the raw one.
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "existing-id", "canonical_url": "https://real.example/course"}]
        )
        with patch("app.services.catalog_service.supabase_client", mock_supabase):
            result = catalog_service.ingest_web_result(
                {"title": "A Course", "url": "https://real.example/course/?utm_source=newsletter&utm_medium=email"}
            )
        assert result["id"] == "existing-id"
        mock_table.insert.assert_not_called()
        looked_up_url = mock_table.select.return_value.eq.call_args[0][1]
        assert looked_up_url == "https://real.example/course"

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

    def test_ingested_result_from_a_trusted_provider_is_flagged(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_table.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "trusted-id", "canonical_url": "https://www.coursera.org/learn/python"}]
        )
        with patch("app.services.catalog_service.supabase_client", mock_supabase), \
             patch("app.services.catalog_service._check_url", return_value={
                 "https_ok": True, "domain_allowed": True, "reachable": True, "http_status": 200,
             }):
            catalog_service.ingest_web_result(
                {"title": "Python Course", "url": "https://www.coursera.org/learn/python"}
            )
        insert_payload = mock_table.insert.call_args_list[0].args[0]
        assert insert_payload["is_trusted_domain"] is True

    def test_ingested_result_from_an_unrecognized_domain_is_not_flagged(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_table.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "random-id", "canonical_url": "https://some-random-blog.example/post"}]
        )
        with patch("app.services.catalog_service.supabase_client", mock_supabase), \
             patch("app.services.catalog_service._check_url", return_value={
                 "https_ok": True, "domain_allowed": True, "reachable": True, "http_status": 200,
             }):
            catalog_service.ingest_web_result(
                {"title": "Random Post", "url": "https://some-random-blog.example/post"}
            )
        insert_payload = mock_table.insert.call_args_list[0].args[0]
        assert insert_payload["is_trusted_domain"] is False

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


def _youtube_video(
    external_id="dQw4w9WgXcQ",
    title="Real Python Tutorial",
    canonical_url=None,
):
    return {
        "external_id": external_id,
        "canonical_url": canonical_url or f"https://www.youtube.com/watch?v={external_id}",
        "title": title,
        "description": "A real tutorial description.",
        "channel_id": "UC_real_channel",
        "channel_title": "Real Channel",
        "published_at": "2024-01-01T00:00:00Z",
        "language": "en",
        "duration_hrs": 0.42,
        "resource_type": "video",
        "provider": "YouTube",
        "quality_score": 0.6,
        "quality_reasons": ["duration fits a typical tutorial length (5-90 min)"],
    }


class TestIngestYoutubeResult:
    def test_rejects_video_missing_required_fields(self):
        assert catalog_service.ingest_youtube_result({}) is None
        assert catalog_service.ingest_youtube_result({"external_id": "x"}) is None

    def test_dedups_by_external_id_without_reinserting(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "existing-id", "external_id": "dQw4w9WgXcQ"}]
        )
        with patch("app.services.catalog_service.supabase_client", mock_supabase):
            result = catalog_service.ingest_youtube_result(_youtube_video())
        assert result["id"] == "existing-id"
        mock_table.insert.assert_not_called()

    def test_dedups_by_canonical_url_when_external_id_lookup_misses(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        # First lookup (by source+external_id) misses; second (by canonical_url) hits.
        mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "existing-by-url", "canonical_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}]
        )
        with patch("app.services.catalog_service.supabase_client", mock_supabase):
            result = catalog_service.ingest_youtube_result(_youtube_video())
        assert result["id"] == "existing-by-url"
        mock_table.insert.assert_not_called()

    def test_new_video_is_inserted_with_real_provenance_and_verified(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_table.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "new-yt-id", "canonical_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}]
        )
        with patch("app.services.catalog_service.supabase_client", mock_supabase), \
             patch("app.services.catalog_service._check_url", return_value={
                 "https_ok": True, "domain_allowed": True, "reachable": True, "http_status": 200,
             }):
            result = catalog_service.ingest_youtube_result(_youtube_video(), skill_tags=["Python"])
        assert result is not None
        insert_payload = mock_table.insert.call_args_list[0].args[0]
        assert insert_payload["source"] == "youtube"
        assert insert_payload["provider"] == "YouTube"
        assert insert_payload["external_id"] == "dQw4w9WgXcQ"
        assert insert_payload["channel_id"] == "UC_real_channel"
        assert insert_payload["format"] == "video"
        assert insert_payload["cost"] == "free"
        assert insert_payload["is_trusted_domain"] is True  # youtube.com is in TRUSTED_PROVIDER_DOMAINS
        assert insert_payload["quality_score"] == 0.6

    def test_duplicate_canonical_urls_with_tracking_params_still_dedup(self):
        """A video reached via a tracking-param-decorated URL must
        canonicalize to the same key as the plain one before either
        dedup lookup."""
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "existing-id"}]
        )
        video = _youtube_video(canonical_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=share")
        with patch("app.services.catalog_service.supabase_client", mock_supabase):
            result = catalog_service.ingest_youtube_result(video)
        assert result["id"] == "existing-id"
        looked_up_url = mock_table.select.return_value.eq.call_args[0][1]
        assert looked_up_url == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # tracking param stripped

    def test_unreachable_video_marked_unavailable_not_dropped(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_table.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "yt-dead-id", "canonical_url": "https://www.youtube.com/watch?v=deadvideo1"}]
        )
        with patch("app.services.catalog_service.supabase_client", mock_supabase), \
             patch("app.services.catalog_service._check_url", return_value={
                 "https_ok": True, "domain_allowed": True, "reachable": False, "http_status": 404,
             }):
            result = catalog_service.ingest_youtube_result(_youtube_video(external_id="deadvideo1"))
        assert result["availability_status"] == "unavailable"


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
                    "last_checked_at": "2026-01-01T00:00:00Z", "is_trusted_domain": False,
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

    def test_promotion_carries_the_trust_flag_forward(self):
        mock_supabase = MagicMock()
        captured_insert = {}

        def table(name):
            t = MagicMock()
            if name == "provider_resources":
                t.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[{
                    "id": "r1", "availability_status": "available", "promoted_course_id": None,
                    "title": "Verified Course", "description": "desc", "provider": "Coursera",
                    "difficulty": "beginner", "duration_hrs": 5,
                    "canonical_url": "https://www.coursera.org/learn/x", "skill_tags": ["python"],
                    "last_checked_at": "2026-01-01T00:00:00Z", "is_trusted_domain": True,
                }])
                t.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{"id": "r1"}])
            elif name == "courses":
                def insert(payload):
                    captured_insert.update(payload)
                    return MagicMock(execute=MagicMock(return_value=MagicMock(data=[{"id": "new-course-id"}])))
                t.insert.side_effect = insert
            return t

        mock_supabase.table.side_effect = table
        with patch("app.services.catalog_service.supabase_client", mock_supabase), \
             patch("app.ml.embedder.embed_text", return_value=[0.1] * 384):
            catalog_service.promote_to_course("r1")
        assert captured_insert["is_trusted_domain"] is True
