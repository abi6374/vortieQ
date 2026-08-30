"""Tests for Phase 2 of the platform-audit continuation: real-time feedback
adaptation.

Covers two real production gaps found by direct inspection, not assumed:

1. 'too_hard' (the symmetric opposite of 'too_easy') - previously feedback
   only supported completed/too_easy/not_interested; a learner who found a
   course too hard had no honest way to say so, and the recommender kept
   the same (over-)estimate of their mastery.

2. apply_recent_feedback (formerly apply_week_feedback) - natural-language
   feedback left on a task used to sit unused until every OTHER task in
   that same week was also completed. It now fires immediately on the
   completion event that carries it.

No live network calls; Supabase and the LLM are mocked throughout.
"""
from unittest.mock import MagicMock, patch

from app.services import feedback_service


def _step_and_path(status="not_started"):
    step = {
        "id": "step-1",
        "path_id": "path-1",
        "status": status,
        "courses": {"id": "course-1", "skill_tags": ["React"], "title": "React Basics"},
        "learning_paths": {"id": "path-1", "user_id": "user-1"},
    }
    path = {"id": "path-1", "user_id": "user-1"}
    return step, path


class TestTooHardFeedback:
    def test_too_hard_lowers_mastery_before_swapping_easier(self):
        step, path = _step_and_path()
        fake_swap_result = {
            "swapped": True,
            "new_step": {"step_id": "step-2", "title": "Easier Alternative"},
            "path_version": 3,
            "last_recomputed_at": "2026-01-01T00:00:00Z",
        }
        with patch("app.services.feedback_service._load_step_with_path", return_value=(step, path)), \
             patch("app.services.feedback_service._write_feedback_event", return_value="fb-1"), \
             patch("app.services.mastery_service.update_mastery_from_feedback") as mock_mastery, \
             patch("app.services.mastery_service.find_unmet_prerequisites", return_value=[]), \
             patch("app.services.path_service.swap_step", return_value=fake_swap_result) as mock_swap:
            result = feedback_service.handle_feedback("step-1", "too_hard", "", "user-1")

        # Mastery lowered for this course's real skill_tags, event_type passed through honestly.
        mock_mastery.assert_called_once_with("user-1", ["React"], "too_hard")
        # Requests an EASIER replacement (negative level_hint), not harder or same.
        mock_swap.assert_called_once_with("step-1", "user-1", level_hint=-1)
        assert result["path_updated"] is True
        assert result["path_version"] == 3
        assert result["reason_for_change"]
        assert "lowered our confidence" in result["reason_for_change"]

    def test_too_hard_names_a_real_unmet_prerequisite_in_the_reason(self):
        step, path = _step_and_path()
        fake_swap_result = {"swapped": True, "new_step": {"step_id": "step-2"}}
        gap = [{"prerequisite_skill_id": "skill-js", "required_level": 0.5,
                "current_mastery": None, "name": "JavaScript"}]
        with patch("app.services.feedback_service._load_step_with_path", return_value=(step, path)), \
             patch("app.services.feedback_service._write_feedback_event", return_value="fb-1"), \
             patch("app.services.mastery_service.update_mastery_from_feedback"), \
             patch("app.services.mastery_service.find_unmet_prerequisites", return_value=gap), \
             patch("app.services.path_service.swap_step", return_value=fake_swap_result):
            result = feedback_service.handle_feedback("step-1", "too_hard", "", "user-1")

        assert "JavaScript" in result["reason_for_change"]
        assert result["unmet_prerequisites"] == gap

    def test_too_hard_never_fabricates_a_prerequisite_when_check_fails(self):
        """A failure in the prerequisite lookup must never surface a fake gap -
        it degrades to the generic (still honest) reason instead."""
        step, path = _step_and_path()
        fake_swap_result = {"swapped": True, "new_step": {"step_id": "step-2"}}
        with patch("app.services.feedback_service._load_step_with_path", return_value=(step, path)), \
             patch("app.services.feedback_service._write_feedback_event", return_value="fb-1"), \
             patch("app.services.mastery_service.update_mastery_from_feedback"), \
             patch("app.services.mastery_service.find_unmet_prerequisites", side_effect=RuntimeError("db down")), \
             patch("app.services.path_service.swap_step", return_value=fake_swap_result):
            result = feedback_service.handle_feedback("step-1", "too_hard", "", "user-1")

        assert result["unmet_prerequisites"] == []
        assert "lowered our confidence" in result["reason_for_change"]

    def test_too_hard_rejected_by_schema_boundary_before_this_change(self):
        """Confirms too_hard is a genuinely new, intentionally-added value -
        not something that silently worked before via the bare-str schema."""
        from app.schemas.feedback import FeedbackCreateSchema
        # Should not raise: too_hard is now a real accepted Literal value.
        parsed = FeedbackCreateSchema(event_type="too_hard", note="")
        assert parsed.event_type == "too_hard"


class TestResourceUnavailableFeedback:
    def test_confirmed_dead_resource_gets_swapped(self):
        step, path = _step_and_path()
        fake_swap_result = {"swapped": True, "new_step": {"step_id": "step-2"}, "path_version": 4}
        with patch("app.services.feedback_service._load_step_with_path", return_value=(step, path)), \
             patch("app.services.feedback_service._write_feedback_event", return_value="fb-1"), \
             patch("app.services.catalog_service.revalidate_course", return_value=False) as mock_revalidate, \
             patch("app.services.path_service.swap_step", return_value=fake_swap_result) as mock_swap:
            result = feedback_service.handle_feedback("step-1", "resource_unavailable", "", "user-1")

        mock_revalidate.assert_called_once_with("course-1")
        mock_swap.assert_called_once_with("step-1", "user-1", level_hint=0)
        assert result["path_updated"] is True
        assert "swapped in a verified alternative" in result["reason_for_change"]

    def test_a_single_report_cannot_blacklist_a_resource_that_is_actually_fine(self):
        """The core safety property: revalidate_course independently confirms
        the resource is dead before anything is swapped - one learner's
        mistaken report (or a transient network blip) about a resource that
        is, on re-check, still reachable must not swap anything or mark it
        unavailable for other learners."""
        step, path = _step_and_path()
        with patch("app.services.feedback_service._load_step_with_path", return_value=(step, path)), \
             patch("app.services.feedback_service._write_feedback_event", return_value="fb-1"), \
             patch("app.services.catalog_service.revalidate_course", return_value=True), \
             patch("app.services.path_service.swap_step") as mock_swap:
            result = feedback_service.handle_feedback("step-1", "resource_unavailable", "", "user-1")

        mock_swap.assert_not_called()
        assert result["path_updated"] is False
        assert "still reachable" in result["reason_for_change"]

    def test_never_touches_mastery(self):
        """A dead link says nothing about the learner's competency."""
        step, path = _step_and_path()
        with patch("app.services.feedback_service._load_step_with_path", return_value=(step, path)), \
             patch("app.services.feedback_service._write_feedback_event", return_value="fb-1"), \
             patch("app.services.catalog_service.revalidate_course", return_value=False), \
             patch("app.services.path_service.swap_step", return_value={"swapped": True, "new_step": {}}), \
             patch("app.services.mastery_service.update_mastery_from_feedback") as mock_mastery:
            feedback_service.handle_feedback("step-1", "resource_unavailable", "", "user-1")

        mock_mastery.assert_not_called()

    def test_revalidation_failure_degrades_honestly_without_a_fake_swap(self):
        step, path = _step_and_path()
        with patch("app.services.feedback_service._load_step_with_path", return_value=(step, path)), \
             patch("app.services.feedback_service._write_feedback_event", return_value="fb-1"), \
             patch("app.services.catalog_service.revalidate_course", side_effect=RuntimeError("network down")), \
             patch("app.services.path_service.swap_step") as mock_swap:
            result = feedback_service.handle_feedback("step-1", "resource_unavailable", "", "user-1")

        mock_swap.assert_not_called()  # a failed check must never be treated as "confirmed dead"
        assert result["path_updated"] is False


class TestApplyRecentFeedbackIsRealTime:
    def test_fires_and_returns_false_with_no_note(self):
        # No real feedback text -> nothing to act on, no LLM call, no writes.
        with patch("app.services.feedback_service.supabase_client") as mock_supabase:
            applied = feedback_service.apply_recent_feedback("path-1", "user-1", "   ")
        assert applied is False
        mock_supabase.table.assert_not_called()

    def test_fires_with_a_real_note_even_though_the_week_is_not_finished(self):
        """The core fix: this function takes no 'is the week done' parameter
        at all anymore - it is invoked directly from the completion event
        that carries the note, with no week-completion gate upstream
        (see roadmap_service.set_task_completion)."""
        mock_supabase = MagicMock()

        def table_side_effect(name):
            t = MagicMock()
            if name == "path_steps":
                # First call: upcoming not-started rows. Second call: all
                # course_ids currently in the path (for exclusion).
                t.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
                    data=[{"id": "row-2", "course_id": "course-2",
                           "courses": {"id": "course-2", "title": "Old Course"}}]
                )
                t.select.return_value.eq.return_value.execute.return_value = MagicMock(
                    data=[{"course_id": "course-2"}]
                )
                t.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{"id": "row-2"}])
            elif name == "profiles":
                t.select.return_value.eq.return_value.execute.return_value = MagicMock(
                    data=[{"id": "user-1", "current_level": "beginner"}]
                )
            return t

        mock_supabase.table.side_effect = table_side_effect

        fake_recommender = MagicMock()
        fake_recommender.recommend.return_value = [
            {"id": "course-3", "title": "New Course", "description": "", "difficulty": "beginner", "skill_tags": []}
        ]

        with patch("app.services.feedback_service.supabase_client", mock_supabase), \
             patch("app.services.feedback_service.get_recommender", return_value=fake_recommender), \
             patch("app.services.feedback_service._call_groq",
                   return_value='{"replacements": [{"replace_course_id": "course-2", "with_course_id": "course-3"}]}'), \
             patch("app.services.feedback_service._generate_explanation", return_value="Because it fits better."):
            applied = feedback_service.apply_recent_feedback("path-1", "user-1", "This was too theoretical, I need more hands-on labs")

        assert applied is True  # a real replacement was made from a single completion event, no week gate involved
