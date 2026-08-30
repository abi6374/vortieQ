"""Tests for the YouTube Data API v3 provider adapter (Phase 3 continuation).

No live network calls or real API key - httpx is mocked throughout. Every
scenario here mirrors a real failure mode the official API can actually
produce (missing key, quota exhaustion, a private/deleted/non-embeddable
video, a malformed payload) - see youtube_provider.py's module docstring
for why each must degrade to an honest empty result, never a fabricated
substitute.
"""
from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.services import youtube_provider
from app.services.youtube_provider import YouTubeProviderAdapter, YouTubeQuotaExceeded


@pytest.fixture(autouse=True)
def _clear_search_cache():
    # _search_cache is a module-level dict shared across every adapter
    # instance (by design - it's a real quota-saving cache, not per-
    # instance state). Several tests below reuse the same query string
    # ("python tutorial"), so without clearing this between tests, a
    # later test would silently get an earlier test's cached (possibly
    # empty, possibly mocked-differently) result instead of exercising
    # its own mocks - a false pass/fail unrelated to the code under test.
    youtube_provider._search_cache.clear()
    yield
    youtube_provider._search_cache.clear()


def _video_item(
    video_id="dQw4w9WgXcQ",
    title="Learn Python in 30 Minutes",
    description="A real tutorial covering Python basics, variables, and functions." + " padding" * 10,
    duration="PT25M30S",
    privacy="public",
    embeddable=True,
    upload_status="processed",
    channel_id="UC_real_channel",
    channel_title="Real Education Channel",
):
    return {
        "id": video_id,
        "snippet": {
            "title": title,
            "description": description,
            "channelId": channel_id,
            "channelTitle": channel_title,
            "publishedAt": "2024-01-01T00:00:00Z",
            "defaultAudioLanguage": "en",
        },
        "contentDetails": {"duration": duration},
        "status": {"privacyStatus": privacy, "embeddable": embeddable, "uploadStatus": upload_status},
    }


class TestVideoIdExtraction:
    def test_extracts_from_bare_id(self):
        assert youtube_provider.extract_video_id("dQw4w9WgXcQ") == "dQw4w9WgXcQ"

    def test_extracts_from_watch_url(self):
        assert youtube_provider.extract_video_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s") == "dQw4w9WgXcQ"

    def test_extracts_from_short_url(self):
        assert youtube_provider.extract_video_id("https://youtu.be/dQw4w9WgXcQ") == "dQw4w9WgXcQ"

    def test_extracts_from_embed_url(self):
        assert youtube_provider.extract_video_id("https://www.youtube.com/embed/dQw4w9WgXcQ") == "dQw4w9WgXcQ"

    def test_rejects_invalid_id(self):
        assert youtube_provider.extract_video_id("not-a-real-id") is None
        assert youtube_provider.extract_video_id("") is None
        assert youtube_provider.extract_video_id(None) is None

    def test_rejects_malformed_url(self):
        assert youtube_provider.extract_video_id("https://example.com/watch?v=dQw4w9WgXcQ") is None
        assert youtube_provider.extract_video_id("not a url at all !!") is None

    def test_canonical_url_is_deterministic(self):
        assert youtube_provider.canonical_video_url("dQw4w9WgXcQ") == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


class TestDurationParsing:
    def test_parses_minutes_and_seconds(self):
        assert youtube_provider.parse_iso8601_duration("PT15M33S") == 15 * 60 + 33

    def test_parses_hours(self):
        assert youtube_provider.parse_iso8601_duration("PT1H2M3S") == 3600 + 120 + 3

    def test_parses_days(self):
        assert youtube_provider.parse_iso8601_duration("P1DT2H") == 86400 + 7200

    def test_rejects_malformed_duration_as_none_not_zero(self):
        # Critical: an unparseable duration must be None (honestly unknown),
        # never silently 0 - a 0-second video would otherwise be treated
        # as real and then rejected by the MIN_DURATION_SECONDS check for
        # the wrong reason (looks like a bug, not a deliberate rejection).
        assert youtube_provider.parse_iso8601_duration("not-a-duration") is None
        assert youtube_provider.parse_iso8601_duration("") is None
        assert youtube_provider.parse_iso8601_duration(None) is None


class TestMissingOrInvalidKey:
    def test_search_returns_empty_when_no_key_configured(self):
        adapter = YouTubeProviderAdapter(api_key=None)
        # Force "not configured" explicitly (constructor treats None as
        # "use the real settings value" otherwise).
        adapter.api_key = ""
        assert adapter.is_configured is False
        assert adapter.search_videos("python tutorial") == []

    def test_is_configured_reflects_real_settings_when_key_present(self):
        with patch("app.services.youtube_provider.settings") as mock_settings:
            mock_settings.YOUTUBE_API_KEY = "real-key-value"
            adapter = YouTubeProviderAdapter()
        assert adapter.is_configured is True

    def test_invalid_key_surfaces_as_api_error_not_a_crash(self):
        adapter = YouTubeProviderAdapter(api_key="invalid-key")
        mock_response = MagicMock(status_code=400)
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Bad Request", request=MagicMock(), response=mock_response
        )
        with patch("httpx.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.get.return_value = mock_response
            mock_client_cls.return_value.__enter__.return_value = mock_client
            result = adapter.search_videos("python tutorial")
        assert result == []  # honest empty result, no exception escapes


class TestQuotaExhaustion:
    def test_quota_exceeded_returns_empty_not_an_exception(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        quota_response = MagicMock(status_code=403)
        quota_response.json.return_value = {"error": {"errors": [{"reason": "quotaExceeded"}]}}
        with patch("httpx.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.get.return_value = quota_response
            mock_client_cls.return_value.__enter__.return_value = mock_client
            result = adapter.search_videos("python tutorial")
        assert result == []


class TestApiTimeoutOrError:
    def test_timeout_returns_empty_after_one_retry(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        with patch("httpx.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.get.side_effect = httpx.TimeoutException("timed out")
            mock_client_cls.return_value.__enter__.return_value = mock_client
            result = adapter.search_videos("python tutorial")
        assert result == []
        # One initial attempt + one retry, never more (a live request is waiting).
        assert mock_client.get.call_count == 2

    def test_transport_error_returns_empty(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        with patch("httpx.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.get.side_effect = httpx.ConnectError("connection refused")
            mock_client_cls.return_value.__enter__.return_value = mock_client
            result = adapter.search_videos("python tutorial")
        assert result == []


class TestMalformedPayload:
    def test_missing_items_key_returns_empty(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        with patch.object(adapter, "_get", return_value={"unexpected": "shape"}):
            assert adapter._search_video_ids("python", 5) == []

    def test_items_not_a_list_returns_empty(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        with patch.object(adapter, "_get", return_value={"items": "not-a-list"}):
            assert adapter._search_video_ids("python", 5) == []

    def test_video_details_missing_fields_rejected_not_crashed(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        malformed = {"id": "dQw4w9WgXcQ"}  # no snippet/contentDetails/status at all
        assert adapter._validate_and_score(malformed, []) is None

    def test_non_dict_item_rejected(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        assert adapter._validate_and_score("not-a-dict", []) is None
        assert adapter._validate_and_score(None, []) is None


class TestValidationRejections:
    def test_rejects_private_video(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        item = _video_item(privacy="private")
        assert adapter._validate_and_score(item, []) is None

    def test_rejects_non_embeddable_video(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        item = _video_item(embeddable=False)
        assert adapter._validate_and_score(item, []) is None

    def test_rejects_unprocessed_upload(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        item = _video_item(upload_status="rejected")
        assert adapter._validate_and_score(item, []) is None

    def test_rejects_missing_title(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        item = _video_item(title="")
        assert adapter._validate_and_score(item, []) is None

    def test_rejects_too_short_duration(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        item = _video_item(duration="PT10S")  # under MIN_DURATION_SECONDS
        assert adapter._validate_and_score(item, []) is None

    def test_rejects_too_long_duration(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        item = _video_item(duration="PT5H")  # over MAX_DURATION_SECONDS
        assert adapter._validate_and_score(item, []) is None

    def test_rejects_unparseable_duration(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        item = _video_item(duration="garbage")
        assert adapter._validate_and_score(item, []) is None

    def test_accepts_a_real_valid_video(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        item = _video_item()
        result = adapter._validate_and_score(item, [])
        assert result is not None
        assert result["external_id"] == "dQw4w9WgXcQ"
        assert result["canonical_url"] == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        assert result["duration_seconds"] == 25 * 60 + 30
        assert result["resource_type"] == "video"
        assert result["provider"] == "YouTube"

    def test_sanitizes_control_characters_in_description(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        item = _video_item(description="Real content\x00\x07 with control chars" + " padding" * 15)
        result = adapter._validate_and_score(item, [])
        assert result is not None
        assert "\x00" not in result["description"]
        assert "\x07" not in result["description"]


class TestQualityScoring:
    def test_untrusted_channel_no_skill_match_scores_low(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        item = _video_item(duration="PT2M", description="short")  # outside 5-90min bonus range, short desc
        result = adapter._validate_and_score(item, [])
        assert result is not None
        assert result["quality_score"] < youtube_provider.MIN_QUALITY_SCORE

    def test_real_skill_match_through_taxonomy_raises_score(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        item = _video_item(title="Python Tutorial", description="Learn Python basics." + " padding" * 15)
        with patch("app.services.taxonomy_service.resolve_skill", return_value="skill-python-id"):
            result = adapter._validate_and_score(item, ["Python"])
        assert result is not None
        assert any("Python" in r for r in result["quality_reasons"])
        assert result["quality_score"] > 0

    def test_unresolved_skill_tag_never_credited(self):
        """A skill tag that doesn't resolve through the real taxonomy must
        not be credited just because the word happens to appear in the
        title - "canonical skills inferred only through controlled
        taxonomy mapping," not raw keyword matching."""
        adapter = YouTubeProviderAdapter(api_key="real-key")
        item = _video_item(title="Python Tutorial", description="Learn Python." + " padding" * 15)
        with patch("app.services.taxonomy_service.resolve_skill", return_value=None):
            result = adapter._validate_and_score(item, ["Python"])
        assert result is not None
        assert not any("real requested skill" in r for r in result["quality_reasons"])

    def test_trusted_channel_allowlist_awards_points_when_populated(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        item = _video_item(channel_id="UC_verified_test_channel")
        with patch.object(youtube_provider, "TRUSTED_YOUTUBE_CHANNEL_IDS", {"UC_verified_test_channel"}):
            result = adapter._validate_and_score(item, [])
        assert result is not None
        assert any("allowlist" in r for r in result["quality_reasons"])

    def test_low_quality_video_excluded_from_search_results(self):
        """search_videos applies the MIN_QUALITY_SCORE bar - a validated
        but low-quality video must not reach the caller."""
        adapter = YouTubeProviderAdapter(api_key="real-key")
        low_quality_item = _video_item(duration="PT2M", description="x")
        with patch.object(adapter, "_search_video_ids", return_value=["dQw4w9WgXcQ"]), \
             patch.object(adapter, "_fetch_video_details", return_value=[low_quality_item]):
            results = adapter.search_videos("python")
        assert results == []


class TestSearchVideosEndToEnd:
    def test_returns_only_eligible_verified_videos(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        good_item = _video_item(video_id="goodvideo01", title="Python Tutorial for Beginners",
                                 description="A complete walkthrough of Python fundamentals." + " padding" * 10)
        private_item = _video_item(video_id="privatevid1", privacy="private")
        # _score_quality resolves each skill tag through the real taxonomy
        # service - unmocked, that hits the live skill_aliases table. This
        # test only cares about eligibility filtering, not taxonomy scoring.
        with patch.object(adapter, "_search_video_ids", return_value=["goodvideo01", "privatevid1"]), \
             patch.object(adapter, "_fetch_video_details", return_value=[good_item, private_item]), \
             patch("app.services.taxonomy_service.resolve_skill", return_value=None):
            results = adapter.search_videos("python tutorial", skill_tags=["Python"])
        assert len(results) == 1
        assert results[0]["external_id"] == "goodvideo01"

    def test_caches_results_within_ttl(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        good_item = _video_item()
        with patch.object(adapter, "_search_video_ids", return_value=["dQw4w9WgXcQ"]) as mock_search, \
             patch.object(adapter, "_fetch_video_details", return_value=[good_item]):
            adapter.search_videos("python tutorial cache test")
            adapter.search_videos("python tutorial cache test")
        mock_search.assert_called_once()  # second call served from cache, no second API round-trip

    def test_empty_query_returns_empty_without_an_api_call(self):
        adapter = YouTubeProviderAdapter(api_key="real-key")
        with patch.object(adapter, "_search_video_ids") as mock_search:
            assert adapter.search_videos("   ") == []
        mock_search.assert_not_called()
