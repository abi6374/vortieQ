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


def test_resume_topic_validation_never_fabricates_confidence_when_llm_omits_it():
    """Platform-audit fix: a missing/invalid confidence_pct from the LLM
    used to trigger _calculate_fallback_confidence() - a formula that
    invented a fine-grained percentage (level + evidence word count + years)
    that looked identical to a real LLM-stated confidence. That function no
    longer exists; a missing/invalid confidence_pct must now surface as a
    real None, letting mastery_service apply its own documented, honest,
    low default confidence for the 'resume' source instead."""
    raw_payload = {
        "topics": [
            {"name": "Python", "suggested_level": "advanced", "evidence": "5 years backend"},  # no confidence_pct at all
            {"name": "SQL", "suggested_level": "intermediate", "evidence": "some", "confidence_pct": "not-a-number"},
            {"name": "Docker", "suggested_level": "basic", "evidence": "", "confidence_pct": 250},  # out of range
        ],
    }
    validated = _validate(raw_payload)
    assert len(validated["topics"]) == 3
    for topic in validated["topics"]:
        assert topic["confidence_pct"] is None


def test_resume_topic_validation_trusts_a_real_in_range_llm_confidence():
    raw_payload = {"topics": [{"name": "Rust", "suggested_level": "basic", "evidence": "", "confidence_pct": 65}]}
    validated = _validate(raw_payload)
    assert validated["topics"][0]["confidence_pct"] == 65


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


def test_swap_step_compares_alternatives_and_explains_the_winner():
    """swap_step (the plain, non-preference version - used by too_easy/
    too_hard/not_interested/resource_unavailable feedback) had zero direct
    test coverage before this - every existing test mocked it out entirely.
    Covers the platform-audit requirement to compare >=3 verified
    alternatives and explain, deterministically, why the winner was chosen
    over the runner-up - not just silently picking candidates[0]."""
    from app.services.path_service import swap_step

    mock_supabase = MagicMock()
    step_resp = MagicMock(data=[{
        "id": "step-1", "path_id": "path-1", "sequence_order": 3,
        "milestone_label": "Core Skills", "status": "not_started",
        "courses": {
            "id": "old-course", "title": "Old Course", "description": "",
            "provider": "X", "difficulty": "intermediate", "duration_hrs": 5,
            "resource_url": "https://old.example/course", "skill_tags": ["python", "pandas"],
            "prerequisites": [],
        },
        "learning_paths": {"id": "path-1", "user_id": "user-1", "goal_text": "Be a data analyst"},
    }])
    profile_resp = MagicMock(data=[{"id": "user-1", "current_level": "intermediate", "completed_courses": []}])

    def table(name):
        t = MagicMock()
        if name == "path_steps":
            t.select.return_value.eq.return_value.execute.return_value = step_resp
            # _bump_later_sequences / in_path lookup - no later steps, no other steps in path.
            t.select.return_value.eq.return_value.gt.return_value.execute.return_value = MagicMock(data=[])
            t.insert.return_value.execute.return_value = MagicMock(data=[{"id": "new-step-id"}])
            t.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{"id": "step-1"}])
        elif name == "profiles":
            t.select.return_value.eq.return_value.execute.return_value = profile_resp
        elif name == "feedback_events":
            t.insert.return_value.execute.return_value = MagicMock(data=[{"id": "fb-1"}])
        elif name == "learning_paths":
            t.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[{"version": 1}])
            t.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{"id": "path-1"}])
        return t

    mock_supabase.table.side_effect = table

    # Three real candidates: the second-best overlaps on both tags (should
    # win), the others overlap on only one or zero tags.
    fake_recommender = MagicMock()
    fake_recommender.recommend.return_value = [
        {"id": "c-weak", "title": "Weak Match", "difficulty": "intermediate",
         "skill_tags": ["excel"], "similarity": 0.1},
        {"id": "c-best", "title": "Best Match", "difficulty": "intermediate",
         "skill_tags": ["python", "pandas"], "similarity": 0.5},
        {"id": "c-partial", "title": "Partial Match", "difficulty": "intermediate",
         "skill_tags": ["python"], "similarity": 0.3},
    ]

    with patch("app.services.path_service.supabase_client", mock_supabase), \
         patch("app.services.path_service.get_recommender", return_value=fake_recommender), \
         patch("app.services.path_service.generate_explanation", return_value="A great fit."), \
         patch("app.ml.ranking_engine.persist_recommendation_run") as mock_persist:
        result = swap_step("step-1", "user-1", level_hint=0)

    assert result["swapped"] is True
    assert result["new_step"]["course_id"] == "c-best"
    # Deterministic, non-LLM explanation - names the real winner and runner-up.
    assert "Best Match" in result["comparison_note"]
    assert "Partial Match" in result["comparison_note"]
    assert "Compared 3 verified alternatives" in result["comparison_note"]

    # Real audit trail persisted - trigger='swap' per migration 008's own
    # documented allowed values, final_course_ids names the actual winner.
    mock_persist.assert_called_once()
    _, kwargs = mock_persist.call_args
    assert kwargs["trigger"] == "swap"
    assert kwargs["final_course_ids"] == ["c-best"]
    assert len(kwargs["scored"]) == 3  # compared up to 3, never fabricated more


def test_swap_step_with_only_one_alternative_says_so_honestly():
    from app.services.path_service import swap_step

    mock_supabase = MagicMock()
    step_resp = MagicMock(data=[{
        "id": "step-1", "path_id": "path-1", "sequence_order": 1,
        "milestone_label": "Core Skills", "status": "not_started",
        "courses": {"id": "old-course", "title": "Old Course", "description": "",
                    "provider": "X", "difficulty": "beginner", "duration_hrs": 5,
                    "resource_url": "https://old.example/course", "skill_tags": ["python"],
                    "prerequisites": []},
        "learning_paths": {"id": "path-1", "user_id": "user-1", "goal_text": "Learn Python"},
    }])
    profile_resp = MagicMock(data=[{"id": "user-1", "current_level": "beginner", "completed_courses": []}])

    def table(name):
        t = MagicMock()
        if name == "path_steps":
            t.select.return_value.eq.return_value.execute.return_value = step_resp
            t.select.return_value.eq.return_value.gt.return_value.execute.return_value = MagicMock(data=[])
            t.insert.return_value.execute.return_value = MagicMock(data=[{"id": "new-step-id"}])
            t.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{"id": "step-1"}])
        elif name == "profiles":
            t.select.return_value.eq.return_value.execute.return_value = profile_resp
        elif name == "feedback_events":
            t.insert.return_value.execute.return_value = MagicMock(data=[{"id": "fb-1"}])
        elif name == "learning_paths":
            t.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[{"version": 1}])
            t.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{"id": "path-1"}])
        return t

    mock_supabase.table.side_effect = table
    fake_recommender = MagicMock()
    fake_recommender.recommend.return_value = [
        {"id": "only-option", "title": "Only Option", "difficulty": "beginner", "skill_tags": ["python"], "similarity": 0.4},
    ]

    with patch("app.services.path_service.supabase_client", mock_supabase), \
         patch("app.services.path_service.get_recommender", return_value=fake_recommender), \
         patch("app.services.path_service.generate_explanation", return_value="Fits well."), \
         patch("app.ml.ranking_engine.persist_recommendation_run"):
        result = swap_step("step-1", "user-1", level_hint=0)

    assert result["swapped"] is True
    assert result["comparison_note"] == "Only one verified alternative was available for this swap."


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
         patch("app.services.path_service._validate_resource_url", return_value=True), \
         patch("app.ml.embedder.embed_text", return_value=[0.1] * 384), \
         patch("app.services.mastery_service.update_mastery_from_feedback") as mock_mastery, \
         patch("app.services.mastery_service.find_unmet_prerequisites", return_value=[]) as mock_gaps, \
         patch("app.services.youtube_provider.YouTubeProviderAdapter.search_videos", return_value=[]):
        # 'too_advanced' now updates real mastery evidence (see path_service.
        # swap_step_with_preference) - without these patches this call would
        # otherwise reach the REAL app.services.mastery_service.supabase_client
        # (a module-level import, unaffected by patching path_service's
        # reference), i.e. a live network call against whatever
        # SUPABASE_URL .env points at. Confirmed via the live DB that an
        # earlier unpatched run of this exact test wrote nothing (the fake
        # "u-1" user id isn't valid UUID syntax, so the write failed closed) -
        # but that was luck, not test isolation, so it's fixed here rather
        # than left relying on it again.
        #
        # Same reasoning for YouTube: swap_step_with_preference now also
        # searches YouTube (see path_service's YouTube-integration block) -
        # this dev machine has a REAL YOUTUBE_API_KEY configured in .env for
        # production use, so this call would otherwise burn real quota on
        # every test run instead of exercising a mock.
        res = swap_step_with_preference("step-1", "u-1", preference="too_advanced", note="Need a gentler intro")

        assert res["swapped"] is True
        assert res["replacement"]["title"] == "Kubernetes Basics & Interactive Labs"
        assert res["replacement"]["id"] == "c-k8s-new"
        # Real mastery evidence recorded for the OLD course's skills, as
        # too_hard (too_advanced = the recommender overestimated this skill).
        mock_mastery.assert_called_once_with("u-1", ["Kubernetes", "DevOps"], "too_hard")
        mock_gaps.assert_called_once_with("u-1", ["Kubernetes", "DevOps"])
        assert res["reason_for_change"]


def _swap_with_preference_base_mocks(preferred_formats):
    """Shared fixture builder for the two format-preference tests below -
    same shape as test_swap_step_with_preference_realtime_flow, just with
    a configurable profile.preferred_formats and no dependency on the
    exact LLM/course output (those tests only assert whether the YouTube
    search was invoked, not what the swap ultimately picked)."""
    import json as _json

    mock_supabase = MagicMock()
    mock_step_resp = MagicMock(data=[{
        "id": "step-1", "path_id": "path-1", "milestone_label": "Core Skills",
        "courses": {"id": "c-old", "title": "Old Course", "description": "",
                    "difficulty": "beginner", "skill_tags": ["Python"]},
        "learning_paths": {"id": "path-1", "user_id": "u-1"},
    }])
    mock_prof_resp = MagicMock(data=[{
        "id": "u-1", "target_role": "Analyst", "current_level": "beginner",
        "goal_text": "Learn Python", "preferred_formats": preferred_formats,
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
                "id": "new-course", "title": "New Course", "provider": "Docs",
                "resource_url": "https://docs.python.org/3/tutorial/", "difficulty": "beginner", "duration_hrs": 3,
            }])
        return t

    mock_supabase.table.side_effect = mock_table
    mock_llm_json = _json.dumps({
        "title": "New Course", "provider": "Docs", "description": "A real course.",
        "resource_url": "https://docs.python.org/3/tutorial/", "difficulty": "beginner",
        "duration_hrs": 3, "skill_tags": ["Python"], "explanation": "Fits the request.",
    })
    return mock_supabase, mock_llm_json


def test_swap_step_with_preference_searches_youtube_when_video_is_preferred():
    from app.services.path_service import swap_step_with_preference

    mock_supabase, mock_llm_json = _swap_with_preference_base_mocks(["course", "video", "article"])
    with patch("app.services.path_service.supabase_client", mock_supabase), \
         patch("app.services.web_search_service.search_learning_resources", return_value=[]), \
         patch("app.services.path_service._call_groq", return_value=mock_llm_json), \
         patch("app.services.path_service._validate_resource_url", return_value=True), \
         patch("app.ml.embedder.embed_text", return_value=[0.1] * 384), \
         patch("app.services.youtube_provider.YouTubeProviderAdapter.search_videos", return_value=[]) as mock_yt:
        swap_step_with_preference("step-1", "u-1", preference="custom", note="")

    mock_yt.assert_called_once()


def test_swap_step_with_preference_skips_youtube_when_learner_excludes_video():
    """Real learner preference (profiles.preferred_formats, previously
    stored but never consulted anywhere) now genuinely gates whether video
    candidates are even offered to the LLM - "video recommendations
    should not dominate learners who prefer practice/docs/courses.\""""
    from app.services.path_service import swap_step_with_preference

    mock_supabase, mock_llm_json = _swap_with_preference_base_mocks(["course", "article"])  # no 'video'
    with patch("app.services.path_service.supabase_client", mock_supabase), \
         patch("app.services.web_search_service.search_learning_resources", return_value=[]), \
         patch("app.services.path_service._call_groq", return_value=mock_llm_json), \
         patch("app.services.path_service._validate_resource_url", return_value=True), \
         patch("app.ml.embedder.embed_text", return_value=[0.1] * 384), \
         patch("app.services.youtube_provider.YouTubeProviderAdapter.search_videos", return_value=[]) as mock_yt:
        swap_step_with_preference("step-1", "u-1", preference="custom", note="")

    mock_yt.assert_not_called()


def test_bump_path_version_increments_and_stamps_freshness():
    """Real-time-behavior fix: learning_paths.version/last_recomputed_at
    (migration 008) let a client detect a stale roadmap without a blind
    refresh timer. Called from every real path mutation."""
    from app.services.roadmap_service import bump_path_version

    mock_supabase = MagicMock()
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table
    mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[{"version": 3}])

    with patch("app.services.roadmap_service.supabase_client", mock_supabase):
        bump_path_version("path-1")

    update_payload = mock_table.update.call_args[0][0]
    assert update_payload["version"] == 4
    assert "last_recomputed_at" in update_payload


def test_bump_path_version_never_raises_on_failure():
    from app.services.roadmap_service import bump_path_version

    mock_supabase = MagicMock()
    mock_supabase.table.side_effect = RuntimeError("db down")
    with patch("app.services.roadmap_service.supabase_client", mock_supabase):
        bump_path_version("path-1")  # must not raise - this is a best-effort signal




