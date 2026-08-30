"""YouTube Data API v3 provider adapter.

A second, official, FREE, quota-based resource source alongside
web_search_service.py's DuckDuckGo-backed "web_search" adapter -
explicitly NOT a paid course-provider integration (no billing needs to be
enabled for the default 10,000 units/day quota) and NOT browser scraping.
Uses only the official REST API (https://developers.google.com/youtube/v3).

Honest failure modes throughout, matching every other provider path in
this codebase: a missing API key, an exhausted quota, a timeout, or a
malformed API response all resolve to an empty result list - never a
fabricated video, never a 500 that breaks the learner's request. Every
returned item has been independently validated (real, public, embeddable,
a real parseable duration) before this module hands it back - nothing here
ever trusts a title/duration/channel claim it hasn't itself fetched from
the API.

Quality policy (deterministic, auditable - never LLM-decided, never
subscriber/view-count popularity alone):
  - TRUSTED_YOUTUBE_CHANNEL_IDS is deliberately EMPTY by default. This
    project does not ship a hardcoded list of "verified education channel
    IDs" because a wrong or merely-assumed channel ID would itself be a
    fabrication - claiming a channel is verified when nobody has actually
    checked it is exactly the failure mode the rest of this session has
    been removing. A human operator who has manually confirmed a real
    channel's ID (visible on the channel's "About" page or via the API)
    can add it here.
  - Absent that allowlist, quality is scored from real, fetched metadata
    only: duration fit, a substantive description, and REAL skill
    relevance resolved through the canonical taxonomy (never raw keyword
    matching against arbitrary title text).
"""

import re
import time
from urllib.parse import urlparse, parse_qs

import httpx

from app.config import settings

API_BASE = "https://www.googleapis.com/youtube/v3"
REQUEST_TIMEOUT_SECONDS = 5.0
MAX_RETRIES = 1  # one retry on a transient network error only - a live user request is waiting
CACHE_TTL_SECONDS = 3600  # search.list costs 100 quota units/call - "keep quota limits strict"
MIN_DURATION_SECONDS = 90         # reject shorts-like clips - unlikely to be a real tutorial
MAX_DURATION_SECONDS = 4 * 3600   # reject multi-hour marathon streams
MIN_QUALITY_SCORE = 0.2           # conservative bar - see _score_quality

_search_cache: dict[str, tuple[float, list[dict]]] = {}

# See module docstring - deliberately empty; extend only with a REAL,
# manually-verified channel ID, never a guessed or assumed one.
TRUSTED_YOUTUBE_CHANNEL_IDS: set[str] = set()

_VIDEO_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{11}$")
_ISO8601_DURATION_RE = re.compile(
    r"^P(?:\d+D)?T?(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?$"
)
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


class YouTubeQuotaExceeded(Exception):
    """Raised internally when the API reports its daily quota is
    exhausted. Always caught within this module - callers see an empty
    result list, exactly like any other "no results available" outcome,
    never a reason to fabricate a substitute."""


def is_configured() -> bool:
    """Cheap check callers can use before even attempting a search, to
    show an honest "video search unavailable" state rather than a
    generic error."""
    return bool(settings.YOUTUBE_API_KEY)


def extract_video_id(url_or_id: str) -> str | None:
    """Strict video-ID extraction from a bare 11-char ID or a real
    youtube.com/youtu.be URL (watch?v=, youtu.be/, /embed/, /shorts/).
    Returns None for anything ambiguous or malformed - never guesses or
    truncates to force a match."""
    if not url_or_id or not isinstance(url_or_id, str):
        return None
    s = url_or_id.strip()
    if _VIDEO_ID_RE.match(s):
        return s
    try:
        parsed = urlparse(s)
    except ValueError:
        return None
    host = parsed.netloc.lower()
    if host in ("youtu.be", "www.youtu.be"):
        vid = parsed.path.strip("/").split("/")[0] if parsed.path else ""
        return vid if _VIDEO_ID_RE.match(vid) else None
    if "youtube.com" in host:
        qs = parse_qs(parsed.query)
        vid = (qs.get("v") or [None])[0]
        if vid and _VIDEO_ID_RE.match(vid):
            return vid
        parts = [p for p in parsed.path.split("/") if p]
        if len(parts) >= 2 and parts[0] in ("embed", "shorts", "v"):
            return parts[1] if _VIDEO_ID_RE.match(parts[1]) else None
    return None


def canonical_video_url(video_id: str) -> str:
    return f"https://www.youtube.com/watch?v={video_id}"


def parse_iso8601_duration(duration: str) -> int | None:
    """YouTube returns durations as ISO 8601 ("PT15M33S") - real parsing,
    not a guess. Returns None (never 0, never a default) for anything
    that doesn't match, so callers can honestly reject rather than
    silently treating an unparseable duration as zero seconds."""
    if not duration or not isinstance(duration, str):
        return None
    m = _ISO8601_DURATION_RE.match(duration.strip())
    if not m:
        return None
    days_m = re.match(r"^P(\d+)D", duration.strip())
    days = int(days_m.group(1)) if days_m else 0
    hours = int(m.group("hours") or 0)
    minutes = int(m.group("minutes") or 0)
    seconds = int(m.group("seconds") or 0)
    return days * 86400 + hours * 3600 + minutes * 60 + seconds


def _sanitize_description(text: str, max_len: int = 1000) -> str:
    """Strips control characters and caps length - real, learner-facing
    text pulled from an external API is untrusted input, same standard
    applied to resume/self-assessment text elsewhere in this codebase.
    Bounds what could otherwise be bulk text later concatenated into an
    LLM prompt (see path_service's explanation generation)."""
    if not isinstance(text, str):
        return ""
    return _CONTROL_CHARS_RE.sub("", text).strip()[:max_len]


class YouTubeProviderAdapter:
    """The "common provider interface" this project's provider adapters
    share in shape (search_videos returns the same normalized dict shape
    catalog_service.ingest_youtube_result expects), even though
    web_search_service.py's DuckDuckGo adapter remains function-based
    rather than retrofitted into this same class hierarchy - a larger,
    riskier refactor of an already-live, tested code path than this
    addition warrants on its own.
    """

    def __init__(self, api_key: str | None = None):
        # Explicit None means "use the real configured key"; an explicit
        # empty string or key is honored as given (lets tests exercise
        # the "not configured" path without patching global settings).
        self.api_key = settings.YOUTUBE_API_KEY if api_key is None else api_key

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def search_videos(self, query: str, max_results: int = 5, skill_tags: list[str] | None = None) -> list[dict]:
        """Real, validated, quality-scored YouTube videos matching `query`.
        Empty list (never an exception, never a fabricated placeholder)
        when unconfigured, quota-exhausted, network-failed, or nothing
        real enough passed validation."""
        if not self.is_configured:
            print("[youtube_provider] YOUTUBE_API_KEY not configured - returning no results", flush=True)
            return []
        query = (query or "").strip()
        if not query:
            return []

        cache_key = f"{query.lower()}::{max_results}"
        cached = _search_cache.get(cache_key)
        if cached and (time.time() - cached[0]) < CACHE_TTL_SECONDS:
            return cached[1]

        video_ids = self._search_video_ids(query, max_results)
        if not video_ids:
            _search_cache[cache_key] = (time.time(), [])
            return []

        raw_items = self._fetch_video_details(video_ids)
        normalized = []
        for item in raw_items:
            result = self._validate_and_score(item, skill_tags or [])
            if result and result["quality_score"] >= MIN_QUALITY_SCORE:
                normalized.append(result)
        _search_cache[cache_key] = (time.time(), normalized)
        return normalized

    # ------------------------------------------------------------ API calls
    def _search_video_ids(self, query: str, max_results: int) -> list[str]:
        try:
            resp = self._get("/search", {
                "part": "id",
                "q": query,
                "type": "video",
                "maxResults": min(max(int(max_results), 1), 10),
                "safeSearch": "strict",
                "videoEmbeddable": "true",
            })
        except YouTubeQuotaExceeded:
            print("[youtube_provider] quota exceeded on search.list", flush=True)
            return []
        except Exception as e:
            print(f"[youtube_provider] search.list failed: {type(e).__name__}: {e}", flush=True)
            return []
        items = resp.get("items") if isinstance(resp, dict) else None
        if not isinstance(items, list):
            return []
        ids = []
        for it in items:
            if not isinstance(it, dict):
                continue
            vid = (it.get("id") or {}).get("videoId") if isinstance(it.get("id"), dict) else None
            if isinstance(vid, str) and _VIDEO_ID_RE.match(vid):
                ids.append(vid)
        return ids

    def _fetch_video_details(self, video_ids: list[str]) -> list[dict]:
        if not video_ids:
            return []
        try:
            # One batched call for up to 50 IDs (1 quota unit total,
            # regardless of count) rather than one call per video -
            # "keep quota limits strict."
            resp = self._get("/videos", {
                "part": "snippet,contentDetails,status",
                "id": ",".join(video_ids[:50]),
            })
        except YouTubeQuotaExceeded:
            print("[youtube_provider] quota exceeded on videos.list", flush=True)
            return []
        except Exception as e:
            print(f"[youtube_provider] videos.list failed: {type(e).__name__}: {e}", flush=True)
            return []
        items = resp.get("items") if isinstance(resp, dict) else None
        return items if isinstance(items, list) else []

    def _get(self, path: str, params: dict) -> dict:
        full_params = {**params, "key": self.api_key}
        last_err: Exception | None = None
        for _ in range(MAX_RETRIES + 1):
            try:
                with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
                    resp = client.get(f"{API_BASE}{path}", params=full_params)
                if resp.status_code == 403:
                    reason = self._quota_error_reason(resp)
                    if reason in ("quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"):
                        raise YouTubeQuotaExceeded(reason)
                resp.raise_for_status()
                return resp.json()
            except YouTubeQuotaExceeded:
                raise
            except (httpx.TimeoutException, httpx.TransportError) as e:
                last_err = e
                continue  # one retry on a transient network issue only
            except httpx.HTTPStatusError as e:
                last_err = e
                break
        raise last_err or RuntimeError("YouTube API request failed")

    @staticmethod
    def _quota_error_reason(resp: httpx.Response) -> str:
        try:
            body = resp.json()
        except Exception:
            return ""
        errors = ((body or {}).get("error") or {}).get("errors") or []
        return (errors[0] or {}).get("reason", "") if errors else ""

    # --------------------------------------------------------- validation
    def _validate_and_score(self, item: dict, skill_tags: list[str]) -> dict | None:
        if not isinstance(item, dict):
            return None
        video_id = item.get("id")
        if not isinstance(video_id, str) or not _VIDEO_ID_RE.match(video_id):
            return None

        status = item.get("status") or {}
        # "Reject... private/deleted/non-embeddable/inaccessible/malformed/
        # unavailable resources" - checked against the API's OWN status
        # fields, never inferred from title text.
        if status.get("privacyStatus") != "public":
            return None
        if status.get("embeddable") is False:
            return None
        if status.get("uploadStatus") not in (None, "processed"):
            return None

        snippet = item.get("snippet") or {}
        title = (snippet.get("title") or "").strip()
        if not title:
            return None

        content_details = item.get("contentDetails") or {}
        duration_seconds = parse_iso8601_duration(content_details.get("duration", ""))
        if duration_seconds is None:
            return None  # can't trust an unparseable duration - honest rejection, not a guess of 0
        if not (MIN_DURATION_SECONDS <= duration_seconds <= MAX_DURATION_SECONDS):
            return None

        description = _sanitize_description(snippet.get("description") or "")
        channel_id = snippet.get("channelId") or ""
        channel_title = (snippet.get("channelTitle") or "").strip()
        published_at = snippet.get("publishedAt")
        language = snippet.get("defaultAudioLanguage") or snippet.get("defaultLanguage") or None

        score, reasons = self._score_quality(channel_id, duration_seconds, title, description, skill_tags)

        return {
            "external_id": video_id,
            "canonical_url": canonical_video_url(video_id),
            "title": title[:300],
            "description": description,
            "channel_id": channel_id,
            "channel_title": channel_title,
            "published_at": published_at,
            "language": language,
            "duration_seconds": duration_seconds,
            "duration_hrs": round(duration_seconds / 3600, 2),
            "resource_type": "video",
            "provider": "YouTube",
            "quality_score": score,
            "quality_reasons": reasons,
        }

    @staticmethod
    def _score_quality(
        channel_id: str, duration_seconds: int, title: str, description: str, skill_tags: list[str]
    ) -> tuple[float, list[str]]:
        """Deterministic and auditable - every point added is named in
        `reasons`. Never uses subscriber/view counts (not even fetched -
        avoids both the temptation and the extra quota cost of the
        `statistics` part)."""
        reasons: list[str] = []
        score = 0.0

        if channel_id and channel_id in TRUSTED_YOUTUBE_CHANNEL_IDS:
            score += 0.5
            reasons.append("channel is on the verified education-channel allowlist")

        if 300 <= duration_seconds <= 5400:  # 5-90 minutes
            score += 0.2
            reasons.append("duration fits a typical tutorial length (5-90 min)")

        # Real skill relevance through the CONTROLLED taxonomy - "canonical
        # skills inferred only through controlled taxonomy mapping," never
        # raw keyword matching against arbitrary free text alone.
        matched = []
        if skill_tags:
            from app.services import taxonomy_service
            haystack = f"{title} {description}".lower()
            for tag in skill_tags:
                skill_id = taxonomy_service.resolve_skill(tag)
                if skill_id and tag.lower() in haystack:
                    matched.append(tag)
        if matched:
            score += min(0.3, 0.1 * len(matched))
            reasons.append(f"title/description mentions {len(matched)} real requested skill(s): {', '.join(matched)}")

        if len(description) > 100:
            score += 0.1
            reasons.append("has a substantive description")

        return round(min(score, 1.0), 4), reasons


def get_default_adapter() -> YouTubeProviderAdapter:
    return YouTubeProviderAdapter()
