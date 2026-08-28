"""
AI Coach — practice questions and project suggestions, grounded in the
real learner (profile, completed courses, skill tags), generated on demand.

Deliberately stateless server-side for this first version: questions/ideas
are generated fresh each call and graded client-side (the response already
carries the correct answer), not persisted to a history table. That keeps
this shippable without a new Supabase migration; a "past attempts" history
is a natural follow-up once that's wanted.
"""

import json
from pathlib import Path as _Path

from app.config import supabase_client
from app.llm_client import chat_completion

MAX_QUESTIONS = 10


def _load_prompt(name: str) -> str:
    return (_Path(__file__).parent.parent / "prompts" / name).read_text(encoding="utf-8")


def _strip_fences(raw: str) -> str:
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


def _call_groq(messages: list, max_tokens: int = 3000) -> str:
    # Name kept for minimal diff at call sites below; routes through
    # app.llm_client, which picks Groq or Bedrock per settings.LLM_PROVIDER.
    return chat_completion(messages, max_tokens=max_tokens, temperature=0.3)


def _fetch_profile(user_id: str) -> dict:
    r = (
        supabase_client.table("profiles")
        .select("goal_text, target_role, current_level, interests, weekly_hours, completed_courses, topic_ratings, detected_years_experience")
        .eq("id", user_id).execute()
    )
    return r.data[0] if r.data else {}


def _fetch_skill_progress(user_id: str) -> tuple[list[str], list[str]]:
    """Real (completed_skills, in_progress_skills) from the learner's active path."""
    paths = (
        supabase_client.table("learning_paths")
        .select("id").eq("user_id", user_id).eq("status", "active")
        .order("generated_at", desc=True).limit(1).execute()
    )
    if not paths.data:
        return [], []
    path_id = paths.data[0]["id"]
    steps = (
        supabase_client.table("path_steps")
        .select("status, courses(skill_tags)")
        .eq("path_id", path_id).execute()
    )
    completed, in_progress = set(), set()
    for s in steps.data or []:
        tags = (s.get("courses") or {}).get("skill_tags") or []
        target = completed if s.get("status") == "completed" else in_progress
        target.update(tags)
    return sorted(completed), sorted(in_progress - completed)


def generate_practice(user_id: str, topic: str, count: int = 5) -> list[dict]:
    """Real, level-appropriate MCQ practice questions for `topic`.
    Raises ValueError on bad input, RuntimeError if Groq/parsing fails."""
    topic = (topic or "").strip()
    if not topic:
        raise ValueError("A topic is required")
    count = max(1, min(MAX_QUESTIONS, int(count or 5)))

    profile = _fetch_profile(user_id)
    user_msg = f"""LEARNER PROFILE:
{json.dumps(profile, indent=2, default=str)}

TOPIC TO PRACTICE: {topic}
NUMBER OF QUESTIONS: {count}

Generate the practice questions JSON now."""

    messages = [
        {"role": "system", "content": _load_prompt("coach_practice.txt")},
        {"role": "user", "content": user_msg},
    ]
    raw = _call_groq(messages)
    try:
        questions = json.loads(_strip_fences(raw))["questions"]
    except Exception:
        messages.append({"role": "assistant", "content": raw})
        messages.append({"role": "user", "content": "Return ONLY the JSON object. No markdown fences."})
        try:
            questions = json.loads(_strip_fences(_call_groq(messages)))["questions"]
        except Exception as e:
            raise RuntimeError("Could not generate practice questions right now. Please try again.") from e

    # Validate shape defensively - never hand the frontend a malformed question.
    clean = []
    for q in questions:
        opts = q.get("options")
        idx = q.get("correct_index")
        if (
            isinstance(q.get("question"), str) and q["question"].strip()
            and isinstance(opts, list) and len(opts) == 4
            and isinstance(idx, int) and 0 <= idx < 4
        ):
            clean.append({
                "question": q["question"].strip(),
                "options": [str(o) for o in opts],
                "correct_index": idx,
                "explanation": (q.get("explanation") or "").strip(),
            })
    if not clean:
        raise RuntimeError("Could not generate valid practice questions right now. Please try again.")
    return clean


def generate_project_idea(user_id: str) -> dict:
    """A real project suggestion using skills the learner has, calibrated by their confidence score and GitHub portfolio depth."""
    profile = _fetch_profile(user_id)
    completed_skills, in_progress_skills = _fetch_skill_progress(user_id)

    # If no path steps are completed yet, use their assessed topic_ratings from GitHub/resume
    if not completed_skills and not in_progress_skills:
        ratings = profile.get("topic_ratings") or []
        if ratings:
            completed_skills = [r["name"] for r in ratings if r.get("suggested_level") in ("intermediate", "advanced", "expert")]
            in_progress_skills = [r["name"] for r in ratings if r.get("suggested_level") == "basic"]

    if not completed_skills and not in_progress_skills:
        raise ValueError("Complete a few roadmap steps or calibrate your skills first so there's something real to build a project around.")

    user_msg = f"""LEARNER PROFILE:
target_role: {profile.get('target_role', '')}
current_level: {profile.get('current_level', '')}
topic_ratings: {json.dumps(profile.get('topic_ratings', []), default=str)}

REAL COMPLETED SKILLS: {json.dumps(completed_skills)}
REAL IN-PROGRESS SKILLS: {json.dumps(in_progress_skills)}

Note: If the learner has high confidence or advanced proficiency in ML/Python, do NOT suggest basic toy tutorials (e.g. Iris, Titanic). Suggest an advanced, production-grade or specialized capstone.

Suggest one project now."""

    messages = [
        {"role": "system", "content": _load_prompt("coach_project.txt")},
        {"role": "user", "content": user_msg},
    ]
    raw = _call_groq(messages, max_tokens=800)
    try:
        idea = json.loads(_strip_fences(raw))
    except Exception:
        messages.append({"role": "assistant", "content": raw})
        messages.append({"role": "user", "content": "Return ONLY the JSON object. No markdown fences."})
        try:
            idea = json.loads(_strip_fences(_call_groq(messages, max_tokens=800)))
        except Exception as e:
            raise RuntimeError("Could not generate a project idea right now. Please try again.") from e

    if not isinstance(idea.get("title"), str) or not idea["title"].strip():
        raise RuntimeError("Could not generate a valid project idea right now. Please try again.")

    return {
        "title": idea["title"].strip(),
        "description": (idea.get("description") or "").strip(),
        "skills_used": [str(s) for s in (idea.get("skills_used") or [])],
        "difficulty": idea.get("difficulty") or profile.get("current_level") or "beginner",
        "estimated_hours": int(idea.get("estimated_hours") or 8),
    }
