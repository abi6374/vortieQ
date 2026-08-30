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
