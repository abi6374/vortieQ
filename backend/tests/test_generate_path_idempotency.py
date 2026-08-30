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

    tables: dict[str, MagicMock] = {}

    def table(name):
        if name not in tables:
            t = MagicMock()
            if name == "path_steps":
                t.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
                    data=[{"id": "step-1", "sequence_order": 1}]
                )
            tables[name] = t
        return tables[name]

    mock_supabase.table.side_effect = table
    # create_learning_path_with_steps RETURNS UUID - a scalar, so .data is
    # the raw string itself (verified against the real deployed function,
    # not assumed - see the database-reliability audit report).
    mock_supabase.rpc.return_value.execute.return_value = MagicMock(data="new-path-id")
    fake_recommender = MagicMock()
    fake_recommender.recommend.return_value = [course]
    return mock_supabase, fake_recommender, course


class TestAtMostOneActivePath:
    """Database-reliability audit: the archive-prior-active-path step and
    the path+steps creation are no longer separate, sequential Python-
    visible calls - they happen together inside the create_learning_path_
    with_steps RPC (migration 017), so a crash between them (the original
    confirmed bug: two real rows both status='active' for one user) is now
    impossible - either the whole atomic operation commits or none of it
    does. That invariant is verified directly against the real deployed
    function in the database-reliability audit report; these unit tests
    verify generate_path() calls the RPC with the right arguments and no
    longer performs the old, separate, racy table calls."""

    def test_generate_path_calls_the_atomic_rpc_with_every_step(self):
        mock_supabase, fake_recommender, _ = _base_mocks()
        with patch("app.services.path_service.supabase_client", mock_supabase), \
             patch("app.services.path_service.get_recommender", return_value=fake_recommender), \
             patch("app.services.path_service._call_groq", return_value='{"milestones": [{"label": "M1", "course_ids": ["c1"]}]}'), \
             patch("app.services.path_service.generate_explanations_batch", return_value={"c1": "Fits well."}), \
             patch("app.services.roadmap_service.assign_week_numbers"), \
             patch("app.services.path_service.get_path", return_value={"path_id": "new-path-id", "milestones": []}):
            generate_path("user-1", {"goal_text": "Learn Python", "target_role": "Dev"})

        rpc_name, rpc_params = mock_supabase.rpc.call_args[0]
        assert rpc_name == "create_learning_path_with_steps"
        assert rpc_params["p_user_id"] == "user-1"
        assert rpc_params["p_goal_text"] == "Learn Python"
        assert rpc_params["p_steps"] == [{"course_id": "c1", "milestone_label": "M1", "explanation": "Fits well."}]

        # The old racy sequence (separate archive UPDATE + separate INSERT
        # on learning_paths from Python) must be gone - both now happen
        # inside the RPC, not as directly observable table calls.
        assert "learning_paths" not in {c.args[0] for c in mock_supabase.table.call_args_list if c.args}

    def test_atomic_rpc_failure_propagates_instead_of_silently_degrading(self):
        """Deliberate behavior change from the old best-effort archive: since
        archiving the prior path and creating the new one are now ONE
        atomic transaction, a failure anywhere inside it must raise rather
        than risk either violating the at-most-one-active-path invariant or
        leaving inconsistent state - see the database-reliability audit
        report for why silently swallowing this would be worse."""
        mock_supabase, fake_recommender, _ = _base_mocks()
        mock_supabase.rpc.return_value.execute.side_effect = RuntimeError("db hiccup")
        with patch("app.services.path_service.supabase_client", mock_supabase), \
             patch("app.services.path_service.get_recommender", return_value=fake_recommender), \
             patch("app.services.path_service._call_groq", return_value='{"milestones": [{"label": "M1", "course_ids": ["c1"]}]}'), \
             patch("app.services.path_service.generate_explanations_batch", return_value={"c1": "Fits well."}):
            try:
                generate_path("user-1", {"goal_text": "Learn Python", "target_role": "Dev"})
                assert False, "expected the RPC failure to propagate"
            except RuntimeError:
                pass


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
