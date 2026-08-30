"""Tests for the Postgres-backed rate limiter (migration 009_durable_infra.sql)
that replaced the in-memory dict - the fix for "in-memory rate limits/caches
disappear on restart and don't work across multiple instances". No live
network/DB calls; Supabase is mocked throughout.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.middleware import rate_limit


def _iso(dt):
    return dt.isoformat().replace("+00:00", "Z")


class TestCheck:
    def test_allows_request_under_the_limit(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = MagicMock(
            data=[]
        )
        with patch("app.middleware.rate_limit.supabase_client", mock_supabase), \
             patch("app.middleware.rate_limit.random.random", return_value=1.0):  # skip cleanup
            rate_limit._check("test.route:user-1", max_calls=5, window_seconds=300)
        mock_table.insert.assert_called_once()
        assert mock_table.insert.call_args[0][0]["bucket_key"] == "test.route:user-1"

    def test_rejects_with_429_once_at_the_limit(self):
        now = datetime.now(timezone.utc)
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        # Already 5 hits within the window == max_calls -> must reject.
        mock_table.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = MagicMock(
            data=[{"created_at": _iso(now - timedelta(seconds=i * 10))} for i in range(5)]
        )
        with patch("app.middleware.rate_limit.supabase_client", mock_supabase):
            with pytest.raises(HTTPException) as exc_info:
                rate_limit._check("test.route:user-1", max_calls=5, window_seconds=300)
        assert exc_info.value.status_code == 429
        assert "Retry-After" in exc_info.value.headers
        # Must NOT record a 6th hit for a request that was rejected.
        mock_table.insert.assert_not_called()

    def test_fails_open_on_database_error(self):
        # A rate limiter is cost-protection, not a security gate - a
        # transient DB failure must not take down every LLM-backed route.
        mock_supabase = MagicMock()
        mock_supabase.table.side_effect = RuntimeError("connection refused")
        with patch("app.middleware.rate_limit.supabase_client", mock_supabase):
            rate_limit._check("test.route:user-1", max_calls=5, window_seconds=300)  # must not raise

    def test_insert_failure_does_not_block_the_request(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = MagicMock(
            data=[]
        )
        mock_table.insert.side_effect = RuntimeError("insert failed")
        with patch("app.middleware.rate_limit.supabase_client", mock_supabase), \
             patch("app.middleware.rate_limit.random.random", return_value=1.0):
            rate_limit._check("test.route:user-1", max_calls=5, window_seconds=300)  # must not raise


class TestOpportunisticCleanup:
    def test_cleanup_runs_only_probabilistically(self):
        mock_supabase = MagicMock()
        with patch("app.middleware.rate_limit.supabase_client", mock_supabase), \
             patch("app.middleware.rate_limit.random.random", return_value=0.5):  # > _CLEANUP_PROBABILITY
            rate_limit._opportunistic_cleanup()
        mock_supabase.table.assert_not_called()

    def test_cleanup_deletes_old_rows_when_triggered(self):
        mock_supabase = MagicMock()
        with patch("app.middleware.rate_limit.supabase_client", mock_supabase), \
             patch("app.middleware.rate_limit.random.random", return_value=0.0):
            rate_limit._opportunistic_cleanup()
        mock_supabase.table.return_value.delete.return_value.lt.assert_called_once()


def _fake_request(client_host="1.2.3.4", forwarded_for=None):
    req = MagicMock()
    req.client.host = client_host
    req.headers = {"x-forwarded-for": forwarded_for} if forwarded_for else {}
    return req


class TestClientIp:
    def test_prefers_x_forwarded_for_first_hop(self):
        req = _fake_request(client_host="10.0.0.1", forwarded_for="203.0.113.5, 10.0.0.1")
        assert rate_limit._client_ip(req) == "203.0.113.5"

    def test_falls_back_to_raw_connection_ip(self):
        req = _fake_request(client_host="203.0.113.9")
        assert rate_limit._client_ip(req) == "203.0.113.9"


class TestRateLimitByIpOrUser:
    """Real gap this closes: github.py's ingest_github_profile is
    reachable WITHOUT authentication (an anonymous preview of the
    feature), but the plain rate_limit() dependency requires a real
    verified user_id to key on - it simply cannot be used to protect an
    anonymous-reachable route. rate_limit_by_ip_or_user keys by the real
    user_id when authenticated (consistent with every other rate-limited
    route), and by a best-effort client IP when not."""

    def _mock_supabase_allowing(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = MagicMock(data=[])
        return mock_supabase, mock_table

    def test_keys_by_user_id_when_authenticated(self):
        mock_supabase, mock_table = self._mock_supabase_allowing()
        dep = rate_limit.rate_limit_by_ip_or_user("gh.ingest", max_calls=5)
        with patch("app.middleware.rate_limit.supabase_client", mock_supabase), \
             patch("app.middleware.rate_limit.random.random", return_value=1.0):
            result = dep(_fake_request(), user_id="real-user-1")
        assert result == "real-user-1"
        assert mock_table.insert.call_args[0][0]["bucket_key"] == "gh.ingest:real-user-1"

    def test_keys_by_ip_when_anonymous(self):
        mock_supabase, mock_table = self._mock_supabase_allowing()
        dep = rate_limit.rate_limit_by_ip_or_user("gh.ingest", max_calls=5)
        with patch("app.middleware.rate_limit.supabase_client", mock_supabase), \
             patch("app.middleware.rate_limit.random.random", return_value=1.0):
            result = dep(_fake_request(client_host="9.9.9.9"), user_id=None)
        assert result is None
        assert mock_table.insert.call_args[0][0]["bucket_key"] == "gh.ingest:ip:9.9.9.9"

    def test_anonymous_and_authenticated_buckets_never_collide(self):
        """A real user and an anonymous caller sharing the same physical
        IP (e.g. behind the same NAT) must not share a rate-limit budget -
        the bucket_key's shape (":ip:" prefix vs. a bare user id) keeps
        them distinct."""
        mock_supabase, mock_table = self._mock_supabase_allowing()
        dep = rate_limit.rate_limit_by_ip_or_user("gh.ingest", max_calls=5)
        with patch("app.middleware.rate_limit.supabase_client", mock_supabase), \
             patch("app.middleware.rate_limit.random.random", return_value=1.0):
            dep(_fake_request(client_host="9.9.9.9"), user_id=None)
            dep(_fake_request(client_host="9.9.9.9"), user_id="real-user-1")
        keys = [c.args[0]["bucket_key"] for c in mock_table.insert.call_args_list]
        assert keys[0] != keys[1]

    def test_anonymous_caller_still_gets_rejected_at_the_limit(self):
        now = datetime.now(timezone.utc)
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = MagicMock(
            data=[{"created_at": _iso(now)} for _ in range(5)]
        )
        dep = rate_limit.rate_limit_by_ip_or_user("gh.ingest", max_calls=5)
        with patch("app.middleware.rate_limit.supabase_client", mock_supabase):
            with pytest.raises(HTTPException) as exc_info:
                dep(_fake_request(client_host="9.9.9.9"), user_id=None)
        assert exc_info.value.status_code == 429


class TestRateLimitDependencyFactory:
    def test_scopes_by_route_name_and_user(self):
        # Two different route names for the same user must be independent
        # buckets - burning one budget shouldn't affect the other.
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = MagicMock(
            data=[]
        )
        dep_a = rate_limit.rate_limit("route.a", max_calls=1)
        dep_b = rate_limit.rate_limit("route.b", max_calls=1)
        with patch("app.middleware.rate_limit.supabase_client", mock_supabase), \
             patch("app.middleware.rate_limit.random.random", return_value=1.0):
            # rate_limit() returns a plain function with a Depends(verify_jwt)
            # default - calling it directly with an explicit user_id bypasses
            # FastAPI's DI machinery, which is exactly what's wanted here.
            user_a = dep_a(user_id="user-1")
            user_b = dep_b(user_id="user-1")
        assert user_a == user_b == "user-1"
        calls = [c.args[0]["bucket_key"] for c in mock_table.insert.call_args_list]
        assert "route.a:user-1" in calls
        assert "route.b:user-1" in calls
