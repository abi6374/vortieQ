"""Tests for SecurityHeadersMiddleware (Phase 4 hardening) - real gap this
closes: CORS was already locked to an explicit allowlist, but the API sent
NO security headers at all before this - no CSP, no clickjacking
protection, no MIME-sniffing protection, no Permissions-Policy, no HSTS.

Uses the real FastAPI TestClient against app.main.app (not a standalone
middleware instance) so this proves the headers actually land on real
responses through the real middleware stack, not just that the class
works in isolation.
"""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestSecurityHeadersOnRealResponses:
    def test_health_endpoint_carries_security_headers(self):
        r = client.get("/health")
        assert r.headers["x-content-type-options"] == "nosniff"
        assert r.headers["referrer-policy"] == "strict-origin-when-cross-origin"
        assert r.headers["x-frame-options"] == "DENY"
        assert "camera=()" in r.headers["permissions-policy"]
        assert r.headers["content-security-policy"] == "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"

    def test_a_401_error_response_still_carries_security_headers(self):
        # Security headers must apply to EVERY response, including error
        # paths - an attacker-facing 401/404/500 page is not exempt.
        r = client.get("/api/roadmap")  # no Authorization header -> 401
        assert r.status_code in (401, 403)
        assert r.headers["x-content-type-options"] == "nosniff"
        assert r.headers["content-security-policy"]

    def test_docs_page_gets_a_looser_csp_allowing_its_own_cdn_assets(self):
        r = client.get("/docs")
        assert r.status_code == 200
        assert "cdn.jsdelivr.net" in r.headers["content-security-policy"]
        assert "frame-ancestors 'none'" in r.headers["content-security-policy"]

    def test_no_hsts_over_plain_http(self):
        # This backend is reached directly over plain HTTP in production
        # today (see docs/testing_guide.md) - HSTS sent over a non-HTTPS
        # connection is never honored by a browser anyway, so claiming it
        # here would be a false protection, not a real one.
        r = client.get("/health")
        assert "strict-transport-security" not in {k.lower() for k in r.headers.keys()}

    def test_hsts_present_when_the_request_arrives_via_a_forwarded_https_proxy(self):
        # Simulates sitting behind a TLS-terminating proxy/load balancer
        # that sets X-Forwarded-Proto - the real-world shape this would
        # take once/if this backend moves behind HTTPS.
        r = client.get("/health", headers={"X-Forwarded-Proto": "https"})
        assert r.headers["strict-transport-security"] == "max-age=63072000; includeSubDomains"
