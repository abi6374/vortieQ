"""JWT verification for Supabase-issued tokens — bulletproof triple fallback.

Supabase issues tokens differently depending on project age:
  1. Legacy projects: HS256 signed with the project's shared JWT secret.
  2. New (2025+ API-keys) projects: ES256/RS256 signed with a rotating
     asymmetric key served from {SUPABASE_URL}/auth/v1/.well-known/jwks.json.

We try the fastest, cheapest validators first and fall through:
  1. HS256 (no network, single hash op). Works for legacy tokens + my
     synthetic test tokens.
  2. Asymmetric via PyJWKClient (one HTTP fetch per key rotation, then cached).
     Works for real new-format tokens.
  3. supabase.auth.get_user(token) — one round-trip to Supabase's auth server,
     which validates against whatever key it's currently signing with.
     Slowest but guaranteed-correct catch-all for anything the first two miss
     (key rotation between our JWKS cache refresh and the token being issued,
     unusual claim shapes, etc.).

Each failure is logged with the specific reason so backend logs pinpoint any
new failure mode instead of just showing a generic 401.
"""

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.config import settings, supabase_client

security = HTTPBearer()

_JWKS_URL = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
# Short cache so key rotations propagate within minutes, not hours.
_jwks_client = PyJWKClient(_JWKS_URL, cache_keys=True, lifespan=300)


def _try_hs256(token: str):
    """Return user_id or raise."""
    payload = jwt.decode(
        token,
        settings.SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        audience="authenticated",
        options={"verify_aud": True},
    )
    sub = payload.get("sub")
    if not sub:
        raise ValueError("HS256 token missing sub claim")
    return sub


def _try_asymmetric(token: str):
    """Return user_id or raise."""
    signing_key = _jwks_client.get_signing_key_from_jwt(token).key
    payload = jwt.decode(
        token,
        signing_key,
        algorithms=["ES256", "RS256"],
        # Some Supabase asymmetric tokens omit the aud claim — accept both.
        audience="authenticated",
        options={"verify_aud": False},
    )
    sub = payload.get("sub")
    if not sub:
        raise ValueError("asymmetric token missing sub claim")
    return sub


def _try_supabase_server(token: str):
    """Ask Supabase to validate. Slow but definitive."""
    user_response = supabase_client.auth.get_user(token)
    if not user_response or not user_response.user:
        raise ValueError("supabase.auth.get_user returned no user")
    return user_response.user.id


def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """Decode the Supabase JWT and return the user id (`sub` claim)."""
    token = credentials.credentials
    if not token or token.count(".") != 2:
        raise HTTPException(status_code=401, detail="Malformed token")

    errors = {}

    # Fast path 1: HS256
    try:
        return _try_hs256(token)
    except Exception as e:
        errors["hs256"] = f"{type(e).__name__}: {e}"

    # Fast path 2: JWKS asymmetric
    try:
        return _try_asymmetric(token)
    except jwt.ExpiredSignatureError as e:
        # Explicit expired result — no point trying the server, it'll say the same.
        print(f"[AUTH 401 expired] {e}", flush=True)
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        errors["asymmetric"] = f"{type(e).__name__}: {e}"

    # Slow catch-all: Supabase server-side validation
    try:
        return _try_supabase_server(token)
    except Exception as e:
        errors["supabase"] = f"{type(e).__name__}: {e}"

    print(f"[AUTH 401] all validators failed: {errors}  token_head={token[:40]}...", flush=True)
    raise HTTPException(
        status_code=401,
        detail=f"Invalid token (all validators failed): {errors.get('supabase', errors.get('asymmetric', errors.get('hs256')))}",
    )
