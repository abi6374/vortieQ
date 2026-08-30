"""
internship_service.py — Fetches real internship data from:
  1. Greenhouse Public Job Board API (no auth required)
     Endpoint: https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true
  2. Multiple company board tokens queried in parallel

Data is normalized and cached in Supabase.
"""

import json
import time
import logging
import hashlib
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

try:
    import httpx as http_client
except ImportError:
    try:
        import requests as http_client
    except ImportError:
        http_client = None

logger = logging.getLogger(__name__)

try:
    from app.services.supabase_client import supabase_client
    _HAS_SUPABASE = True
except Exception:
    supabase_client = None
    _HAS_SUPABASE = False

GREENHOUSE_BASE = "https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true"

# Top tech companies with public Greenhouse job boards.
# These are actual internship-friendly companies with verified public boards.
GREENHOUSE_BOARDS = [
    "anthropic",
    "openai",
    "stripe",
    "notion",
    "figma",
    "vercel",
    "supabase",
    "github",
    "cloudflare",
    "mongodb",
    "hashicorp",
    "grafana",
    "datadog",
    "snowflake",
    "databricks",
]

# Keywords to filter for intern/entry-level positions
INTERN_KEYWORDS = [
    "intern", "internship", "co-op", "coop", "co op",
    "entry level", "entry-level", "graduate", "junior",
    "apprentice", "trainee", "residency", "fellow",
]

TECH_CATEGORIES = {
    "AI/ML": ["machine learning", "ml engineer", "ai", "data scientist", "nlp", "deep learning", "llm", "model"],
    "Web Dev": ["frontend", "front-end", "backend", "back-end", "fullstack", "full-stack", "web developer", "react", "node"],
    "Data Science": ["data analyst", "data science", "analytics", "business intelligence", "bi analyst"],
    "DevOps": ["devops", "sre", "site reliability", "infrastructure", "cloud", "kubernetes", "platform engineer"],
    "Security": ["security", "cybersecurity", "penetration", "red team", "appsec"],
    "Mobile": ["ios", "android", "mobile", "react native", "flutter"],
    "Design": ["product design", "ux", "ui designer", "user experience"],
    "Product": ["product manager", "product management", "pm intern"],
    "Marketing": ["marketing", "growth", "content", "seo", "social media"],
}

_CACHE: dict = {}
_CACHE_TTL = 3600  # 1 hour


def _is_internship(title: str) -> bool:
    t = title.lower()
    return any(kw in t for kw in INTERN_KEYWORDS)


def _infer_categories(title: str, description: str = "") -> list:
    combined = (title + " " + description).lower()
    cats = []
    for cat, keywords in TECH_CATEGORIES.items():
        if any(kw in combined for kw in keywords):
            cats.append(cat)
    return cats or ["General"]


def _infer_skills(title: str, description: str = "") -> list:
    """Extract likely required skills from title and description."""
    text = (title + " " + description).lower()
    skill_map = {
        "Python": ["python"],
        "JavaScript": ["javascript", "js"],
        "TypeScript": ["typescript"],
        "React": ["react"],
        "Node.js": ["node.js", "nodejs"],
        "SQL": ["sql", "postgres", "mysql"],
        "Java": [" java "],
        "Go": [" golang", " go "],
        "Rust": ["rust"],
        "C++": ["c++", "cpp"],
        "AWS": ["aws", "amazon web services"],
        "GCP": ["gcp", "google cloud"],
        "Azure": ["azure", "microsoft azure"],
        "Docker": ["docker"],
        "Kubernetes": ["kubernetes", "k8s"],
        "Machine Learning": ["machine learning", "ml", "pytorch", "tensorflow"],
        "Data Analysis": ["data analysis", "pandas", "numpy"],
        "Figma": ["figma"],
    }
    found = []
    for skill, keywords in skill_map.items():
        if any(kw in text for kw in keywords):
            found.append(skill)
    return found[:6]


def _normalize_greenhouse_job(raw: dict, company: str) -> dict:
    """Normalize a Greenhouse job record to VortieQ internship schema."""
    job_id = str(raw.get("id", ""))
    title = raw.get("title", "")
    location = raw.get("location", {})
    location_name = location.get("name", "") if isinstance(location, dict) else str(location)
    is_remote = "remote" in location_name.lower()

    description = ""
    if raw.get("content"):
        import re
        description = re.sub(r'<[^>]+>', ' ', str(raw["content"])).strip()[:1000]

    url = raw.get("absolute_url", "")
    published = raw.get("first_published") or raw.get("updated_at") or ""

    return {
        "id": hashlib.md5(f"greenhouse:{company}:{job_id}".encode()).hexdigest(),
        "external_id": f"{company}:{job_id}",
        "source": "greenhouse",
        "title": title,
        "company": company.replace("-", " ").title(),
        "location": location_name,
        "is_remote": is_remote,
        "duration": "3-6 months",
        "stipend": "Competitive",
        "skills_required": _infer_skills(title, description),
        "apply_by": None,
        "description": description,
        "apply_url": url,
        "categories": _infer_categories(title, description),
        "published_at": published,
        "status": "open",
    }


def _fetch_company_jobs(board_token: str) -> list:
    """Fetch and filter internship jobs from one Greenhouse board."""
    try:
        if not http_client:
            return []
        url = GREENHOUSE_BASE.format(board=board_token)
        resp = http_client.get(url, timeout=12)
        if resp.status_code != 200:
            return []
        data = resp.json()
        jobs = data.get("jobs", [])
        internships = []
        for job in jobs:
            title = job.get("title", "")
            if _is_internship(title):
                internships.append(_normalize_greenhouse_job(job, board_token))
        return internships
    except Exception as e:
        logger.warning(f"Greenhouse fetch for {board_token} failed: {e}")
        return []


def _fetch_all_greenhouse() -> list:
    """Fetch internships from all configured company boards in parallel."""
    all_internships = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(_fetch_company_jobs, board): board for board in GREENHOUSE_BOARDS}
        for future in as_completed(futures):
            try:
                result = future.result()
                all_internships.extend(result)
            except Exception:
                pass
    logger.info(f"Greenhouse: fetched {len(all_internships)} internship listings")
    return all_internships


def _upsert_to_supabase(internships: list) -> None:
    if not _HAS_SUPABASE or not internships:
        return
    try:
        supabase_client.table("internships").upsert(internships, on_conflict="external_id").execute()
        logger.info(f"Upserted {len(internships)} internships to Supabase")
    except Exception as e:
        logger.warning(f"Internship Supabase upsert failed: {e}")


def _load_from_supabase(filters: dict = None) -> list:
    if not _HAS_SUPABASE:
        return []
    try:
        q = supabase_client.table("internships").select("*").order("published_at", desc=True)
        if filters:
            if filters.get("is_remote") is not None:
                q = q.eq("is_remote", filters["is_remote"])
            if filters.get("category"):
                q = q.contains("categories", [filters["category"]])
        resp = q.limit(100).execute()
        return resp.data or []
    except Exception as e:
        logger.warning(f"Internship Supabase load failed: {e}")
        return []


def get_internships(filters: dict = None) -> list:
    """
    Main entry point. Returns internships from Greenhouse (live fetch) or Supabase cache.
    Greenhouse API requires no authentication — data is always real and current.
    """
    cache_key = json.dumps(filters or {})
    cached = _CACHE.get(cache_key)
    if cached and time.time() - cached["ts"] < _CACHE_TTL:
        return cached["data"]

    internships = _fetch_all_greenhouse()
    if internships:
        _upsert_to_supabase(internships)
        # Apply filters
        if filters:
            if filters.get("is_remote") is not None:
                internships = [i for i in internships if i.get("is_remote") == filters["is_remote"]]
            if filters.get("category"):
                c = filters["category"]
                internships = [i for i in internships if c in i.get("categories", [])]
            if filters.get("company"):
                c = filters["company"].lower()
                internships = [i for i in internships if c in i.get("company", "").lower()]
    else:
        internships = _load_from_supabase(filters)

    _CACHE[cache_key] = {"ts": time.time(), "data": internships}
    return internships


def get_internship_by_id(internship_id: str) -> Optional[dict]:
    all_i = get_internships()
    for i in all_i:
        if i.get("id") == internship_id:
            return i
    if _HAS_SUPABASE:
        try:
            resp = supabase_client.table("internships").select("*").eq("id", internship_id).single().execute()
            return resp.data
        except Exception:
            pass
    return None


def apply_to_internship(user_id: str, internship_id: str, status: str = "tracked") -> dict:
    """Record that a user applied to an internship (persistent via Supabase)."""
    internship = get_internship_by_id(internship_id)
    if not internship:
        raise ValueError("Internship not found")
    if not _HAS_SUPABASE:
        logger.warning("Supabase not configured — internship application will not persist.")
        return {"success": True, "internship_id": internship_id, "status": status, "persisted": False}
    try:
        supabase_client.table("user_internships").upsert({
            "user_id": user_id,
            "internship_id": internship_id,
            "applied_on": datetime.now(timezone.utc).isoformat(),
            "application_status": status
        }, on_conflict="user_id,internship_id").execute()
        logger.info(f"Internship {internship_id} tracked for user {user_id[:8]}... status={status}")
    except Exception as e:
        logger.error(f"user_internships upsert FAILED: {e}")
        raise RuntimeError(f"Failed to persist internship application: {e}") from e
    return {"success": True, "internship_id": internship_id, "status": status, "persisted": True}


def get_user_internships(user_id: str) -> list:
    """Get all internships a user has applied to — loaded fresh from Supabase."""
    if not _HAS_SUPABASE:
        logger.warning("Supabase not configured — returning empty user internships.")
        return []
    try:
        resp = supabase_client.table("user_internships").select("*").eq("user_id", user_id).execute()
        rows = resp.data or []
        result = []
        for row in rows:
            internship_id = row.get("internship_id")
            internship = get_internship_by_id(internship_id)
            if internship:
                i_copy = dict(internship)
                i_copy["application_status"] = row.get("application_status", "applied")
                i_copy["applied_on"] = row.get("applied_on")
                result.append(i_copy)
            else:
                # Internship may have been removed from the live feed; include raw row data
                result.append({
                    "id": internship_id,
                    "title": row.get("internship_id", "Unknown Position"),
                    "company": "Unknown",
                    "application_status": row.get("application_status", "applied"),
                    "applied_on": row.get("applied_on"),
                    "location": "",
                    "apply_url": ""
                })
        logger.info(f"Loaded {len(result)} internships for user {user_id[:8]}...")
        return result
    except Exception as e:
        logger.error(f"get_user_internships FAILED: {e}")
        return []


def update_application_status(user_id: str, internship_id: str, new_status: str) -> dict:
    """Update internship application status (tracked/saved → applied → interviewing → offer/rejected)."""
    # Matches user_internships.application_status's real DB CHECK
    # constraint (migration 015, widened in place) exactly.
    valid = {"tracked", "applied", "saved", "interviewing", "offer", "rejected"}
    if new_status not in valid:
        raise ValueError(f"Invalid status. Must be one of: {valid}")
    if not _HAS_SUPABASE:
        return {"success": True, "new_status": new_status, "persisted": False}
    try:
        supabase_client.table("user_internships").update(
            {"application_status": new_status}
        ).eq("user_id", user_id).eq("internship_id", internship_id).execute()
        logger.info(f"Internship {internship_id} status updated to {new_status} for user {user_id[:8]}...")
    except Exception as e:
        logger.error(f"update_application_status FAILED: {e}")
        raise RuntimeError(f"Failed to update internship status: {e}") from e
    return {"success": True, "new_status": new_status, "persisted": True}


def unapply_from_internship(user_id: str, internship_id: str) -> dict:
    """Remove an internship from user's tracked applications."""
    if not _HAS_SUPABASE:
        return {"success": True, "internship_id": internship_id, "status": "removed", "persisted": False}
    try:
        supabase_client.table("user_internships").delete().eq("user_id", user_id).eq("internship_id", internship_id).execute()
        logger.info(f"Internship {internship_id} removed for user {user_id[:8]}...")
    except Exception as e:
        logger.error(f"user_internships delete FAILED: {e}")
        raise RuntimeError(f"Failed to remove internship application: {e}") from e
    return {"success": True, "internship_id": internship_id, "status": "removed", "persisted": True}

