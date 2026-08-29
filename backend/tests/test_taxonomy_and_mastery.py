"""Tests for the canonical skills taxonomy and per-skill mastery model
(migrations 006/010) - the real replacement for "one global current_level"
and the fix for "confidence/mastery stored but never ranked".

No live network calls; Supabase is mocked throughout.
"""
from unittest.mock import MagicMock, patch

import pytest

from app.services import mastery_service, taxonomy_service


# ── taxonomy_service ─────────────────────────────────────────────────────────
class TestTaxonomyResolution:
    def test_normalize_collapses_whitespace_and_case(self):
        assert taxonomy_service.normalize("  JavaScript   Framework ") == "javascript framework"

    def test_resolve_skill_uses_alias_cache(self):
        taxonomy_service.invalidate_cache()
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.execute.return_value = MagicMock(
            data=[{"alias": "js", "skill_id": "skill-js-id"}, {"alias": "python", "skill_id": "skill-py-id"}]
        )
        with patch("app.services.taxonomy_service.supabase_client", mock_supabase):
            assert taxonomy_service.resolve_skill("JS") == "skill-js-id"
            assert taxonomy_service.resolve_skill("  Python ") == "skill-py-id"
            assert taxonomy_service.resolve_skill("definitely-not-a-real-skill") is None
        taxonomy_service.invalidate_cache()

    def test_resolve_skill_empty_input_never_crashes(self):
        taxonomy_service.invalidate_cache()
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.execute.return_value = MagicMock(data=[])
        with patch("app.services.taxonomy_service.supabase_client", mock_supabase):
            assert taxonomy_service.resolve_skill("") is None
            assert taxonomy_service.resolve_skill(None) is None
        taxonomy_service.invalidate_cache()

    def test_resolve_or_create_skill_grows_taxonomy_for_a_real_new_skill(self):
        taxonomy_service.invalidate_cache()
        mock_supabase = MagicMock()
        # No alias match, no existing skill by canonical_name -> real insert.
        mock_supabase.table.return_value.select.return_value.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "new-skill-id"}]
        )
        with patch("app.services.taxonomy_service.supabase_client", mock_supabase):
            skill_id = taxonomy_service.resolve_or_create_skill("Zig Programming")
        assert skill_id == "new-skill-id"
        taxonomy_service.invalidate_cache()


# ── mastery_service ──────────────────────────────────────────────────────────
class TestMasteryCombination:
    def test_combine_with_no_existing_estimate_uses_new_observation_directly(self):
        mastery, confidence = mastery_service._combine(None, 0.8, 0.6)
        assert mastery == 0.8
        assert confidence == 0.6

    def test_combine_weights_toward_more_confident_observation(self):
        existing = {"mastery_probability": 0.2, "confidence": 0.9}
        # A single low-confidence new observation should barely move a
        # well-established high-confidence estimate.
        mastery, confidence = mastery_service._combine(existing, 0.9, 0.1)
        assert mastery < 0.35  # stays close to the existing 0.2, not jumping to 0.9
        assert confidence > 0.9  # more evidence -> confidence still goes up

    def test_combine_never_exceeds_bounds(self):
        existing = {"mastery_probability": 0.95, "confidence": 0.95}
        mastery, confidence = mastery_service._combine(existing, 1.0, 1.0)
        assert 0.0 <= mastery <= 1.0
        assert 0.0 <= confidence <= 1.0


class TestMasteryUpdates:
    def _mock_supabase_for_upsert(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_table.upsert.return_value.execute.return_value = MagicMock(data=[{"id": "row-1"}])
        return mock_supabase, mock_table

    def test_update_mastery_from_resume_uses_real_evidence_only(self):
        mock_supabase, mock_table = self._mock_supabase_for_upsert()
        with patch("app.services.mastery_service.supabase_client", mock_supabase), \
             patch("app.services.taxonomy_service.resolve_or_create_skill", return_value="skill-python-id"):
            updated = mastery_service.update_mastery_from_resume(
                "user-1",
                [{"name": "Python", "suggested_level": "advanced", "confidence_pct": 90, "evidence": "3 real projects"}],
            )
        assert updated == 1
        upsert_payload = mock_table.upsert.call_args[0][0]
        assert upsert_payload["mastery_probability"] == 0.8  # advanced -> 0.8
        assert upsert_payload["confidence"] == 0.9  # 90% confidence_pct -> 0.9
        assert upsert_payload["evidence_source"] == "resume"

    def test_update_mastery_skips_unrecognized_level_never_guesses(self):
        mock_supabase, mock_table = self._mock_supabase_for_upsert()
        with patch("app.services.mastery_service.supabase_client", mock_supabase), \
             patch("app.services.taxonomy_service.resolve_or_create_skill", return_value="skill-x"):
            updated = mastery_service.update_mastery_from_resume(
                "user-1", [{"name": "Something", "suggested_level": "super-duper-expert"}]
            )
        assert updated == 0
        mock_table.upsert.assert_not_called()

    def test_update_mastery_from_feedback_only_moves_on_too_easy(self):
        mock_supabase, mock_table = self._mock_supabase_for_upsert()
        with patch("app.services.mastery_service.supabase_client", mock_supabase), \
             patch("app.services.taxonomy_service.resolve_or_create_skill", return_value="skill-x"):
            updated_not_interested = mastery_service.update_mastery_from_feedback(
                "user-1", ["python"], "not_interested"
            )
            updated_too_easy = mastery_service.update_mastery_from_feedback(
                "user-1", ["python"], "too_easy"
            )
        assert updated_not_interested == 0
        assert updated_too_easy == 1

    def test_update_mastery_from_completion_never_lowers_existing_higher_estimate(self):
        mock_supabase = MagicMock()
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        # Learner already has 0.8 mastery in this skill (from resume evidence).
        mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"mastery_probability": 0.8}]
        )
        with patch("app.services.mastery_service.supabase_client", mock_supabase), \
             patch("app.services.taxonomy_service.resolve_or_create_skill", return_value="skill-x"):
            updated = mastery_service.update_mastery_from_completion("user-1", ["python"])
        assert updated == 0  # already above the completion floor - no downgrade attempted
        mock_table.upsert.assert_not_called()

    def test_get_mastery_map_returns_empty_not_fabricated_for_new_learner(self):
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        with patch("app.services.mastery_service.supabase_client", mock_supabase):
            assert mastery_service.get_mastery_map("brand-new-user") == {}
