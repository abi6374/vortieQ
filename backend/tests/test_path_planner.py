"""Tests for path_planner.py - deterministic prerequisite validation/repair
of LLM-proposed milestone ordering ("LLM can produce incoherent ordering"
from the audit). No live DB calls - taxonomy_service is mocked.
"""
from unittest.mock import patch

from app.services import path_planner


def _course(cid, tags):
    return {"id": cid, "skill_tags": tags}


class TestValidateAndReorder:
    def test_leaves_an_already_correct_order_untouched(self):
        course_lookup = {
            "docker-course": _course("docker-course", ["docker"]),
            "k8s-course": _course("k8s-course", ["kubernetes"]),
        }
        milestones = [{"label": "M1", "course_ids": ["docker-course", "k8s-course"]}]

        def fake_resolve(tag):
            return {"docker": "skill-docker", "kubernetes": "skill-k8s"}.get(tag)

        def fake_prereqs(skill_id):
            if skill_id == "skill-k8s":
                return [{"prerequisite_skill_id": "skill-docker", "required_level": 0.5}]
            return []

        with patch("app.services.path_planner.taxonomy_service.resolve_skill", side_effect=fake_resolve), \
             patch("app.services.path_planner.taxonomy_service.get_prerequisites", side_effect=fake_prereqs):
            reordered, violations = path_planner.validate_and_reorder(milestones, course_lookup)
        assert reordered[0]["course_ids"] == ["docker-course", "k8s-course"]
        assert violations == []

    def test_reorders_when_llm_puts_the_dependent_course_first(self):
        course_lookup = {
            "k8s-course": _course("k8s-course", ["kubernetes"]),
            "docker-course": _course("docker-course", ["docker"]),
        }
        # LLM proposed Kubernetes BEFORE Docker, even though k8s needs docker
        # and docker IS taught later in this same path.
        milestones = [{"label": "M1", "course_ids": ["k8s-course", "docker-course"]}]

        def fake_resolve(tag):
            return {"docker": "skill-docker", "kubernetes": "skill-k8s"}.get(tag)

        def fake_prereqs(skill_id):
            if skill_id == "skill-k8s":
                return [{"prerequisite_skill_id": "skill-docker", "required_level": 0.5}]
            return []

        with patch("app.services.path_planner.taxonomy_service.resolve_skill", side_effect=fake_resolve), \
             patch("app.services.path_planner.taxonomy_service.get_prerequisites", side_effect=fake_prereqs):
            reordered, violations = path_planner.validate_and_reorder(milestones, course_lookup)
        assert reordered[0]["course_ids"] == ["docker-course", "k8s-course"]
        assert len(violations) == 1

    def test_preserves_milestone_boundaries_and_labels(self):
        course_lookup = {
            "a": _course("a", []), "b": _course("b", []), "c": _course("c", []),
        }
        milestones = [
            {"label": "Foundations", "estimated_weeks": 2, "course_ids": ["a", "b"]},
            {"label": "Advanced", "estimated_weeks": 3, "course_ids": ["c"]},
        ]
        with patch("app.services.path_planner.taxonomy_service.resolve_skill", return_value=None):
            reordered, violations = path_planner.validate_and_reorder(milestones, course_lookup)
        assert reordered[0]["label"] == "Foundations"
        assert reordered[0]["estimated_weeks"] == 2
        assert reordered[0]["course_ids"] == ["a", "b"]
        assert reordered[1]["course_ids"] == ["c"]
        assert violations == []

    def test_never_infinite_loops_on_a_prerequisite_not_covered_in_this_path(self):
        # The prerequisite skill isn't taught by ANY course in this path -
        # reordering can't fix that, and the function must not hang trying.
        course_lookup = {"k8s-course": _course("k8s-course", ["kubernetes"])}
        milestones = [{"label": "M1", "course_ids": ["k8s-course"]}]

        def fake_prereqs(skill_id):
            return [{"prerequisite_skill_id": "skill-docker-not-in-path", "required_level": 0.5}]

        with patch("app.services.path_planner.taxonomy_service.resolve_skill", return_value="skill-k8s"), \
             patch("app.services.path_planner.taxonomy_service.get_prerequisites", side_effect=fake_prereqs):
            reordered, violations = path_planner.validate_and_reorder(milestones, course_lookup)
        assert reordered[0]["course_ids"] == ["k8s-course"]
        assert violations == []

    def test_single_course_path_is_a_no_op(self):
        course_lookup = {"a": _course("a", ["python"])}
        milestones = [{"label": "M1", "course_ids": ["a"]}]
        reordered, violations = path_planner.validate_and_reorder(milestones, course_lookup)
        assert reordered == milestones
        assert violations == []
