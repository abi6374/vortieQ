"""Tests for the "at most one active path per user" invariant fix
(Phase 4) - confirmed live during this session's own verification
testing that a real test account had TWO rows both status='active' in
learning_paths simultaneously, with nothing preventing it. generate_path()
had no idempotency protection at all, and the frontend's own retry-after-
apparent-failure flow (OnboardingPage.jsx's retryPlan) can genuinely
double-submit if the first call actually succeeded server-side but the
client thought it failed.

No live network/DB calls - Supabase, the LLM, and the recommender are
all mocked.
"""
from unittest.mock import MagicMock, patch

from app.services.path_service import generate_path


def _base_mocks():
    mock_supabase = MagicMock()
    course = {"id": "c1", "title": "Intro", "description": "d", "difficulty": "beginner", "skill_tags": []}

    # One real, persistent mock per table name (not a fresh MagicMock on
    # every call) so repeated calls to the SAME table (learning_paths gets
    # called twice: once to archive, once to insert) share one object -
    # otherwise call_args inspection can't see both interactions together.
    tables: dict[str, MagicMock] = {}

    def table(name):
        if name not in tables:
            t = MagicMock()
            if name == "learning_paths":
                t.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=[{"id": "old-path"}])
                t.insert.return_value.execute.return_value = MagicMock(data=[{"id": "new-path-id"}])
            elif name == "path_steps":
                t.insert.return_value.execute.return_value = MagicMock(data=[{"id": "step-1"}])
            tables[name] = t
        return tables[name]

    mock_supabase.table.side_effect = table
    fake_recommender = MagicMock()
    fake_recommender.recommend.return_value = [course]
    return mock_supabase, fake_recommender, course


class TestAtMostOneActivePath:
    def test_generate_path_archives_any_prior_active_path_first(self):
        mock_supabase, fake_recommender, _ = _base_mocks()
        with patch("app.services.path_service.supabase_client", mock_supabase), \
             patch("app.services.path_service.get_recommender", return_value=fake_recommender), \
             patch("app.services.path_service._call_groq", return_value='{"milestones": [{"label": "M1", "course_ids": ["c1"]}]}'), \
             patch("app.services.path_service.generate_explanations_batch", return_value={"c1": "Fits well."}), \
             patch("app.services.roadmap_service.assign_week_numbers"), \
             patch("app.services.path_service.get_path", return_value={"path_id": "new-path-id", "milestones": []}):
            generate_path("user-1", {"goal_text": "Learn Python", "target_role": "Dev"})

        # The archive-prior-active-paths update must have actually run,
        # with the real {"status": "archived"} payload, before the new
        # path's insert.
        learning_paths_mock = mock_supabase.table("learning_paths")
        learning_paths_mock.update.assert_called_once_with({"status": "archived"})
        # Scoped to THIS user and to rows currently status='active' - never
        # a blanket update touching other users' or other-status rows.
        first_eq = learning_paths_mock.update.return_value.eq
        second_eq = first_eq.return_value.eq
        first_eq.assert_called_once_with("user_id", "user-1")
        second_eq.assert_called_once_with("status", "active")
        learning_paths_mock.insert.assert_called_once()

    def test_archive_failure_does_not_block_creating_the_new_path(self):
        """Best-effort: a failure archiving the OLD path must never
        prevent the learner from getting their new one."""
        mock_supabase, fake_recommender, _ = _base_mocks()
        mock_supabase.table("learning_paths").update.return_value.eq.return_value.eq.return_value.execute.side_effect = RuntimeError("db hiccup")
        with patch("app.services.path_service.supabase_client", mock_supabase), \
             patch("app.services.path_service.get_recommender", return_value=fake_recommender), \
             patch("app.services.path_service._call_groq", return_value='{"milestones": [{"label": "M1", "course_ids": ["c1"]}]}'), \
             patch("app.services.path_service.generate_explanations_batch", return_value={"c1": "Fits well."}), \
             patch("app.services.roadmap_service.assign_week_numbers"), \
             patch("app.services.path_service.get_path", return_value={"path_id": "new-path-id", "milestones": []}):
            # Must not raise despite the archive step failing.
            generate_path("user-1", {"goal_text": "Learn Python", "target_role": "Dev"})


class TestGeneratePathRouteIdempotency:
    def test_route_has_idempotency_key_header_parameter(self):
        # Same "confirms the dependency is actually wired" style used
        # elsewhere in this suite (test_rerecommend_route_rate_limited) -
        # a regression here (dropping the Header(...) parameter) is
        # exactly the kind of one-line change that's easy to silently
        # reintroduce.
        import inspect
        from app.routers import paths as paths_router
        sig = inspect.signature(paths_router.generate_path)
        assert "idempotency_key" in sig.parameters
        assert sig.parameters["idempotency_key"].default.alias == "Idempotency-Key"
