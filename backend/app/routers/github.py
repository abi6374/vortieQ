import re

from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional, Dict, Any

from app.middleware.auth import verify_jwt_optional
from app.services.github_service import (
    fetch_github_repos,
    analyze_github_repositories,
    GitHubRateLimitedError,
)
from app.services.profile_service import upsert_profile

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
    user_id: Optional[str] = Depends(verify_jwt_optional)
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

    # If authenticated, persist the derived ratings and detected years —
    # always under user_id from the verified JWT, never from the request body.
    if user_id:
        try:
            upsert_profile(user_id, {
                "topic_ratings": analysis["topics"],
                "detected_years_experience": analysis["detected_years_experience"],
            })
        except Exception as exc:
            print(f"[github router] Note on profile persistence: {exc}", flush=True)

    return analysis
