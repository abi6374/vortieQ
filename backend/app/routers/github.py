import re

from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional, Dict, Any

from app.config import supabase_client
from app.middleware.auth import verify_jwt
from app.middleware.rate_limit import rate_limit_by_ip_or_user
from app.services.github_service import (
    fetch_github_repos,
    analyze_github_repositories,
    GitHubRateLimitedError,
    GitHubUserNotFoundError,
)
from app.services.profile_service import upsert_profile
from app.services import mastery_service

router = APIRouter(prefix="/api/profile/github", tags=["github"])

# GitHub's actual username rules: alphanumeric + single hyphens, max 39 chars,
# cannot start/end with a hyphen. Enforced BEFORE the value ever reaches an
# HTTP client so a crafted username can't manipulate the request path sent to
# GitHub's API (path-segment injection) or exhaust resources via unbounded
# length.
_USERNAME_RE = re.compile(r"^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$")


def _validate_username(username: str) -> str:
    username = (username or "").strip()
    if not username or not _USERNAME_RE.match(username):
        raise HTTPException(
            status_code=400,
            detail="Invalid GitHub username. Use only letters, numbers, and "
                   "single hyphens (max 39 characters).",
        )
    return username


@router.post("")
async def ingest_github_profile(
    payload: Dict[str, Any] = Body(default={}),
    # Real cost/DoS gap this closes: reachable without authentication (an
    # anonymous preview of the feature) but had NO rate limit at all,
    # despite making a real external GitHub API call per request -
    # rate_limit_by_ip_or_user keys by the real user_id when
    # authenticated, falls back to a best-effort client IP when not.
    user_id: Optional[str] = Depends(rate_limit_by_ip_or_user("github.ingest", max_calls=15))
):
    """
    Ingests a user's GitHub repositories, computes tech stack skills and confidence scores,
    and optionally persists them to the user's profile.

    Reachable without authentication (anonymous preview of the feature), but
    persistence ALWAYS binds to the caller's own verified user_id from the
    JWT — never to any id the client could supply in the body — so there is
    no cross-user write path here regardless of auth state.
    """
    token = payload.get("token") or payload.get("provider_token")
    raw_username = payload.get("username")

    if not token and not raw_username:
        raise HTTPException(
            status_code=400,
            detail="Either a GitHub OAuth token or a GitHub username must be provided."
        )

    username = _validate_username(raw_username) if raw_username else None

    try:
        repos = await fetch_github_repos(token=token, username=username)
    except GitHubUserNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"GitHub user '@{username}' was not found. Please check the handle.",
        )
    except GitHubRateLimitedError:
        # Previously this fell through to an empty repo list, which
        # analyze_github_repositories() then reported as a confident
        # "beginner, 0 years experience" result — fabricated data presented
        # as if it were a genuine finding about the learner. Surface the
        # real cause instead so the client can show "try again shortly"
        # rather than silently underselling the user's actual skills.
        raise HTTPException(
            status_code=429,
            detail="GitHub is rate-limiting requests right now. Please try again in a few minutes.",
        )

    analysis = analyze_github_repositories(repos)

    # If authenticated, persist the derived ratings, detected years, AND the
    # username/repo summary — always under user_id from the verified JWT,
    # never from the request body. github_username/github_repos_summary are
    # the single source of truth for "which GitHub account is connected"
    # (see migration 004_github_profile_link.sql) — previously this only
    # ever lived in scattered, unsynced places (localStorage per browser,
    # onboarding's own component state), which is exactly why the Account
    # page and the onboarding intake screen could disagree about which
    # handle was connected.
    if user_id:
        try:
            update = {
                "topic_ratings": analysis["topics"],
                "detected_years_experience": analysis["detected_years_experience"],
            }
            # Only known for the username-based path — the token/OAuth path
            # (no explicit username) still gets its topics/years persisted
            # above, it just can't set a handle it was never given.
            if username:
                update["github_username"] = username
                update["github_repos_summary"] = analysis["github_projects"]
            upsert_profile(user_id, update)
        except Exception as exc:
            print(f"[github router] Note on profile persistence: {exc}", flush=True)

        # Real GitHub repo evidence -> per-skill mastery, not just
        # profiles.topic_ratings - this is what actually lets ranking_engine
        # use it.
        try:
            mastery_service.update_mastery_from_github(user_id, analysis["topics"])
        except Exception as exc:
            print(f"[github router] mastery update from github failed: {type(exc).__name__}: {exc}", flush=True)

    return analysis


@router.delete("")
def disconnect_github(user_id: str = Depends(verify_jwt)):
    """Unlinks GitHub from the caller's own profile (Google/email users only
    — see the frontend, which hides this for a native GitHub login since
    that's their primary sign-in identity, not an optional add-on).

    Deliberately does NOT touch topic_ratings/detected_years_experience:
    those can also come from a resume upload, and this endpoint has no way
    to tell which entries came from GitHub vs. a resume — wiping them here
    would risk destroying real resume-derived skill data for a learner who
    used both, the same class of bug fixed in upsert_profile (silently
    overwriting real data because a caller only meant to touch one thing).
    Only github_username and github_repos_summary are exclusively
    GitHub-sourced, so only those are cleared.
    """
    supabase_client.table("profiles").update({
        "github_username": None,
        "github_repos_summary": None,
    }).eq("id", user_id).execute()
    return {"ok": True, "message": "GitHub disconnected successfully"}
