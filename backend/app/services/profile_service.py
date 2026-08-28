import json
from pathlib import Path

from app.config import supabase_client
from app.llm_client import chat_completion

FALLBACK_PROFILE = {
    "target_role": "Software Developer",
    "current_level": "beginner",
    "interests": ["programming", "software development"],
    "weekly_hours": 10,
}


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
    assert result.get("current_level") in ["beginner", "intermediate", "advanced"]
    assert isinstance(result.get("interests"), list)
    assert isinstance(result.get("weekly_hours"), int)
    return result


def extract_profile(goal_text: str) -> dict:
    """Extract a structured profile from free-text goal via Groq LLM."""
    messages = [
        {"role": "system", "content": _load_prompt("profile_extract.txt")},
        {"role": "user", "content": goal_text},
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
        except Exception:
            return dict(FALLBACK_PROFILE)


def upsert_profile(user_id: str, data: dict) -> dict:
    """Upsert a profile row in Supabase. Returns the saved row dict."""
    payload = {
        "id": user_id,
        "goal_text": data.get("goal_text", ""),
        "target_role": data.get("target_role", ""),
        "current_level": data.get("current_level", "beginner"),
        "interests": data.get("interests", []),
        "weekly_hours": data.get("weekly_hours", 10),
    }
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
