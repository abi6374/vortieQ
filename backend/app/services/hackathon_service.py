"""
hackathon_service.py — Fetches real hackathon data from:
  1. Apify Hackathon Scraper (if APIFY_API_TOKEN is set in .env)
  2. Devfolio direct scraper fallback (no key needed)

Data is normalized to a common schema and cached in Supabase.
"""

import os
import json
import time
import logging
import hashlib
from datetime import datetime, timezone
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# Lazy import Supabase so the module loads even without DB credentials
try:
    from app.services.supabase_client import supabase_client
    _HAS_SUPABASE = True
except Exception:
    supabase_client = None
    _HAS_SUPABASE = False

APIFY_TOKEN = os.environ.get("APIFY_API_TOKEN", "")
# Apify actor for hackathon data (Devpost + Devfolio aggregator)
APIFY_ACTOR_ID = "trudax/devpost-hackathon-scraper"
APIFY_DATASET_URL = "https://api.apify.com/v2/acts/{actor}/runs?token={token}"
APIFY_RESULTS_URL = "https://api.apify.com/v2/actor-runs/{run_id}/dataset/items?token={token}"

DEVFOLIO_API_URL = "https://api.devfolio.co/api/search/hackathons"
DEVFOLIO_GRAPHQL_URL = "https://api.devfolio.co/api/hackathons"

_CACHE: dict = {}
_CACHE_TTL = 3600  # 1 hour


def _compute_status(starts_at: Optional[str], ends_at: Optional[str]) -> str:
    now = datetime.now(timezone.utc)
    try:
        if starts_at:
            start = datetime.fromisoformat(starts_at.replace("Z", "+00:00"))
            if now < start:
                return "upcoming"
        if ends_at:
            end = datetime.fromisoformat(ends_at.replace("Z", "+00:00"))
            if now > end:
                return "ended"
        return "ongoing"
    except Exception:
        return "upcoming"


def _normalize_devfolio(raw: dict) -> dict:
    """Normalize a Devfolio hackathon record to VortieQ schema."""
    slug = raw.get("slug") or raw.get("id") or ""
    starts = raw.get("starts_at") or raw.get("start_date") or raw.get("startDate")
    ends = raw.get("ends_at") or raw.get("end_date") or raw.get("endDate")
    return {
        "id": hashlib.md5(f"devfolio:{slug}".encode()).hexdigest(),
        "external_id": slug,
        "source": "devfolio",
        "name": raw.get("name") or raw.get("title") or "Untitled Hackathon",
        "tagline": raw.get("tagline") or raw.get("description", "")[:120],
        "description": raw.get("description") or raw.get("tagline") or "",
        "starts_at": starts,
        "ends_at": ends,
        "registration_deadline": raw.get("submission_deadline") or raw.get("registrationDeadline") or ends,
        "location": raw.get("city") or raw.get("location") or "",
        "is_online": raw.get("is_online", True) or raw.get("online", True),
        "team_min": raw.get("min_team_size") or raw.get("teamMin") or 1,
        "team_max": raw.get("max_team_size") or raw.get("teamMax") or 4,
        "registration_url": raw.get("url") or raw.get("hackathon_url") or f"https://devfolio.co/hackathons/{slug}",
        "image_url": raw.get("cover_image") or raw.get("image_url") or "",
        "themes": raw.get("themes") or raw.get("tags") or [],
        "prizes": raw.get("prize_amount") or raw.get("prizes") or "",
        "status": _compute_status(starts, ends),
    }


def _normalize_devpost(raw: dict) -> dict:
    """Normalize a Devpost hackathon record to VortieQ schema."""
    starts = raw.get("submission_period_dates", {}).get("start") if isinstance(raw.get("submission_period_dates"), dict) else raw.get("starts_at")
    ends = raw.get("submission_period_dates", {}).get("end") if isinstance(raw.get("submission_period_dates"), dict) else raw.get("ends_at")
    slug = raw.get("url_name") or raw.get("id") or ""
    return {
        "id": hashlib.md5(f"devpost:{slug}".encode()).hexdigest(),
        "external_id": str(slug),
        "source": "devpost",
        "name": raw.get("title") or raw.get("name") or "Untitled",
        "tagline": raw.get("tagline") or (raw.get("title", "")[:120]),
        "description": raw.get("description") or raw.get("tagline") or "",
        "starts_at": starts,
        "ends_at": ends,
        "registration_deadline": raw.get("registrationDeadline") or ends,
        "location": raw.get("displayed_location", {}).get("location") if isinstance(raw.get("displayed_location"), dict) else (raw.get("location") or ""),
        "is_online": raw.get("online_only", True),
        "team_min": raw.get("minimum_team_size") or 1,
        "team_max": raw.get("maximum_team_size") or 5,
        "registration_url": raw.get("url") or f"https://devpost.com/hackathons/{slug}",
        "image_url": raw.get("thumbnail_url") or raw.get("cover_image_url") or "",
        "themes": raw.get("themes", []) if isinstance(raw.get("themes"), list) else [],
        "prizes": str(raw.get("prize_amount") or ""),
        "status": _compute_status(starts, ends),
    }


def _fetch_from_apify() -> list:
    """Trigger an Apify Devpost Hackathon Scraper run and retrieve results."""
    if not APIFY_TOKEN:
        return []
    try:
        # Trigger actor run
        run_url = f"https://api.apify.com/v2/acts/{APIFY_ACTOR_ID}/runs?token={APIFY_TOKEN}"
        run_resp = requests.post(
            run_url,
            json={"maxItems": 50},
            timeout=15
        )
        if run_resp.status_code not in (200, 201):
            logger.warning(f"Apify run trigger failed: {run_resp.status_code}")
            return []

        run_id = run_resp.json().get("data", {}).get("id")
        if not run_id:
            return []

        # Poll for up to 60s
        for _ in range(12):
            time.sleep(5)
            status_url = f"https://api.apify.com/v2/actor-runs/{run_id}?token={APIFY_TOKEN}"
            s = requests.get(status_url, timeout=10)
            if s.json().get("data", {}).get("status") in ("SUCCEEDED", "FAILED", "ABORTED"):
                break

        # Fetch results
        items_url = f"https://api.apify.com/v2/actor-runs/{run_id}/dataset/items?token={APIFY_TOKEN}&format=json"
        items_resp = requests.get(items_url, timeout=15)
        items = items_resp.json() if items_resp.status_code == 200 else []
        logger.info(f"Apify returned {len(items)} hackathons")
        return [_normalize_devpost(h) for h in items if isinstance(h, dict)]
    except Exception as e:
        logger.warning(f"Apify fetch failed: {e}")
        return []


def _fetch_from_devfolio_api() -> list:
    """
    Fetch hackathons from Devfolio's internal API.
    Uses the public search endpoint discovered via browser network inspection.
    """
    try:
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Origin": "https://devfolio.co",
            "Referer": "https://devfolio.co/hackathons",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }
        # Try GraphQL-style search endpoint
        resp = requests.get(
            "https://api.devfolio.co/api/hackathons?type=hackathon&is_open=true&limit=50",
            headers=headers,
            timeout=15
        )
        if resp.status_code == 200:
            data = resp.json()
            raw_list = data if isinstance(data, list) else data.get("results", data.get("hackathons", []))
            logger.info(f"Devfolio API returned {len(raw_list)} hackathons")
            return [_normalize_devfolio(h) for h in raw_list if isinstance(h, dict)]
    except Exception as e:
        logger.warning(f"Devfolio API fetch error: {e}")
    return []


def _fetch_from_devfolio_scrape() -> list:
    """
    Scrape Devfolio's hackathon JSON from their public web endpoint.
    This hits the same endpoint the browser calls.
    """
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept": "application/json",
            "x-client-id": "devfolio-web",
        }
        # Devfolio uses an internal paginated API
        resp = requests.get(
            "https://api.devfolio.co/api/search/hackathons?is_open=true&limit=40",
            headers=headers,
            timeout=15
        )
        if resp.status_code == 200:
            data = resp.json()
            raw_list = data.get("results") or data.get("hackathons") or (data if isinstance(data, list) else [])
            return [_normalize_devfolio(h) for h in raw_list if isinstance(h, dict)]
    except Exception as e:
        logger.warning(f"Devfolio scrape error: {e}")
    return []


def _upsert_to_supabase(hackathons: list) -> None:
    """Upsert hackathon records to Supabase."""
    if not _HAS_SUPABASE or not hackathons:
        return
    try:
        # Ensure table exists
        supabase_client.table("hackathons").upsert(hackathons, on_conflict="external_id").execute()
        logger.info(f"Upserted {len(hackathons)} hackathons to Supabase")
    except Exception as e:
        logger.warning(f"Hackathon Supabase upsert failed: {e}")


def _load_from_supabase(filters: dict = None) -> list:
    """Load hackathons from Supabase cache."""
    if not _HAS_SUPABASE:
        return []
    try:
        q = supabase_client.table("hackathons").select("*").order("starts_at")
        if filters:
            if filters.get("status"):
                q = q.eq("status", filters["status"])
            if filters.get("is_online") is not None:
                q = q.eq("is_online", filters["is_online"])
        resp = q.limit(80).execute()
        return resp.data or []
    except Exception as e:
        logger.warning(f"Hackathon Supabase load failed: {e}")
        return []


def get_hackathons(filters: dict = None) -> list:
    """
    Main entry point: returns hackathons, refreshing from external sources if stale.
    Priority: Apify (if token set) → Devfolio API → Devfolio scrape → Supabase cache
    """
    cache_key = json.dumps(filters or {})
    cached = _CACHE.get(cache_key)
    if cached and time.time() - cached["ts"] < _CACHE_TTL:
        return cached["data"]

    # Try external sources
    hackathons = []
    if APIFY_TOKEN:
        hackathons = _fetch_from_apify()
    if not hackathons:
        hackathons = _fetch_from_devfolio_api()
    if not hackathons:
        hackathons = _fetch_from_devfolio_scrape()

    if hackathons:
        _upsert_to_supabase(hackathons)
        # Apply filters
        if filters:
            if filters.get("status"):
                hackathons = [h for h in hackathons if h.get("status") == filters["status"]]
            if filters.get("theme"):
                t = filters["theme"].lower()
                hackathons = [h for h in hackathons if any(t in (tag or "").lower() for tag in h.get("themes", []))]
            if filters.get("is_online") is not None:
                hackathons = [h for h in hackathons if h.get("is_online") == filters["is_online"]]
    else:
        # Fallback to Supabase cache
        hackathons = _load_from_supabase(filters)

    _CACHE[cache_key] = {"ts": time.time(), "data": hackathons}
    return hackathons


def get_hackathon_by_id(hackathon_id: str) -> Optional[dict]:
    """Fetch a single hackathon by its VortieQ ID from cache or Supabase."""
    all_h = get_hackathons()
    for h in all_h:
        if h.get("id") == hackathon_id:
            return h
    if _HAS_SUPABASE:
        try:
            resp = supabase_client.table("hackathons").select("*").eq("id", hackathon_id).single().execute()
            return resp.data
        except Exception:
            pass
    return None


def register_for_hackathon(user_id: str, hackathon_id: str) -> dict:
    """Register a user for a hackathon."""
    hackathon = get_hackathon_by_id(hackathon_id)
    if not hackathon:
        raise ValueError("Hackathon not found")
    if _HAS_SUPABASE:
        try:
            supabase_client.table("user_hackathons").upsert({
                "user_id": user_id,
                "hackathon_id": hackathon_id,
                "registration_date": datetime.now(timezone.utc).isoformat(),
                "status": "registered"
            }, on_conflict="user_id,hackathon_id").execute()
        except Exception as e:
            logger.warning(f"user_hackathons upsert failed: {e}")
    return {"success": True, "hackathon_id": hackathon_id, "status": "registered"}


def get_user_hackathons(user_id: str) -> list:
    """Get all hackathons a user has registered for."""
    if not _HAS_SUPABASE:
        return []
    try:
        resp = supabase_client.table("user_hackathons").select("*, hackathons(*)").eq("user_id", user_id).execute()
        rows = resp.data or []
        result = []
        for row in rows:
            h = row.get("hackathons") or {}
            h["user_status"] = row.get("status", "registered")
            h["registration_date"] = row.get("registration_date")
            result.append(h)
        return result
    except Exception as e:
        logger.warning(f"get_user_hackathons failed: {e}")
        return []
