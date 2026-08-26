import json
from pathlib import Path

from app.config import groq_client, settings, supabase_client
from app.ml.registry import get_recommender


def _load_prompt(name: str) -> str:
    return (Path(__file__).parent.parent / "prompts" / name).read_text(encoding="utf-8")


def _call_groq(messages: list, max_tokens: int = 6000) -> str:
    # NOTE: the gpt-oss models are reasoning models — their chain-of-thought is
    # billed against max_tokens before any answer is emitted. Keep the budget
    # generous and reasoning_effort low, or `content` comes back empty.
    response = groq_client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.2,
        reasoning_effort="low",
    )
    return (response.choices[0].message.content or "").strip()


def _strip_fences(raw: str) -> str:
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


def generate_explanation(profile: dict, course: dict) -> str:
    """Two-sentence explanation of why this course fits this learner."""
    user_msg = (
        f"Learner goal: {profile.get('goal_text', '')}. "
        f"Target role: {profile.get('target_role', '')}. "
        f"Level: {profile.get('current_level', '')}. "
        f"Course: {course.get('title', '')} — {course.get('description', '')}"
    )
    return _call_groq(
        [
            {"role": "system", "content": _load_prompt("explain.txt")},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=1200,
    )


def generate_path(user_id: str, profile: dict) -> dict:
    """Recommend courses, sequence them into milestones, persist, and return the path."""
    courses = get_recommender().recommend(profile)
    if not courses:
        raise ValueError("No courses returned from recommender")

    candidates_for_llm = [
        {
            "id": c["id"],
            "title": c["title"],
            "description": c["description"],
            "difficulty": c["difficulty"],
            "skill_tags": c.get("skill_tags", []),
            "duration_hrs": c.get("duration_hrs", 10),
        }
        for c in courses
    ]

    user_msg = f"""LEARNER PROFILE:
{json.dumps(profile, indent=2, default=str)}

CANDIDATE COURSES (use ONLY these course IDs):
{json.dumps(candidates_for_llm, indent=2)}

Generate the learning path JSON now."""

    messages = [
        {"role": "system", "content": _load_prompt("path_generate.txt")},
        {"role": "user", "content": user_msg},
    ]

    raw = _call_groq(messages)
    try:
        milestones = json.loads(_strip_fences(raw))["milestones"]
    except Exception:
        messages.append({"role": "assistant", "content": raw})
        messages.append({
            "role": "user",
            "content": "Return ONLY the JSON object. No markdown fences.",
        })
        milestones = json.loads(_strip_fences(_call_groq(messages)))["milestones"]

    path_result = supabase_client.table("learning_paths").insert({
        "user_id": user_id,
        "goal_text": profile.get("goal_text", ""),
        "status": "active",
    }).execute()
    path_id = path_result.data[0]["id"]

    course_lookup = {c["id"]: c for c in courses}

    response_milestones = []
    sequence_order = 0

    for m_idx, milestone in enumerate(milestones):
        steps = []
        for course_id in milestone.get("course_ids", []):
            course = course_lookup.get(course_id)
            if not course:
                # LLM hallucinated an id that wasn't in the candidate list — skip it.
                continue
            sequence_order += 1
            explanation = generate_explanation(profile, course)

            step_result = supabase_client.table("path_steps").insert({
                "path_id": path_id,
                "course_id": course_id,
                "sequence_order": sequence_order,
                "milestone_label": milestone["label"],
                "status": "not_started",
                "explanation": explanation,
            }).execute()
            step_id = step_result.data[0]["id"] if step_result.data else ""

            steps.append({
                "step_id": step_id,
                "course_id": course_id,
                "title": course.get("title", ""),
                "provider": course.get("provider", ""),
                "duration_hrs": course.get("duration_hrs", 0),
                "difficulty": course.get("difficulty", ""),
                "skill_tags": course.get("skill_tags", []),
                "resource_url": course.get("resource_url", ""),
                "explanation": explanation,
                "status": "not_started",
            })

        response_milestones.append({
            "label": milestone["label"],
            "sequence_order": m_idx + 1,
            "estimated_weeks": milestone.get("estimated_weeks", 2),
            "steps": steps,
        })

    return {"path_id": path_id, "milestones": response_milestones}


def get_path(path_id: str, user_id: str) -> dict:
    """Fetch a path with steps + course details from Supabase. Verifies ownership."""
    path_result = (
        supabase_client.table("learning_paths")
        .select("*")
        .eq("id", path_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not path_result.data:
        raise ValueError("Path not found or access denied")

    steps_result = (
        supabase_client.table("path_steps")
        .select("*, courses(id, title, provider, duration_hrs, difficulty, skill_tags, resource_url)")
        .eq("path_id", path_id)
        .order("sequence_order")
        .execute()
    )

    milestones_dict = {}
    for step in steps_result.data or []:
        label = step.get("milestone_label") or "Milestone"
        if label not in milestones_dict:
            milestones_dict[label] = {
                "label": label,
                "sequence_order": len(milestones_dict) + 1,
                "steps": [],
            }
        course = step.get("courses") or {}
        milestones_dict[label]["steps"].append({
            "step_id": step["id"],
            "course_id": step.get("course_id", ""),
            "title": course.get("title", ""),
            "provider": course.get("provider", ""),
            "duration_hrs": course.get("duration_hrs", 0),
            "difficulty": course.get("difficulty", ""),
            "skill_tags": course.get("skill_tags", []),
            "resource_url": course.get("resource_url", ""),
            "explanation": step.get("explanation", ""),
            "status": step.get("status", "not_started"),
        })

    return {"path_id": path_id, "milestones": list(milestones_dict.values())}
