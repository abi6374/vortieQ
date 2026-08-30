"""Tests for account.py's hardened schemas (Phase 4) - previously
update_me/update_settings/log_session all took a bare `dict` via
Body(...); account_service's own EDITABLE_PROFILE/EDITABLE_SETTINGS
whitelists constrained which KEYS could be written, but nothing
constrained what a VALUE could be (length, range, or real enum
membership matching the DB's own CHECK constraints).
"""
import pytest
from pydantic import ValidationError

from app.schemas.account import ProfileUpdateSchema, SettingsUpdateSchema, StudySessionSchema


class TestProfileUpdateSchema:
    def test_valid_partial_update_accepted(self):
        p = ProfileUpdateSchema(full_name="Real Name", weekly_hours=15)
        assert p.full_name == "Real Name"
        assert p.goal_text is None  # untouched field stays None -> excluded on model_dump

    def test_oversized_full_name_rejected(self):
        with pytest.raises(ValidationError):
            ProfileUpdateSchema(full_name="x" * 300)

    def test_goal_text_over_max_length_rejected(self):
        with pytest.raises(ValidationError):
            ProfileUpdateSchema(goal_text="x" * 5000)

    def test_current_level_must_be_a_real_enum_value(self):
        with pytest.raises(ValidationError):
            ProfileUpdateSchema(current_level="expert")  # not one of the real 3-tier values
        assert ProfileUpdateSchema(current_level="intermediate").current_level == "intermediate"

    def test_weekly_hours_out_of_range_rejected(self):
        with pytest.raises(ValidationError):
            ProfileUpdateSchema(weekly_hours=0)
        with pytest.raises(ValidationError):
            ProfileUpdateSchema(weekly_hours=200)  # more hours than exist in a week

    def test_oversized_interests_list_rejected(self):
        with pytest.raises(ValidationError):
            ProfileUpdateSchema(interests=[f"topic{i}" for i in range(50)])

    def test_model_dump_exclude_none_matches_old_partial_update_contract(self):
        p = ProfileUpdateSchema(full_name="Real Name")
        clean = p.model_dump(exclude_none=True)
        assert clean == {"full_name": "Real Name"}


class TestSettingsUpdateSchema:
    def test_difficulty_preference_must_match_the_real_db_check_constraint(self):
        # "easier" | "adaptive" | "harder" - migration 005's actual CHECK
        with pytest.raises(ValidationError):
            SettingsUpdateSchema(difficulty_preference="impossible")
        assert SettingsUpdateSchema(difficulty_preference="adaptive").difficulty_preference == "adaptive"

    def test_preferred_formats_rejects_an_unknown_format(self):
        with pytest.raises(ValidationError):
            SettingsUpdateSchema(preferred_formats=["course", "made_up_format"])

    def test_preferred_formats_accepts_real_values(self):
        s = SettingsUpdateSchema(preferred_formats=["course", "video", "practice_sheet"])
        assert s.preferred_formats == ["course", "video", "practice_sheet"]

    def test_target_date_must_be_a_real_date_not_an_arbitrary_string(self):
        with pytest.raises(ValidationError):
            SettingsUpdateSchema(target_date="not-a-date")
        s = SettingsUpdateSchema(target_date="2026-12-31")
        assert s.target_date.isoformat() == "2026-12-31"

    def test_weekly_hours_out_of_range_rejected(self):
        with pytest.raises(ValidationError):
            SettingsUpdateSchema(weekly_hours=-5)

    def test_timezone_oversized_rejected(self):
        with pytest.raises(ValidationError):
            SettingsUpdateSchema(timezone="x" * 100)

    def test_email_notifications_string_boolean_rejected(self):
        # Pydantic v2's lax bool coercion accepts "true"/"false" strings
        # deliberately (unlike Python's own bool("false") == True bug) -
        # this confirms an ARBITRARY non-boolean-looking string is still
        # rejected outright rather than silently coerced to something.
        with pytest.raises(ValidationError):
            SettingsUpdateSchema(email_notifications="maybe")


class TestStudySessionSchema:
    def test_default_activity_is_manual(self):
        assert StudySessionSchema().activity == "manual"

    def test_unknown_activity_value_rejected(self):
        with pytest.raises(ValidationError):
            StudySessionSchema(activity="arbitrary_activity_name")

    def test_negative_minutes_rejected(self):
        with pytest.raises(ValidationError):
            StudySessionSchema(minutes=-10)

    def test_minutes_over_one_day_rejected(self):
        with pytest.raises(ValidationError):
            StudySessionSchema(minutes=2000)

    def test_oversized_step_id_rejected(self):
        with pytest.raises(ValidationError):
            StudySessionSchema(step_id="x" * 200)
