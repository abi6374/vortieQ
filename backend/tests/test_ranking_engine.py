"""Tests for the deterministic ranking engine (replaces recommender.py's old
ad-hoc _rerank) - the direct fix for two confirmed audit findings:
  1. Confidence/mastery was stored but never used in ranking.
  2. "Interested in X" was used as a proxy for "has X's prerequisites".

No live network/DB calls - taxonomy lookups and Supabase are mocked.
"""
from unittest.mock import MagicMock, patch

import pytest

from app.ml import ranking_engine


class TestHardFilter:
    def test_excludes_completed_and_disliked_never_just_down_ranks(self):
        candidates = [
            {"id": "c1", "title": "Done already"},
            {"id": "c2", "title": "Disliked"},
            {"id": "c3", "title": "Fine"},
        ]
        eligible, reasons = ranking_engine.hard_filter(candidates, completed_ids={"c1"}, disliked_ids={"c2"})
        assert [c["id"] for c in eligible] == ["c3"]
        assert reasons["c1"] == "already_completed"
        assert reasons["c2"] == "learner_marked_not_interested"

    def test_excludes_unavailable_resources(self):
        candidates = [{"id": "c1", "availability_status": "unavailable"}, {"id": "c2", "availability_status": "available"}]
        eligible, reasons = ranking_engine.hard_filter(candidates, completed_ids=set())
        assert [c["id"] for c in eligible] == ["c2"]
        assert reasons["c1"] == "resource_unavailable"

    def test_excludes_a_search_results_url_regardless_of_source(self):
        """Real production incident: a seed-era `courses` row (source=
        'seed', never independently verified - seed data predates the
        catalog_service validation module entirely) had resource_url
        literally "https://www.google.com/search?q=NumPy+and+Pandas+
        Essentials+DataCamp+course" and kept being recommended via
        generate_path(), even though swap/rerecommend already validated
        every NEWLY-ingested resource through catalog_service. hard_filter
        is the one place generate_path() and swap share, so the check
        belongs here - applied to every candidate regardless of
        availability_status or how old/how it was sourced."""
        candidates = [
            {"id": "bad-seed", "availability_status": "available",
             "resource_url": "https://www.google.com/search?q=NumPy+and+Pandas+Essentials+DataCamp+course"},
            {"id": "good-course", "availability_status": "available",
             "resource_url": "https://docs.python.org/3/tutorial/"},
        ]
        eligible, reasons = ranking_engine.hard_filter(candidates, completed_ids=set())
        assert [c["id"] for c in eligible] == ["good-course"]
        assert reasons["bad-seed"] == "resource_url_is_a_search_results_page"

    def test_missing_resource_url_never_crashes_the_filter(self):
        candidates = [{"id": "c1", "availability_status": "available"}]  # no resource_url key at all
        eligible, reasons = ranking_engine.hard_filter(candidates, completed_ids=set())
        assert [c["id"] for c in eligible] == ["c1"]


class TestMasteryChangesRanking:
    """The actual acceptance criterion from the audit: confidence/mastery
    must MATERIALLY change rankings, not just be stored."""

    def _course(self, cid, tags, difficulty, similarity=0.5):
        return {"id": cid, "title": cid, "skill_tags": tags, "difficulty": difficulty, "similarity": similarity}

    def test_high_mastery_learner_scores_beginner_content_lower_than_matched_content(self):
        beginner_python = self._course("c-beginner", ["python"], "beginner")
        advanced_python = self._course("c-advanced", ["python"], "advanced")

        # Learner has real, high, well-established mastery in Python.
        mastery_by_name = {"python": {"mastery_probability": 0.9, "confidence": 0.9}}

        with patch("app.ml.ranking_engine.taxonomy_service.resolve_skill", return_value=None):
            scored = ranking_engine.score_candidates(
                [beginner_python, advanced_python], profile={}, mastery_by_name=mastery_by_name,
            )
        scores_by_id = {s["course"]["id"]: s["total_score"] for s in scored}
        assert scores_by_id["c-advanced"] > scores_by_id["c-beginner"]

    def test_zero_mastery_learner_scores_beginner_content_higher(self):
        beginner_python = self._course("c-beginner", ["python"], "beginner")
        advanced_python = self._course("c-advanced", ["python"], "advanced")
        mastery_by_name = {}  # no evidence at all - honest zero, not a fabricated default

        with patch("app.ml.ranking_engine.taxonomy_service.resolve_skill", return_value=None):
            scored = ranking_engine.score_candidates(
                [beginner_python, advanced_python], profile={}, mastery_by_name=mastery_by_name,
            )
        scores_by_id = {s["course"]["id"]: s["total_score"] for s in scored}
        assert scores_by_id["c-beginner"] > scores_by_id["c-advanced"]


class TestPrerequisitesUseRealEdgesNotInterests:
    def test_interest_alone_does_not_satisfy_a_prerequisite(self):
        # Real audit finding: "interested in Docker" must NOT be read as
        # "has Docker competency" for prerequisite purposes.
        course = {"id": "c1", "skill_tags": ["kubernetes"], "difficulty": "intermediate", "similarity": 0.5}
        profile = {"interests": ["docker"]}  # learner says they're INTERESTED in docker
        mastery_by_name = {}  # but has NO real mastery evidence for it at all
        mastery_by_id = {}

        with patch("app.ml.ranking_engine.taxonomy_service.resolve_skill", return_value="skill-k8s"), \
             patch("app.ml.ranking_engine.taxonomy_service.get_prerequisites",
                   return_value=[{"prerequisite_skill_id": "skill-docker", "required_level": 0.5}]):
            scored = ranking_engine.score_candidates([course], profile, mastery_by_name, mastery_by_id)
        assert scored[0]["feature_scores"]["prerequisites_met"] == 0.0

    def test_real_mastery_evidence_does_satisfy_a_prerequisite(self):
        course = {"id": "c1", "skill_tags": ["kubernetes"], "difficulty": "intermediate", "similarity": 0.5}
        profile = {}
        mastery_by_name = {}
        # Real evidence keyed by skill_id (as skill_prerequisites edges reference it).
        mastery_by_id = {"skill-docker": {"mastery_probability": 0.8, "confidence": 0.7}}

        with patch("app.ml.ranking_engine.taxonomy_service.resolve_skill", return_value="skill-k8s"), \
             patch("app.ml.ranking_engine.taxonomy_service.get_prerequisites",
                   return_value=[{"prerequisite_skill_id": "skill-docker", "required_level": 0.5}]):
            scored = ranking_engine.score_candidates([course], profile, mastery_by_name, mastery_by_id)
        assert scored[0]["feature_scores"]["prerequisites_met"] == 1.0


class TestDiversity:
    def test_third_course_on_same_skill_deprioritized_versus_a_new_skill(self):
        # Three python courses all scoring identically, one course on a
        # totally different, uncovered skill scoring slightly lower -
        # diversity should still let the new-skill course surface among them
        # rather than an unbroken run of near-duplicates.
        candidates = [
            {"id": f"py-{i}", "skill_tags": ["python"], "difficulty": "beginner", "similarity": 0.9}
            for i in range(4)
        ]
        candidates.append({"id": "sql-1", "skill_tags": ["sql"], "difficulty": "beginner", "similarity": 0.85})

        with patch("app.ml.ranking_engine.taxonomy_service.resolve_skill", return_value=None):
            scored = ranking_engine.score_candidates(candidates, profile={}, mastery_by_name={})
        order = [s["course"]["id"] for s in scored]
        # The sql course should not be stuck dead last behind all 4 identical
        # python picks - diversity should pull it up at least one spot.
        assert order.index("sql-1") < 4


class TestPersistRecommendationRun:
    def test_never_raises_on_persistence_failure(self):
        mock_supabase = MagicMock()
        mock_supabase.table.side_effect = RuntimeError("db unreachable")
        with patch("app.ml.ranking_engine.supabase_client", mock_supabase):
            result = ranking_engine.persist_recommendation_run(
                "user-1", None, "path_generate", {}, [], {}, [], []
            )
        assert result is None  # degrades honestly, doesn't crash the real recommendation
