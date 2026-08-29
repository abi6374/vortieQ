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


def test_partial_upsert_never_wipes_untouched_fields():
    """Real production bug: routers/github.py's GitHub-sync flow calls
    upsert_profile(user_id, {"topic_ratings": ..., "detected_years_experience": ...})
    ONLY - it never has goal_text/target_role/current_level/interests/
    weekly_hours. upsert_profile used to unconditionally build those 5 keys
    with hardcoded fallbacks ("", "", "beginner", [], 10) whenever the caller
    didn't supply them, and since Supabase's upsert SETs every column present
    in the submitted JSON, every GitHub sync silently blanked an existing
    learner's real goal/role/level/interests/hours. This must be a true
    partial update: a GitHub-only call's payload must contain ONLY the keys
    it actually supplied, so Supabase's upsert leaves every other column on
    the existing row untouched."""
    mock_supabase = MagicMock()
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table
    mock_table.upsert.return_value.execute.return_value = MagicMock(data=[{"id": "user-123"}])

    with patch("app.services.profile_service.supabase_client", mock_supabase):
        github_sync_data = {
            "topic_ratings": [{"name": "Rust", "suggested_level": "advanced"}],
            "detected_years_experience": 5,
        }
        upsert_profile("user-123", github_sync_data)

        called_payload = mock_table.upsert.call_args[0][0]
        assert called_payload == {
            "id": "user-123",
            "topic_ratings": [{"name": "Rust", "suggested_level": "advanced"}],
            "detected_years_experience": 5,
        }
        for untouched in ("goal_text", "target_role", "current_level", "interests", "weekly_hours"):
            assert untouched not in called_payload, (
                f"upsert payload must not include {untouched!r} when the caller "
                "never supplied it - including it (even as a fallback default) "
                "would overwrite the learner's real existing value with that default."
            )


def test_upsert_profile_persists_github_username_and_repos():
    """routers/github.py's username-based sync path passes github_username
    and github_repos_summary (migration 004_github_profile_link.sql) -
    verify upsert_profile actually forwards them, as the single source of
    truth for "which GitHub account is connected" (previously scattered
    across localStorage keys and onboarding-only component state)."""
    mock_supabase = MagicMock()
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table
    mock_table.upsert.return_value.execute.return_value = MagicMock(data=[{"id": "user-123"}])

    with patch("app.services.profile_service.supabase_client", mock_supabase):
        upsert_profile("user-123", {
            "topic_ratings": [],
            "detected_years_experience": 3,
            "github_username": "octocat",
            "github_repos_summary": [{"name": "Hello-World", "language": "Python"}],
        })

        called_payload = mock_table.upsert.call_args[0][0]
        assert called_payload["github_username"] == "octocat"
        assert called_payload["github_repos_summary"] == [{"name": "Hello-World", "language": "Python"}]


def test_web_search_ranking_and_graceful_fallback():
    """Verify search ranking prioritizes preferred course domains."""
    sample_results = [
        {"href": "https://randomblog.com/post", "title": "Random Blog"},
        {"href": "https://coursera.org/learn/ml", "title": "Coursera ML"},
        {"href": "https://nptel.ac.in/courses/106", "title": "NPTEL AI"},
        {"href": "https://takeuforward.org/strivers-a2z-dsa-course-sheet", "title": "Striver A2Z Sheet"},
        {"href": "https://www.geeksforgeeks.org/python-programming-language", "title": "GFG Python"},
    ]
    ranked = _rank(sample_results)
    assert any("nptel.ac.in" in r["href"] for r in ranked[:3])
    assert any("takeuforward.org" in r["href"] for r in ranked[:3])
    assert any("geeksforgeeks.org" in r["href"] for r in ranked[:3])


def test_detect_provider_and_type():
    from app.services.web_search_service import _detect_provider_and_type
    prov1, type1 = _detect_provider_and_type("https://takeuforward.org/dsa-sheet", "Striver A2Z DSA")
    assert prov1 == "Striver Sheet"
    assert type1 == "practice_sheet"

    prov2, type2 = _detect_provider_and_type("https://www.geeksforgeeks.org/tree-data-structure", "Tree in GFG")
    assert prov2 == "GeeksforGeeks"
    assert type2 == "article"

    prov3, type3 = _detect_provider_and_type("https://docs.python.org/3/tutorial", "Python Docs")
    assert prov3 == "Official Documentation"
    assert type3 == "documentation"


def test_swap_step_with_preference_realtime_flow():
    """Verify swap_step_with_preference searches live resources and updates step with LLM output."""
    from unittest.mock import patch, MagicMock
    from app.services.path_service import swap_step_with_preference
    import json

    mock_supabase = MagicMock()
    # Step query
    mock_step_resp = MagicMock(data=[{
        "id": "step-1",
        "path_id": "path-1",
        "milestone_label": "Container Orchestration",
        "courses": {
            "id": "c-k8s-old",
            "title": "Kubernetes for Beginners",
            "description": "Deep cluster setup",
            "difficulty": "intermediate",
            "skill_tags": ["Kubernetes", "DevOps"],
        },
        "learning_paths": {"id": "path-1", "user_id": "u-1"}
    }])
    # Profile query
    mock_prof_resp = MagicMock(data=[{
        "id": "u-1",
        "target_role": "DevOps Engineer",
        "current_level": "beginner",
        "goal_text": "Learn Kubernetes and cloud",
    }])

    def mock_table(name):
        t = MagicMock()
        if name == "path_steps":
            t.select.return_value.eq.return_value.execute.return_value = mock_step_resp
            t.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{"id": "step-1"}])
        elif name == "profiles":
            t.select.return_value.eq.return_value.execute.return_value = mock_prof_resp
        elif name == "courses":
            t.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
            t.select.return_value.ilike.return_value.execute.return_value = MagicMock(data=[])
            t.insert.return_value.execute.return_value = MagicMock(data=[{
                "id": "c-k8s-new",
                "title": "Kubernetes Basics & Interactive Labs",
                "provider": "Kubernetes Official Docs",
                "resource_url": "https://kubernetes.io/docs/tutorials/kubernetes-basics/",
                "difficulty": "beginner",
                "duration_hrs": 5,
            }])
        return t

    mock_supabase.table.side_effect = mock_table

    mock_search = [
        {
            "title": "Kubernetes Basics Interactive Labs",
            "url": "https://kubernetes.io/docs/tutorials/kubernetes-basics/",
            "provider": "Kubernetes Official Docs",
            "snippet": "Learn Kubernetes fundamentals with interactive hands-on browser labs",
        }
    ]

    mock_llm_json = json.dumps({
        "title": "Kubernetes Basics & Interactive Labs",
        "provider": "Kubernetes Official Docs",
        "description": "Interactive step-by-step walkthrough of pods and services.",
        "resource_url": "https://kubernetes.io/docs/tutorials/kubernetes-basics/",
        "difficulty": "beginner",
        "duration_hrs": 5,
        "skill_tags": ["Kubernetes", "DevOps"],
        "explanation": "Gentle foundation for Kubernetes requested by the learner.",
    })

    with patch("app.services.path_service.supabase_client", mock_supabase), \
         patch("app.services.web_search_service.search_learning_resources", return_value=mock_search), \
         patch("app.services.path_service._call_groq", return_value=mock_llm_json), \
         patch("app.ml.embedder.embed_text", return_value=[0.1] * 384):

        res = swap_step_with_preference("step-1", "u-1", preference="too_advanced", note="Need a gentler intro")

        assert res["swapped"] is True
        assert res["replacement"]["title"] == "Kubernetes Basics & Interactive Labs"
        assert res["replacement"]["id"] == "c-k8s-new"




