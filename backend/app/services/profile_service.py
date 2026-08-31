import json
import re
from pathlib import Path

from app.config import supabase_client
from app.llm_client import chat_completion

# Hard bounds matching what profile_extract.txt itself asks the model for.
_MIN_WEEKLY_HOURS = 1
_MAX_WEEKLY_HOURS = 168  # a week has 168 hours; anything above is nonsensical
_MAX_INTERESTS = 12
_MAX_FIELD_LEN = 200  # target_role / each interest


class ProfileExtractionError(Exception):
    """Raised when the LLM could not produce a usable profile after retrying."""


def _load_prompt(name: str) -> str:
    return (Path(__file__).parent.parent / "prompts" / name).read_text(encoding="utf-8")


def _call_groq(messages: list) -> str:
    return chat_completion(messages, max_tokens=1200, temperature=0.1)


def _strip_fences(raw: str) -> str:
    """Remove markdown code fences the model sometimes wraps JSON in."""
    if not raw:
        return ""
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return text.strip()


def extract_target_weeks(goal_text: str | None, profile: dict | None = None) -> int | None:
    """Extract requested timeline in weeks from free-text goal or profile (e.g. '13 weeks' -> 13)."""
    text = (goal_text or "") + " " + str((profile or {}).get("goal_text") or "")
    m_weeks = re.search(r"\b(\d{1,2})[\s\-]*(?:weeks?|wks?)\b", text, re.IGNORECASE)
    if m_weeks:
        w = int(m_weeks.group(1))
        if 1 <= w <= 52:
            return w
    m_months = re.search(r"\b(\d{1,2})[\s\-]*(?:months?|mos?)\b", text, re.IGNORECASE)
    if m_months:
        mo = int(m_months.group(1))
        if 1 <= mo <= 12:
            return int(round(mo * 4.33))
    return None


def _parse_and_validate(raw: str, goal_text: str = "") -> dict:
    result = json.loads(_strip_fences(raw))
    assert "target_role" in result

    target_role = result.get("target_role")
    assert isinstance(target_role, str) and 0 < len(target_role) <= _MAX_FIELD_LEN

    assert result.get("current_level") in ["beginner", "intermediate", "advanced"]

    interests = result.get("interests")
    assert isinstance(interests, list) and 0 < len(interests) <= _MAX_INTERESTS
    assert all(isinstance(i, str) and 0 < len(i) <= _MAX_FIELD_LEN for i in interests)

    weekly_hours = result.get("weekly_hours")
    assert isinstance(weekly_hours, int) and not isinstance(weekly_hours, bool)
    assert _MIN_WEEKLY_HOURS <= weekly_hours <= _MAX_WEEKLY_HOURS

    # If target_weeks is extracted or detected from goal_text
    tw = result.get("target_weeks")
    if not isinstance(tw, int) or isinstance(tw, bool) or tw < 1 or tw > 52:
        tw = extract_target_weeks(goal_text)
    result["target_weeks"] = tw

    return result


def build_fallback_profile(goal_text: str, target_role: str | None = None) -> dict:
    """Construct a clean, valid structured profile directly from user inputs
    when LLM profile extraction encounters a transient network or formatting issue.
    """
    role = (target_role or "").strip() or "Software Engineer"
    hours_match = re.search(r"(\d+)\s*(?:hours?|hrs?)\s*(?:per\s*week|/week|weekly)?", goal_text or "", re.IGNORECASE)
    hours = int(hours_match.group(1)) if hours_match else 10
    hours = max(_MIN_WEEKLY_HOURS, min(_MAX_WEEKLY_HOURS, hours))
    target_weeks = extract_target_weeks(goal_text)

    return {
        "target_role": role[:_MAX_FIELD_LEN],
        "current_level": "intermediate",
        "interests": [role[:_MAX_FIELD_LEN]],
        "weekly_hours": hours,
        "target_weeks": target_weeks,
    }


def extract_profile(goal_text: str) -> dict:
    """Extract a structured profile from free-text goal via LLM with fallback protection."""
    wrapped = f"<<<LEARNER_TEXT>>>\n{goal_text}\n<<<END_LEARNER_TEXT>>>"
    messages = [
        {"role": "system", "content": _load_prompt("profile_extract.txt")},
        {"role": "user", "content": wrapped},
    ]

    raw = _call_groq(messages)
    try:
        return _parse_and_validate(raw, goal_text)
    except (json.JSONDecodeError, AssertionError, KeyError, TypeError, ValueError):
        # Retry once, explicitly reminding the model to return raw JSON
        messages.append({"role": "assistant", "content": raw})
        messages.append({
            "role": "user",
            "content": "Return ONLY raw JSON with keys target_role, current_level, interests, weekly_hours, target_weeks. No markdown, no code fences.",
        })
        try:
            return _parse_and_validate(_call_groq(messages), goal_text)
        except Exception:
            return build_fallback_profile(goal_text)


def upsert_profile(user_id: str, data: dict) -> dict:
    """Upsert a profile row in Supabase. Returns the saved row dict."""
    payload = {"id": user_id}
    for key in ("goal_text", "target_role", "current_level", "interests", "weekly_hours",
                "topic_ratings", "detected_years_experience",
                "github_username", "github_repos_summary"):
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
    """Fold per-topic self-ratings back into a profile dict before upsert."""
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
        lvl_str = str(rating.get("level") or rating.get("suggested_level") or "").lower().strip()
        rec_level = _LEVEL_TO_RECOMMENDER.get(lvl_str)
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
