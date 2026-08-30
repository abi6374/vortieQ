"""Tests for interview.py's hardened schemas (Phase 4) - previously
current_question/questions/answers were bare `dict`/`list[dict]` with no
shape validation, and topic/transcript/tts-text had no length limits
despite each feeding a real Bedrock or Polly (per-character-billed) call.
"""
import pytest
from pydantic import ValidationError

from app.routers.interview import (
    FinalizeSessionRequest, InterviewQuestion, StartSessionRequest,
    SubmitAnswerRequest, TTSRequest,
)


def _question(**overrides):
    base = {"id": "q1", "question": "Explain REST vs GraphQL."}
    base.update(overrides)
    return base


class TestLengthAndRangeLimits:
    def test_topic_over_max_length_rejected(self):
        with pytest.raises(ValidationError):
            StartSessionRequest(topic="x" * 300)

    def test_question_count_out_of_range_rejected(self):
        with pytest.raises(ValidationError):
            StartSessionRequest(question_count=0)
        with pytest.raises(ValidationError):
            StartSessionRequest(question_count=999)

    def test_tts_text_over_max_length_rejected(self):
        with pytest.raises(ValidationError):
            TTSRequest(text="x" * 5000)

    def test_tts_empty_text_rejected(self):
        with pytest.raises(ValidationError):
            TTSRequest(text="")

    def test_transcript_over_max_length_rejected(self):
        with pytest.raises(ValidationError):
            SubmitAnswerRequest(
                session_id="s1", question_number=1, total_questions=5,
                current_question=_question(), transcript="x" * 10_000,
            )

    def test_oversized_questions_list_rejected(self):
        """Real cost-abuse gap this closes: previously questions/answers
        were unbounded lists that flowed straight into an LLM prompt -
        a learner (or a compromised client) could submit an enormous list
        to inflate token cost per finalize() call."""
        with pytest.raises(ValidationError):
            FinalizeSessionRequest(
                session_id="s1",
                questions=[_question(id=f"q{i}") for i in range(50)],
                answers=[],
            )


class TestStructuredQuestionShape:
    def test_valid_question_accepted(self):
        q = InterviewQuestion(**_question())
        assert q.id == "q1"

    def test_missing_required_field_rejected(self):
        with pytest.raises(ValidationError):
            InterviewQuestion(question="Only a question, no id")

    def test_current_question_as_a_bare_string_rejected(self):
        """Previously current_question: dict accepted ANY shape - a
        string, a list, an arbitrarily nested object - with no structural
        guarantee at all before it reached interview_service and an LLM
        prompt."""
        with pytest.raises(ValidationError):
            SubmitAnswerRequest(
                session_id="s1", question_number=1, total_questions=5,
                current_question="not a real question object", transcript="A real answer here.",
            )

    def test_key_criteria_oversized_list_rejected(self):
        with pytest.raises(ValidationError):
            InterviewQuestion(**_question(key_criteria=[f"point {i}" for i in range(50)]))


class TestStringBooleanRejection:
    """"false"/"true" as JSON strings must never be silently coerced to a
    real boolean or accepted where an int/str is actually expected -
    duration_sec is the one int-typed field here a string-boolean-style
    payload could target."""

    def test_duration_sec_as_a_string_is_rejected_not_coerced(self):
        with pytest.raises(ValidationError):
            SubmitAnswerRequest(
                session_id="s1", question_number=1, total_questions=5,
                current_question=_question(), transcript="A real answer.",
                duration_sec="false",
            )
