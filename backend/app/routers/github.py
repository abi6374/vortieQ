from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional, Dict, Any
from app.middleware.auth import verify_jwt_optional
from app.services.github_service import fetch_github_repos, analyze_github_repositories
from app.services.profile_service import upsert_profile

router = APIRouter(prefix="/api/profile/github", tags=["github"])


@router.post("")
async def ingest_github_profile(
    payload: Dict[str, Any] = Body(default={}),
    user_id: Optional[str] = Depends(verify_jwt_optional)
):
    """
    Ingests a user's GitHub repositories, computes tech stack skills and confidence scores,
    and optionally persists them to the user's profile.
    """
    token = payload.get("token") or payload.get("provider_token")
    username = payload.get("username")

    if not token and not username:
        raise HTTPException(
            status_code=400,
            detail="Either a GitHub OAuth token or a GitHub username must be provided."
        )

    repos = await fetch_github_repos(token=token, username=username)
    analysis = analyze_github_repositories(repos)

    # If authenticated, persist the derived ratings and detected years
    if user_id:
        try:
            upsert_profile(user_id, {
                "topic_ratings": analysis["topics"],
                "detected_years_experience": analysis["detected_years_experience"],
            })
        except Exception as exc:
            print(f"[github router] Note on profile persistence: {exc}", flush=True)

    return analysis

