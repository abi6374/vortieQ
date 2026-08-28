"""Grounded Q&A over the learner's profile + active learning path.

The assistant is deliberately narrow: it only sees the calling user's profile
and one path they own. It cannot fetch other users' data.
"""

import json
from pathlib import Path as _Path

from app.config import supabase_client
from app.llm_client import chat_completion


def _load_prompt(name: str) -> str:
    return (_Path(__file__).parent.parent / "prompts" / name).read_text(encoding="utf-8")


def _fetch_profile(user_id: str) -> dict:
    r = supabase_client.table("profiles").select(
        "goal_text, target_role, current_level, interests, weekly_hours"
    ).eq("id", user_id).execute()
    if not r.data:
        raise ValueError("Profile not found")
    return r.data[0]


def _fetch_path(path_id: str, user_id: str) -> dict:
    """Fetch a path + its steps + course details. Ownership-checked."""
    p = (
        supabase_client.table("learning_paths")
        .select("id, goal_text, status")
        .eq("id", path_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not p.data:
        raise ValueError("Path not found")

    steps = (
        supabase_client.table("path_steps")
        .select(
            "sequence_order, milestone_label, status, explanation, "
            "courses(title, provider, difficulty, duration_hrs, skill_tags)"
        )
        .eq("path_id", path_id)
        .order("sequence_order")
        .execute()
    )
    return {
        "path": p.data[0],
        "steps": [
            {
                "seq": row["sequence_order"],
                "milestone": row.get("milestone_label"),
                "status": row.get("status"),
                "title": (row.get("courses") or {}).get("title"),
                "provider": (row.get("courses") or {}).get("provider"),
                "difficulty": (row.get("courses") or {}).get("difficulty"),
                "duration_hrs": (row.get("courses") or {}).get("duration_hrs"),
                "skill_tags": (row.get("courses") or {}).get("skill_tags") or [],
                "explanation": row.get("explanation"),
            }
            for row in (steps.data or [])
        ],
    }


def ask(question: str, path_id: str, user_id: str) -> str:
    """Answer a learner question grounded on their profile + active path."""
    profile = _fetch_profile(user_id)
    path_ctx = _fetch_path(path_id, user_id)

    context = f"""LEARNER PROFILE:
{json.dumps(profile, indent=2, default=str)}

ACTIVE LEARNING PATH (goal: {path_ctx['path'].get('goal_text', '')}):
{json.dumps(path_ctx['steps'], indent=2, default=str)}
"""

    return chat_completion(
        [
            {"role": "system", "content": _load_prompt("assistant.txt")},
            {"role": "user", "content": f"{context}\n\nLearner question: {question}"},
        ],
        max_tokens=1500,
        temperature=0.3,
    )
