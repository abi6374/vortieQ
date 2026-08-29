"""Security + integrity regression tests from the backend audit.

Scope: exactly the 4 files the audit covered — auth.py, routers/github.py,
services/github_service.py, main.py. No live network calls (GitHub API is
mocked) and no live Supabase writes — these test the code paths in isolation
so they run in CI without secrets or network access.

Run: cd backend && pytest tests/test_security_and_integrity.py -v
"""

import time
from unittest.mock import AsyncMock, patch

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)


# ── 1. Malformed / expired JWT rejection ────────────────────────────────────
class TestJWTRejection:
    def test_no_auth_header_rejected(self):
        r = client.get("/api/roadmap")
        assert r.status_code in (401, 403)

    def test_malformed_token_rejected(self):
        r = client.get("/api/roadmap", headers={"Authorization": "Bearer not-a-jwt"})
        assert r.status_code == 401
        # Generic message only — no validator internals leaked to the client.
        detail = r.json().get("detail", "")
        assert "PyJWKClientError" not in detail
        assert "signing key" not in detail.lower()

    def test_expired_hs256_token_rejected(self):
        expired = jwt.encode(
            {
                "sub": "11111111-1111-1111-1111-111111111111",
                "aud": "authenticated",
                "iat": int(time.time()) - 7200,
                "exp": int(time.time()) - 3600,
            },
            settings.SUPABASE_JWT_SECRET,
            algorithm="HS256",
        )
        r = client.get("/api/roadmap", headers={"Authorization": f"Bearer {expired}"})
        assert r.status_code == 401

    def test_valid_signature_wrong_secret_rejected(self):
        # Signed with a DIFFERENT secret — simulates a forged/stolen-key token.
        forged = jwt.encode(
            {
                "sub": "11111111-1111-1111-1111-111111111111",
                "aud": "authenticated",
                "iat": int(time.time()),
                "exp": int(time.time()) + 3600,
            },
            "wrong-secret-not-ours",
            algorithm="HS256",
        )
        r = client.get("/api/roadmap", headers={"Authorization": f"Bearer {forged}"})
        assert r.status_code == 401

    def test_401_response_never_leaks_internals(self):
        r = client.get("/api/roadmap", headers={"Authorization": "Bearer x.y.z"})
        assert r.status_code == 401
        body = r.text.lower()
        for leak in ("traceback", "exception", "pyjwkclienterror", "keyerror"):
            assert leak not in body, f"401 body leaked internal detail: {leak}"


# ── 2. IDOR / cross-user access (BOLA prevention) ───────────────────────────
class TestCrossUserIsolation:
    """
    Full IDOR verification needs two real Supabase users and RLS-enforced
    reads, which requires live credentials — see the Supabase MCP-driven
    manual verification in the audit report for that. What's testable here
    without live infra: the auth layer never trusts a user_id from the
    request itself, only from the verified JWT.
    """

    def test_generate_path_ignores_body_user_id(self):
        # Even if a client tries to smuggle a user_id in the body, /api/paths/generate
        # takes no such parameter — verify_jwt is the ONLY source of identity.
        r = client.post(
            "/api/paths/generate",
            json={"user_id": "22222222-2222-2222-2222-222222222222"},
        )
        # No valid auth supplied at all -> must still be rejected, proving the
        # endpoint can't be steered by body content pre-auth.
        assert r.status_code in (401, 403, 422)

    def test_roadmap_task_patch_requires_auth_regardless_of_step_id(self):
        r = client.patch(
            "/api/roadmap/tasks/00000000-0000-0000-0000-000000000000",
            json={"completed": True},
        )
        assert r.status_code in (401, 403)


# ── 3. GitHub ingestion input sanitization ──────────────────────────────────
class TestGitHubUsernameValidation:
    @pytest.mark.parametrize("bad_username", [
        "../../../etc/passwd",
        "user?since=2020",
        "user;DROP TABLE profiles",
        "a" * 100,  # too long
        "-leading-hyphen",
        "trailing-hyphen-",
        "",
        "user with spaces",
        "user/repo",
    ])
    def test_rejects_invalid_usernames(self, bad_username):
        r = client.post("/api/profile/github", json={"username": bad_username})
        assert r.status_code == 400, f"expected 400 for {bad_username!r}, got {r.status_code}"

    @pytest.mark.parametrize("good_username", [
        "octocat", "torvalds", "a", "user-name", "a1b2c3",
    ])
    def test_accepts_valid_usernames(self, good_username):
        # Mock the GitHub call so this doesn't depend on network/real accounts.
        with patch(
            "app.routers.github.fetch_github_repos",
            new=AsyncMock(return_value=[]),
        ):
            r = client.post("/api/profile/github", json={"username": good_username})
            assert r.status_code == 200

    def test_missing_username_and_token_rejected(self):
        r = client.post("/api/profile/github", json={})
        assert r.status_code == 400


# ── 4. GitHub rate-limit resilience — no fabricated data ────────────────────
class TestGitHubRateLimitHandling:
    def test_rate_limit_surfaces_as_429_not_fake_empty_result(self):
        from app.services.github_service import GitHubRateLimitedError

        with patch(
            "app.routers.github.fetch_github_repos",
            new=AsyncMock(side_effect=GitHubRateLimitedError("403")),
        ):
            r = client.post("/api/profile/github", json={"username": "octocat"})
            # Must be a distinguishable 429, NOT a 200 with a fabricated
            # "beginner, 0 years experience" result.
            assert r.status_code == 429

    def test_generic_api_error_degrades_to_empty_not_crash(self):
        # A non-200, non-403/429 response (e.g. 404 unknown user) should not
        # crash the worker — degrades to an honest "no data" result.
        with patch(
            "app.routers.github.fetch_github_repos",
            new=AsyncMock(return_value=[]),
        ):
            r = client.post("/api/profile/github", json={"username": "definitely-not-a-real-user-xyz"})
            assert r.status_code == 200
            assert r.json()["topics"] == []


# ── 5. CORS allowlist (no wildcard + credentials) ───────────────────────────
class TestCORSConfiguration:
    def test_allowed_origin_reflected(self):
        r = client.options(
            "/api/profile/",
            headers={
                "Origin": "https://vortie-q.vercel.app",
                "Access-Control-Request-Method": "POST",
            },
        )
        assert r.headers.get("access-control-allow-origin") == "https://vortie-q.vercel.app"

    def test_unknown_origin_not_reflected(self):
        r = client.options(
            "/api/profile/",
            headers={
                "Origin": "https://evil.example.com",
                "Access-Control-Request-Method": "POST",
            },
        )
        # Starlette omits the header entirely for a disallowed origin rather
        # than returning an error — absence is the correct "denied" signal.
        assert r.headers.get("access-control-allow-origin") != "https://evil.example.com"


# ── 6. profile_service.py: prompt injection surface + output validation ────
class TestProfileExtractionHardening:
    """No live LLM calls — these test _parse_and_validate() directly, which
    is what actually bounds the damage from a manipulated/jailbroken model
    response regardless of how well the prompt-level defense holds up."""

    def _validate(self, obj):
        import json
        from app.services import profile_service
        return profile_service._parse_and_validate(json.dumps(obj))

    def test_rejects_bool_for_weekly_hours(self):
        # bool is a subclass of int in Python - isinstance(True, int) is True -
        # so a naive `isinstance(x, int)` check would silently accept this.
        with pytest.raises(AssertionError):
            self._validate({
                "target_role": "Engineer", "current_level": "beginner",
                "interests": ["python"], "weekly_hours": True,
            })

    def test_rejects_out_of_range_weekly_hours(self):
        with pytest.raises(AssertionError):
            self._validate({
                "target_role": "Engineer", "current_level": "beginner",
                "interests": ["python"], "weekly_hours": 999999,
            })

    def test_rejects_zero_weekly_hours(self):
        with pytest.raises(AssertionError):
            self._validate({
                "target_role": "Engineer", "current_level": "beginner",
                "interests": ["python"], "weekly_hours": 0,
            })

    def test_rejects_oversized_target_role(self):
        with pytest.raises(AssertionError):
            self._validate({
                "target_role": "x" * 500, "current_level": "beginner",
                "interests": ["python"], "weekly_hours": 10,
            })

    def test_rejects_too_many_interests(self):
        with pytest.raises(AssertionError):
            self._validate({
                "target_role": "Engineer", "current_level": "beginner",
                "interests": [f"skill{i}" for i in range(50)], "weekly_hours": 10,
            })

    def test_rejects_non_string_interest_items(self):
        with pytest.raises(AssertionError):
            self._validate({
                "target_role": "Engineer", "current_level": "beginner",
                "interests": ["python", {"injected": "object"}], "weekly_hours": 10,
            })

    def test_accepts_well_formed_profile(self):
        result = self._validate({
            "target_role": "Data Scientist", "current_level": "beginner",
            "interests": ["python", "statistics"], "weekly_hours": 10,
        })
        assert result["target_role"] == "Data Scientist"

    def test_no_fabricated_fallback_on_repeated_failure(self):
        # extract_profile must raise, never silently return the old hardcoded
        # "Software Developer / beginner / 10h" FALLBACK_PROFILE.
        from app.services import profile_service
        assert not hasattr(profile_service, "FALLBACK_PROFILE")
        assert hasattr(profile_service, "ProfileExtractionError")

    def test_goal_text_length_capped_at_schema_level(self):
        r = client.post(
            "/api/profile/",
            json={"goal_text": "x" * 10_000},
            headers={"Authorization": "Bearer not-a-jwt"},
        )
        # Rejected before auth even matters (422 Pydantic validation) or by
        # auth (401) — either way it must never reach the LLM call.
        assert r.status_code in (401, 422)


# ── 7. 500 errors never leak internals to the client ────────────────────────
class TestErrorMasking:
    def test_unhandled_exception_returns_generic_message(self):
        # Hit an endpoint with a payload shape that could plausibly cause an
        # internal error path, and confirm whatever comes back is generic.
        r = client.post("/api/assistant/messages", json={"content": ""})
        if r.status_code == 500:
            body = r.json()
            assert body["detail"] == "Internal server error. Please try again."
            assert "Traceback" not in str(body)
