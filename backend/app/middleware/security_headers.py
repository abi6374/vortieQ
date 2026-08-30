"""Security response headers - Phase 4 hardening.

Real production gap this closes: this API had CORS locked to an explicit
allowlist (see main.py's own docstring on that fix) but sent NO security
headers at all - no CSP, no clickjacking protection, no MIME-sniffing
protection, no Permissions-Policy, no HSTS. A JSON API is lower-risk than
an HTML-serving app for most of these (there's no page content for CSP to
protect against XSS in), but this API DOES serve real HTML at /docs and
/redoc (FastAPI's built-in Swagger/ReDoc UI, enabled by default, publicly
reachable) - those are real HTML pages in a real browser, and every other
response benefits from MIME-sniffing/clickjacking/referrer protection
regardless of content type.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# FastAPI's built-in interactive docs load their JS/CSS from this CDN -
# a strict default-src 'none' would leave /docs and /redoc blank (not a
# security issue, just a broken page) without this carve-out. The JSON
# API itself (every other path) gets the strict policy.
_DOCS_PATHS = {"/docs", "/redoc"}
_DOCS_CSP = (
    "default-src 'self' https://cdn.jsdelivr.net; "
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "img-src 'self' data: https://fastapi.tiangolo.com; "
    "frame-ancestors 'none'; base-uri 'none'"
)
# Every other response (the real API surface: JSON, and the one binary
# response - Polly TTS audio) - a JSON/audio response has no legitimate
# reason to execute a script or be framed at all.
_API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Legacy header kept alongside frame-ancestors for older browsers
        # that don't honor CSP's frame-ancestors directive.
        response.headers["X-Frame-Options"] = "DENY"
        # Disables powerful browser features this API has no legitimate
        # use for - none of these are ever needed by a JSON API response
        # or the docs page.
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=(), usb=(), "
            "accelerometer=(), gyroscope=(), magnetometer=()"
        )
        response.headers["Content-Security-Policy"] = (
            _DOCS_CSP if request.url.path in _DOCS_PATHS else _API_CSP
        )

        # HSTS only makes sense - and is only ever honored by a browser -
        # over an actual HTTPS connection. This backend is reached
        # directly over plain HTTP today (see docs/testing_guide.md's
        # curl examples); Vercel's OWN domain terminates HTTPS for the
        # frontend, but that's a separate origin. Checking the real
        # scheme (including X-Forwarded-Proto for when this sits behind
        # a TLS-terminating proxy) rather than sending HSTS unconditionally
        # avoids claiming a protection that isn't actually active - a
        # header that's simply absent over HTTP is correct; one that's
        # present but meaningless would be a false claim.
        forwarded_proto = request.headers.get("x-forwarded-proto", "").lower()
        is_https = request.url.scheme == "https" or forwarded_proto == "https"
        if is_https:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"

        return response
