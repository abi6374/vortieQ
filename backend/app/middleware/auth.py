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

SECURITY AUDIT NOTES (this pass):
  - The client-facing 401 detail used to include the raw validator exception
    text (PyJWKClientError internals, jwt library messages) — an information
    disclosure. Full detail is now logged server-side only; the client always
    gets a fixed, generic message.
  - The asymmetric path used `verify_aud: False` because some Supabase
    asymmetric tokens omit the aud claim entirely. Disabling audience
    verification outright means ANY token signed by Supabase's key for ANY
    purpose (not just "authenticated" session tokens) would pass here. Fixed
    to verify aud when present, and only skip the check when the claim is
    genuinely absent from the payload - never blanket-disabled.
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

_EXPECTED_AUDIENCE = "authenticated"
_GENERIC_401 = "Invalid or expired token"


def _try_hs256(token: str):
    """Return user_id or raise."""
    payload = jwt.decode(
        token,
        settings.SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        audience=_EXPECTED_AUDIENCE,
        options={"verify_aud": True},
    )
    sub = payload.get("sub")
    if not sub:
        raise ValueError("HS256 token missing sub claim")
    return sub


def _try_asymmetric(token: str):
    """Return user_id or raise.

    Verifies audience whenever the claim is present. Only skips the check
    when `aud` is genuinely absent from the payload (some Supabase
    asymmetric-token issuances omit it) - never disables verification
    unconditionally, so a token minted for a different purpose but carrying
    an unexpected `aud` value is still rejected.
    """
    signing_key = _jwks_client.get_signing_key_from_jwt(token).key
    unverified = jwt.decode(token, options={"verify_signature": False})
    has_aud_claim = "aud" in unverified

    payload = jwt.decode(
        token,
        signing_key,
        algorithms=["ES256", "RS256"],
        audience=_EXPECTED_AUDIENCE if has_aud_claim else None,
        options={"verify_aud": has_aud_claim},
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
    """Decode the Supabase JWT and return the user id (`sub` claim`).

    Always binds subsequent operations to THIS verified user_id - callers
    must never accept a user_id from a URL param or request body when this
    dependency is in play (see routers/github.py for the one endpoint that
    intentionally allows anonymous callers via verify_jwt_optional, and note
    its persistence path still only ever writes under the JWT-derived id).
    """
    token = credentials.credentials
    if not token or token.count(".") != 2:
        raise HTTPException(status_code=401, detail=_GENERIC_401)

    errors = {}

    # Fast path 1: HS256
    try:
        return _try_hs256(token)
    except Exception as e:
        errors["hs256"] = f"{type(e).__name__}: {e}"

    # Fast path 2: JWKS asymmetric
    try:
        return _try_asymmetric(token)
    except jwt.ExpiredSignatureError:
        # Explicit expired result — no point trying the server, it'll say the same.
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        errors["asymmetric"] = f"{type(e).__name__}: {e}"

    # Slow catch-all: Supabase server-side validation
    try:
        return _try_supabase_server(token)
    except Exception as e:
        errors["supabase"] = f"{type(e).__name__}: {e}"

    # Detailed reasons go to the server log only. The client gets a fixed,
    # generic message — never the raw validator exception text (library
    # internals, key-fetch errors, etc. are not for public consumption).
    print(f"[auth] all validators failed: {errors}", flush=True)
    raise HTTPException(status_code=401, detail=_GENERIC_401)


security_optional = HTTPBearer(auto_error=False)


def verify_jwt_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security_optional),
) -> str | None:
    """Optionally decode the Supabase JWT. Returns user_id if valid, else None.

    Endpoints using this MUST treat a None result as "anonymous" and must
    never perform a state mutation scoped to any user_id other than the one
    this function itself returns.
    """
    if not credentials or not credentials.credentials:
        return None
    try:
        return verify_jwt(credentials)
    except Exception:
        return None
