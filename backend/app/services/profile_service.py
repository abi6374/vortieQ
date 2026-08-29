import json
from pathlib import Path

from app.config import supabase_client
from app.llm_client import chat_completion

# Hard bounds matching what profile_extract.txt itself asks the model for.
# Enforced here too (not just trusted from the prompt) because a jailbroken
# or simply confused model response should never be able to push an
# out-of-range value downstream — path_service/roadmap_service both do
# arithmetic on weekly_hours.
_MIN_WEEKLY_HOURS = 1
_MAX_WEEKLY_HOURS = 168  # a week has 168 hours; anything above is nonsensical
_MAX_INTERESTS = 12
_MAX_FIELD_LEN = 200  # target_role / each interest — reject absurd blobs


class ProfileExtractionError(Exception):
    """Raised when the LLM could not produce a usable profile after retrying.

    Callers MUST surface this as an honest "couldn't understand your goal,
    please rephrase" error — never substitute fabricated data. A previous
    version of this function returned a hardcoded FALLBACK_PROFILE
    ("Software Developer" / beginner / 10h) on total failure, which silently
    presented invented data as if it were a real extraction.
    """


def _load_prompt(name: str) -> str:
    return (Path(__file__).parent.parent / "prompts" / name).read_text(encoding="utf-8")


def _call_groq(messages: list) -> str:
    # Name kept for minimal diff at call sites below; routes through
    # app.llm_client, which picks Groq or Bedrock per settings.LLM_PROVIDER.
    return chat_completion(messages, max_tokens=1200, temperature=0.1)


def _strip_fences(raw: str) -> str:
    """Remove markdown code fences the model sometimes wraps JSON in."""
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


def _parse_and_validate(raw: str) -> dict:
    result = json.loads(_strip_fences(raw))
    assert "target_role" in result

    target_role = result.get("target_role")
    assert isinstance(target_role, str) and 0 < len(target_role) <= _MAX_FIELD_LEN

    assert result.get("current_level") in ["beginner", "intermediate", "advanced"]

    interests = result.get("interests")
    assert isinstance(interests, list) and 0 < len(interests) <= _MAX_INTERESTS
    assert all(isinstance(i, str) and 0 < len(i) <= _MAX_FIELD_LEN for i in interests)

    weekly_hours = result.get("weekly_hours")
    # bool is a subclass of int in Python — isinstance(True, int) is True —
    # so a bare `isinstance(x, int)` check would silently accept JSON
    # true/false as a valid hour count. Excluded explicitly.
    assert isinstance(weekly_hours, int) and not isinstance(weekly_hours, bool)
    assert _MIN_WEEKLY_HOURS <= weekly_hours <= _MAX_WEEKLY_HOURS

    return result


def extract_profile(goal_text: str) -> dict:
    """Extract a structured profile from free-text goal via Groq LLM.

    Raises ProfileExtractionError if the model cannot produce a valid,
    in-bounds profile after one retry — callers must show the user an honest
    error, never fall back to invented data (see ProfileExtractionError).
    """
    # Learner text is wrapped in the same delimiter the system prompt
    # references and told to treat it as data, not instructions — a defense
    # against the learner's own free-text goal (or resume context folded in
    # by the caller) trying to override the extraction instructions. Not a
    # bulletproof guarantee against a determined jailbreak, but a real,
    # standard mitigation layered on top of the schema/range validation
    # above, which is what actually bounds the damage regardless.
    wrapped = f"<<<LEARNER_TEXT>>>\n{goal_text}\n<<<END_LEARNER_TEXT>>>"
    messages = [
        {"role": "system", "content": _load_prompt("profile_extract.txt")},
        {"role": "user", "content": wrapped},
    ]

    raw = _call_groq(messages)
    try:
        return _parse_and_validate(raw)
    except (json.JSONDecodeError, AssertionError, KeyError):
        # Retry once, explicitly reminding the model to return raw JSON.
        messages.append({"role": "assistant", "content": raw})
        messages.append({
            "role": "user",
            "content": "Return ONLY raw JSON. No markdown, no explanation, no code fences.",
        })
        try:
            return _parse_and_validate(_call_groq(messages))
        except Exception as e:
            raise ProfileExtractionError(
                "Could not extract a valid profile from that text after two attempts."
            ) from e


def upsert_profile(user_id: str, data: dict) -> dict:
    """Upsert a profile row in Supabase. Returns the saved row dict.

    Real bug this fixes: this function is called both by the full
    goal-extraction flow (routers/profile.py, which always has all of
    goal_text/target_role/current_level/interests/weekly_hours) AND by the
    GitHub-sync flow (routers/github.py's ingest_github_profile, which ONLY
    ever supplies topic_ratings/detected_years_experience). The payload used
    to unconditionally include goal_text/target_role/current_level/
    interests/weekly_hours with hardcoded fallbacks ("", "", "beginner", [],
    10) whenever a caller didn't supply them — and since Supabase's upsert
    SETs every column present in the submitted JSON, every GitHub sync
    silently overwrote an existing learner's real goal/role/level/interests/
    hours back to blank defaults, whether that sync happened from the
    roadmap popup, the Account page, or onboarding's own GitHub step.
    Only build keys the caller actually supplied — a true partial update,
    the same pattern already used below for topic_ratings/
    detected_years_experience. All these columns are nullable with the
    database's own sane defaults (see the profiles table schema), so a
    genuinely new profile from a GitHub-only call correctly gets goal_text
    etc. left NULL (honestly "not set yet") rather than fabricated empty
    strings — never fabricate values that weren't actually provided.
    """
    payload = {"id": user_id}
    for key in ("goal_text", "target_role", "current_level", "interests", "weekly_hours",
                "topic_ratings", "detected_years_experience"):
        if key in data:
            payload[key] = data[key]

    result = supabase_client.table("profiles").upsert(payload).execute()
    return result.data[0] if result.data else payload


# ---------------------------------------------------------------- topic ratings
# 4-tier resume/assessment scale -> 3-tier recommender scale.
_LEVEL_TO_RECOMMENDER = {
    "basic": "beginner",
    "intermediate": "intermediate",
    "advanced": "advanced",
    "expert": "advanced",
}

# When choosing an overall current_level from a bag of per-topic levels we take
# the median-ish highest reliable level: at least 2 topics rated at that level.
_LEVEL_ORDER = ["beginner", "intermediate", "advanced"]


def merge_topic_ratings(profile: dict, topic_ratings: list[dict]) -> dict:
    """Fold per-topic self-ratings back into a profile dict before upsert.

    - Adds each topic name to `interests` (lowercased, deduped).
    - Recomputes `current_level` as the highest level supported by >=2 topics
      (falls back to the LLM's extracted level if we don't have that many).
    - Stashes the full ratings under `topic_ratings` for downstream use.
    """
    if not topic_ratings:
        return profile

    interests = [i.lower() for i in profile.get("interests") or []]
    for rating in topic_ratings:
        name = (rating.get("name") or "").strip().lower()
        if name and name not in interests:
            interests.append(name)

    # Overall level: highest level that at least two topics claim.
    per_level_counts = {"beginner": 0, "intermediate": 0, "advanced": 0}
    for rating in topic_ratings:
        rec_level = _LEVEL_TO_RECOMMENDER.get((rating.get("level") or "").lower())
        if rec_level:
            per_level_counts[rec_level] += 1

    chosen = profile.get("current_level", "beginner")
    for lvl in reversed(_LEVEL_ORDER):
        if per_level_counts[lvl] >= 2:
            chosen = lvl
            break

    profile["interests"] = interests
    profile["current_level"] = chosen
    profile["topic_ratings"] = topic_ratings
    return profile
