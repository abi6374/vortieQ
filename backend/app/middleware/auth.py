"""JWT verification for Supabase-issued tokens.

Supabase issues tokens in one of two formats depending on when the project was
created:
  - Legacy: HS256 signed with the project's shared JWT secret.
  - New (2025+ API-keys system): ES256 signed with a rotating EC P-256 key
    served from {SUPABASE_URL}/auth/v1/.well-known/jwks.json.

We try HS256 first (cheap, no network), then fall back to JWKS verification.
The JWKS keys are cached inside PyJWKClient so this is one HTTP call per key
rotation, not per request.
"""

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.config import settings

security = HTTPBearer()

_JWKS_URL = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
_jwks_client = PyJWKClient(_JWKS_URL)


def _decode_hs256(token: str) -> dict:
    return jwt.decode(
        token,
        settings.SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        audience="authenticated",
    )


def _decode_asymmetric(token: str) -> dict:
    signing_key = _jwks_client.get_signing_key_from_jwt(token).key
    return jwt.decode(
        token,
        signing_key,
        algorithms=["ES256", "RS256"],
        audience="authenticated",
    )


def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """Decode the Supabase JWT and return the user id (`sub` claim)."""
    token = credentials.credentials

    payload = None
    hs_err = None
    try:
        payload = _decode_hs256(token)
    except jwt.InvalidTokenError as e:
        hs_err = e

    if payload is None:
        try:
            payload = _decode_asymmetric(token)
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except Exception as e:
            # Report the more informative HS256 error if the token wasn't even
            # a JWT; otherwise show the asymmetric failure.
            detail = str(e) if "kid" in str(e).lower() or "signature" in str(e).lower() else str(hs_err or e)
            print(f"[AUTH 401] hs_err={hs_err!r}  asym_err={e!r}  token_head={token[:40]}...", flush=True)
            raise HTTPException(status_code=401, detail=f"Invalid token: {detail}")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: no sub claim")
    return str(user_id)
