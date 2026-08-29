"""Tests for idempotency_service.py - the fix for "duplicate course
insertion has race/duplicate risks" (a duplicate click or retry against
/rerecommend or /swap could fire a second real LLM+web-search call and
insert a second, different course for what the learner experienced as one
action). No live DB calls; Supabase is mocked throughout.
"""
from unittest.mock import MagicMock, patch

from app.services import idempotency_service


class TestCheckAndReserve:
    def test_no_key_is_a_no_op(self):
        mock_supabase = MagicMock()
        with patch("app.services.idempotency_service.supabase_client", mock_supabase):
            assert idempotency_service.check_and_reserve(None, "user-1", "steps.swap") is None
        mock_supabase.table.assert_not_called()

    def test_new_key_reserves_and_returns_none(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        with patch("app.services.idempotency_service.supabase_client", mock_supabase):
            result = idempotency_service.check_and_reserve("key-123", "user-1", "steps.swap")
        assert result is None
        insert_payload = mock_table.insert.call_args[0][0]
        assert insert_payload["idempotency_key"] == "key-123"
        assert insert_payload["user_id"] == "user-1"
        assert insert_payload["route"] == "steps.swap"

    def test_completed_key_replays_the_cached_result_without_reexecuting(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"response_status": 200, "response_body": {"swapped": True, "step_id": "s1"}}]
        )
        with patch("app.services.idempotency_service.supabase_client", mock_supabase):
            result = idempotency_service.check_and_reserve("key-123", "user-1", "steps.swap")
        assert result == {"status": 200, "body": {"swapped": True, "step_id": "s1"}}
        mock_table.insert.assert_not_called()  # never re-executes the real work

    def test_in_flight_key_returns_425_processing(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        # Row exists but response_status is still NULL - another request with
        # this same key is mid-flight right now.
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"response_status": None, "response_body": None}]
        )
        with patch("app.services.idempotency_service.supabase_client", mock_supabase):
            result = idempotency_service.check_and_reserve("key-123", "user-1", "steps.swap")
        assert result["status"] == 425

    def test_concurrent_reservation_race_is_handled_not_double_executed(self):
        # Simulates two near-simultaneous requests with the SAME key: this
        # one's insert() hits the table's real PRIMARY KEY uniqueness
        # constraint because the other one just won the race.
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        # First select (before insert attempt): no row yet.
        # Second select (after failed insert): the winner's row, still in flight.
        mock_table.select.return_value.eq.return_value.execute.side_effect = [
            MagicMock(data=[]),
            MagicMock(data=[{"response_status": None, "response_body": None}]),
        ]
        mock_table.insert.return_value.execute.side_effect = RuntimeError("duplicate key value violates unique constraint")
        with patch("app.services.idempotency_service.supabase_client", mock_supabase):
            result = idempotency_service.check_and_reserve("key-123", "user-1", "steps.swap")
        assert result["status"] == 425  # told to wait, not allowed to double-execute


class TestStoreResult:
    def test_no_key_is_a_no_op(self):
        mock_supabase = MagicMock()
        with patch("app.services.idempotency_service.supabase_client", mock_supabase):
            idempotency_service.store_result(None, 200, {"ok": True})
        mock_supabase.table.assert_not_called()

    def test_stores_the_real_outcome_for_future_replay(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        with patch("app.services.idempotency_service.supabase_client", mock_supabase):
            idempotency_service.store_result("key-123", 200, {"swapped": True})
        update_payload = mock_table.update.call_args[0][0]
        assert update_payload["response_status"] == 200
        assert update_payload["response_body"] == {"swapped": True}

    def test_never_raises_on_storage_failure(self):
        mock_supabase = MagicMock()
        mock_supabase.table.side_effect = RuntimeError("db down")
        with patch("app.services.idempotency_service.supabase_client", mock_supabase):
            idempotency_service.store_result("key-123", 200, {"ok": True})  # must not raise
