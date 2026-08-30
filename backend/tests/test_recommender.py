"""Tests for app.ml.recommender.Recommender - the class generate_path()
calls directly (get_recommender().recommend(profile)) to build its
candidate pool, and the exact place a real production incident was found:
a seed-era `courses` row with a Google search-results-page resource_url
was being recommended to real learners via generate_path(), even though
swap_step/swap_step_with_preference already validated every newly-
ingested resource through catalog_service. Recommender.recommend() is
where both flows actually converge (via ranking_engine.hard_filter) - see
ranking_engine.py's hard_filter docstring and test_ranking_engine.py's
TestHardFilter for the underlying fix; this file confirms it holds at the
level generate_path() itself calls.

No live network/DB calls - retrieval, embedding, and mastery lookups are
mocked.
"""
from unittest.mock import patch

from app.ml.recommender import Recommender


def _course(cid, title, resource_url, skill_tags=None, difficulty="beginner", availability_status="available"):
    return {
        "id": cid, "title": title, "resource_url": resource_url,
        "skill_tags": skill_tags or [], "difficulty": difficulty,
        "availability_status": availability_status, "similarity": 0.5,
        "description": title, "duration_hrs": 5, "prerequisites": [],
    }


class TestRecommenderExcludesSearchResultsUrls:
    def test_a_search_results_url_never_reaches_generate_path(self):
        candidates = [
            _course("bad-seed", "NumPy and Pandas Essentials",
                    "https://www.google.com/search?q=NumPy+and+Pandas+Essentials+DataCamp+course"),
            _course("good-course", "Real Python Docs Tutorial", "https://docs.python.org/3/tutorial/"),
        ]
        profile = {"id": "user-1", "goal_text": "Learn Python", "target_role": "Analyst",
                   "interests": ["python"], "completed_courses": [], "weekly_hours": 10}

        with patch("app.ml.recommender.embed_text", return_value=[0.1] * 384), \
             patch("app.ml.recommender.retrieve_candidates", return_value=candidates), \
             patch("app.services.mastery_service.get_mastery_by_name", return_value={}), \
             patch("app.services.mastery_service.get_mastery_map", return_value={}), \
             patch("app.ml.ranking_engine.persist_recommendation_run"):
            results = Recommender().recommend(profile)

        result_ids = [c["id"] for c in results]
        assert "bad-seed" not in result_ids
        assert "good-course" in result_ids

    def test_hard_filter_reason_is_recorded_in_the_persisted_run(self):
        """The audit trail (recommendation_runs.hard_filter_reasons) must
        actually say WHY the search-results-URL course was excluded, not
        just silently drop it - "make quality reasons auditable" applies
        here too, not only to the YouTube-specific quality policy."""
        candidates = [
            _course("bad-seed", "Bad Course", "https://www.bing.com/search?q=react+tutorial"),
        ]
        profile = {"id": "user-1", "goal_text": "Learn React", "target_role": "Frontend Dev",
                   "interests": [], "completed_courses": [], "weekly_hours": 10}

        with patch("app.ml.recommender.embed_text", return_value=[0.1] * 384), \
             patch("app.ml.recommender.retrieve_candidates", return_value=candidates), \
             patch("app.services.mastery_service.get_mastery_by_name", return_value={}), \
             patch("app.services.mastery_service.get_mastery_map", return_value={}), \
             patch("app.ml.ranking_engine.persist_recommendation_run") as mock_persist:
            results = Recommender().recommend(profile)

        assert results == []  # the only candidate was excluded - honest empty result, not a fallback
        _, kwargs = mock_persist.call_args
        assert kwargs["hard_filter_reasons"]["bad-seed"] == "resource_url_is_a_search_results_page"
