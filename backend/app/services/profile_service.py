import json
from pathlib import Path

from app.config import groq_client, settings, supabase_client

FALLBACK_PROFILE = {
    "target_role": "Software Developer",
    "current_level": "beginner",
    "interests": ["programming", "software development"],
    "weekly_hours": 10,
}


def _load_prompt(name: str) -> str:
    return (Path(__file__).parent.parent / "prompts" / name).read_text(encoding="utf-8")


def _call_groq(messages: list) -> str:
    # NOTE: the gpt-oss models are reasoning models — their chain-of-thought is
    # billed against max_tokens before any answer is emitted. Keep the budget
    # generous and reasoning_effort low, or `content` comes back empty.
    response = groq_client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        max_tokens=1200,
        temperature=0.1,
        reasoning_effort="low",
    )
    return (response.choices[0].message.content or "").strip()


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
