"""Tests for real-enum hardening on hackathons.py/internships.py/coach.py -
previously `status`/`new_status` were bare `str` Query params, so any value
other than the DB's own CHECK constraint would only ever be caught by
Postgres itself, surfacing as an opaque 500 (and, before a related fix,
leaking the raw error string to the client) instead of a clean 422.

Uses FastAPI's dependency_overrides to bypass real auth/rate-limiting and
isolate what's actually under test here: request-schema validation, not
the downstream service logic (which is separately unit-tested / would
need its own live-Supabase-shaped mocks). No live network/DB calls.
"""
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.middleware.auth import verify_jwt

client = TestClient(app)


@pytest.fixture(autouse=True)
def _bypass_auth_and_rate_limit():
    # Overriding verify_jwt alone is enough even for a route whose own
    # Depends() is rate_limit(...)'s closure, not verify_jwt directly:
    # FastAPI resolves the full dependency tree, and rate_limit()'s
    # returned closure has verify_jwt as ITS OWN sub-dependency, so the
    # override applies transitively. Still need to keep rate_limit()'s
    # real DB-backed check from reaching the live rate_limit_hits table -
    # same fix already applied in test_security_and_integrity.py.
    app.dependency_overrides[verify_jwt] = lambda: "test-user-1"
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.execute.return_value = MagicMock(data=[])
    with patch("app.middleware.rate_limit.supabase_client", mock_supabase):
        yield
    app.dependency_overrides.clear()


class TestHackathonStatusEnum:
    def test_unknown_status_value_rejected_before_reaching_the_service(self):
        with patch("app.services.hackathon_service.register_for_hackathon") as mock_register:
            r = client.post("/api/hackathons/h1/register", params={"status": "not_a_real_status"})
        assert r.status_code == 422
        mock_register.assert_not_called()

    def test_real_status_values_accepted(self):
        with patch("app.services.hackathon_service.register_for_hackathon", return_value={"ok": True}):
            for status in ("tracked", "saved", "registered", "interested", "submitted"):
                r = client.post("/api/hackathons/h1/register", params={"status": status})
                assert r.status_code == 200


class TestInternshipStatusEnums:
    def test_apply_rejects_an_unknown_status(self):
        with patch("app.services.internship_service.apply_to_internship") as mock_apply:
            r = client.post("/api/internships/i1/apply", params={"status": "ghosted"})
        assert r.status_code == 422
        mock_apply.assert_not_called()

    def test_update_status_rejects_a_value_outside_the_real_check_constraint(self):
        with patch("app.services.internship_service.update_application_status") as mock_update:
            r = client.patch("/api/internships/i1/status", params={"new_status": "withdrawn"})
        assert r.status_code == 422
        mock_update.assert_not_called()

    def test_update_status_accepts_every_real_check_constraint_value(self):
        with patch("app.services.internship_service.update_application_status", return_value={"ok": True}):
            for status in ("tracked", "applied", "saved", "interviewing", "offer", "rejected"):
                r = client.patch("/api/internships/i1/status", params={"new_status": status})
                assert r.status_code == 200

    def test_apply_accepts_every_relevant_status_value(self):
        with patch("app.services.internship_service.apply_to_internship", return_value={"ok": True}):
            for status in ("tracked", "applied", "saved"):
                r = client.post("/api/internships/i1/apply", params={"status": status})
                assert r.status_code == 200


class TestCoachPracticeRequestLimits:
    def test_oversized_topic_rejected(self):
        r = client.post("/api/coach/practice", json={"topic": "x" * 300})
        assert r.status_code == 422

    def test_count_out_of_range_rejected(self):
        r = client.post("/api/coach/practice", json={"topic": "Python basics", "count": 999})
        assert r.status_code == 422

    def test_valid_request_shape_accepted(self):
        with patch("app.services.coach_service.generate_practice", return_value=[]):
            r = client.post("/api/coach/practice", json={"topic": "Python basics", "count": 5})
        assert r.status_code == 200
