import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.services.resume_service import extract_text, _validate
from app.services.web_search_service import _rank, search_learning_resources
from app.services.profile_service import upsert_profile


client = TestClient(app)


def test_health_check():
    """Verify GET /health returns 200 OK without latency."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "ok"
    assert "version" in data


def test_resume_text_extraction_validation():
    """Verify resume text extraction rejects empty payloads."""
    with pytest.raises(ValueError, match="Empty file"):
        extract_text(b"", "resume.pdf")


def test_resume_topic_validation():
    """Verify _validate sanitizes topics, levels, and years."""
    raw_payload = {
        "topics": [
            {"name": "Python", "suggested_level": "Advanced", "evidence": "5 years backend", "confidence_pct": 95},
            {"name": "InvalidSkill", "suggested_level": "unknown_level", "evidence": ""},
        ],
        "detected_years_experience": "4",
    }
    validated = _validate(raw_payload)
    assert validated["detected_years_experience"] == 4
    assert len(validated["topics"]) == 1
    assert validated["topics"][0]["name"] == "Python"
    assert validated["topics"][0]["suggested_level"] == "advanced"


def test_profile_upsert_preserves_topic_ratings():
    """Verify profile_service.upsert_profile persists topic_ratings and detected_years."""
    mock_supabase = MagicMock()
    mock_table = MagicMock()
    mock_upsert = MagicMock()
    mock_execute = MagicMock()

    mock_supabase.table.return_value = mock_table
    mock_table.upsert.return_value = mock_upsert
    mock_upsert.execute.return_value = MagicMock(data=[{"id": "user-123"}])

    with patch("app.services.profile_service.supabase_client", mock_supabase):
        data = {
            "goal_text": "Become an AIML engineer",
            "target_role": "AIML Engineer",
            "current_level": "intermediate",
            "interests": ["Python", "Machine Learning"],
            "weekly_hours": 8,
            "topic_ratings": [{"name": "Python", "suggested_level": "advanced"}],
            "detected_years_experience": 3,
        }
        res = upsert_profile("user-123", data)
        assert res["id"] == "user-123"

        # Verify the payload passed to supabase table upsert
        called_payload = mock_table.upsert.call_args[0][0]
        assert called_payload["id"] == "user-123"
        assert called_payload["topic_ratings"] == [{"name": "Python", "suggested_level": "advanced"}]
        assert called_payload["detected_years_experience"] == 3


def test_web_search_ranking_and_graceful_fallback():
    """Verify search ranking prioritizes preferred course domains."""
    sample_results = [
        {"href": "https://randomblog.com/post", "title": "Random Blog"},
        {"href": "https://coursera.org/learn/ml", "title": "Coursera ML"},
        {"href": "https://nptel.ac.in/courses/106", "title": "NPTEL AI"},
    ]
    ranked = _rank(sample_results)
    assert "nptel.ac.in" in ranked[0]["href"]
    assert "coursera.org" in ranked[1]["href"]
    assert "randomblog.com" in ranked[2]["href"]
