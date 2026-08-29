import json
from pathlib import Path

from app.config import supabase_client
from app.llm_client import chat_completion
from app.ml.registry import get_recommender
from app.services import web_search_service


def _load_prompt(name: str) -> str:
    return (Path(__file__).parent.parent / "prompts" / name).read_text(encoding="utf-8")


def _call_groq(messages: list, max_tokens: int = 6000) -> str:
    # Name kept for minimal diff at call sites below; routes through
    # app.llm_client, which picks Groq or Bedrock per settings.LLM_PROVIDER.
    return chat_completion(messages, max_tokens=max_tokens, temperature=0.2)


def _strip_fences(raw: str) -> str:
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


# Same <<<LEARNER_TEXT>>> data-boundary pattern used in profile_service.py's
# extract_profile(). goal_text/target_role here are the learner's OWN
# free-text fields (goal_text up to 4000 chars, target_role up to 200 —
# schema-bounded but not content-sanitized) flowing into a SECOND LLM call
# downstream of extraction. Wrapping + the matching instruction in
# explain.txt/explain_batch.txt/path_generate.txt is defense-in-depth against
# a learner trying to steer the explanation/sequencing model via their own
# stored profile text; it does not change what these calls are allowed to
# affect (course_ids are validated against the real candidate list regardless
# — see generate_path()).
def _learner_block(profile: dict) -> str:
    block = (
        f"Learner goal: {profile.get('goal_text', '')}\n"
        f"Target role: {profile.get('target_role', '')}\n"
        f"Level: {profile.get('current_level', '')}"
    )
    return f"<<<LEARNER_TEXT>>>\n{block}\n<<<END_LEARNER_TEXT>>>"


def generate_explanation(profile: dict, course: dict) -> str:
    """Two-sentence explanation of why this course fits this learner."""
    user_msg = (
        f"{_learner_block(profile)}\n\n"
        f"Course: {course.get('title', '')} — {course.get('description', '')}"
    )
    return _call_groq(
        [
            {"role": "system", "content": _load_prompt("explain.txt")},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=1200,
    )


def generate_explanations_batch(profile: dict, courses: list[dict]) -> dict[str, str]:
    """All course explanations for one path generation in ONE call instead of
    one call per course.

    Real production incident this fixes (see PROGRESS_TRACKER.md Round 11):
    a single path generation used to fire 1 sequencing call + N sequential
    explain() calls back-to-back (N=8 for a typical path) - that rapid-fire
    burst was enough to trip Bedrock's on-demand throughput quota on its own,
    causing 100% of real path-generation attempts to fail with
    ThrottlingException. Batching cuts this to 2 calls total regardless of N.

    Never fabricates: any course id the batch response is missing or gives an
    invalid value for falls back to a real individual generate_explanation()
    call for just that course, so a partially-bad batch response still ends
    in every step having a real, LLM-generated explanation - just slower for
    the few that needed the fallback, never faked.
    """
    if not courses:
        return {}

    payload = [
        {"id": c["id"], "title": c.get("title", ""), "description": c.get("description", "")}
        for c in courses
    ]
    user_msg = (
        f"{_learner_block(profile)}\n\n"
        f"Courses:\n{json.dumps(payload, indent=2)}"
    )
    messages = [
        {"role": "system", "content": _load_prompt("explain_batch.txt")},
        {"role": "user", "content": user_msg},
    ]

    raw = _call_groq(messages, max_tokens=3500)
    try:
        result = json.loads(_strip_fences(raw))
    except Exception:
        messages.append({"role": "assistant", "content": raw})
        messages.append({"role": "user", "content": "Return ONLY the JSON object. No markdown fences."})
        try:
            result = json.loads(_strip_fences(_call_groq(messages, max_tokens=3500)))
        except Exception:
            result = {}

    explanations = {
        c["id"]: result[c["id"]].strip()
        for c in courses
        if isinstance(result.get(c["id"]), str) and result[c["id"]].strip()
    }
    for c in courses:
        if c["id"] not in explanations:
            explanations[c["id"]] = generate_explanation(profile, c)
    return explanations


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

    user_msg = f"""<<<LEARNER_TEXT>>>
{json.dumps(profile, indent=2, default=str)}
<<<END_LEARNER_TEXT>>>

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

    # First pass: resolve every real (non-hallucinated) course id across all
    # milestones, in order, WITHOUT calling the LLM yet - collecting them all
    # first is what lets the next step batch every explanation into one call.
    ordered_course_ids = [
        course_id
        for milestone in milestones
        for course_id in milestone.get("course_ids", [])
        if course_id in course_lookup
    ]
    explanations = generate_explanations_batch(
        profile, [course_lookup[cid] for cid in ordered_course_ids]
    )

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
            explanation = explanations.get(course_id) or generate_explanation(profile, course)

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

    # Assign contiguous week numbers so the roadmap week strip and prerequisite
    # locking work for freshly generated paths, not just backfilled ones. This
    # can SPLIT a course across weeks (extra path_steps rows inserted for
    # "Part 2", "Part 3", ...) - which means response_milestones above, built
    # from the rows as originally inserted, is now stale relative to the DB.
    try:
        from app.services import roadmap_service
        roadmap_service.assign_week_numbers(path_id, int(profile.get("weekly_hours") or 10))
        # Re-fetch so the response actually matches the DB (real split parts,
        # if any) instead of returning the pre-split in-memory structure. The
        # frontend only ever reads path_id off this response today (it
        # navigates and re-fetches fresh anyway), but the API contract should
        # still be accurate for any other consumer.
        return get_path(path_id, user_id)
    except Exception as e:
        print(f"[generate_path] week assignment/re-fetch failed: {type(e).__name__}: {e}", flush=True)

    web_search_service.enrich_with_web_resources(response_milestones, target_role=profile.get("target_role", ""))
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
        full_hrs = course.get("duration_hrs", 0)
        # part_hours (this part's real hours, if the course was split across
        # weeks) when present, else the whole course's real duration - see
        # roadmap_service.plan_weeks_with_splits / PROGRESS_TRACKER Round 14.
        part_hours = step.get("part_hours")
        milestones_dict[label]["steps"].append({
            "step_id": step["id"],
            "course_id": step.get("course_id", ""),
            "title": course.get("title", ""),
            "provider": course.get("provider", ""),
            "duration_hrs": part_hours if part_hours is not None else full_hrs,
            "full_duration_hrs": full_hrs,
            "part_number": step.get("part_number") or 1,
            "part_total": step.get("part_total") or 1,
            "difficulty": course.get("difficulty", ""),
            "skill_tags": course.get("skill_tags", []),
            "resource_url": course.get("resource_url", ""),
            "explanation": step.get("explanation", ""),
            "status": step.get("status", "not_started"),
        })

    milestones = list(milestones_dict.values())
    web_search_service.enrich_with_web_resources(milestones)
    return {"path_id": path_id, "milestones": milestones}


# ---------------------------------------------------------------- SWAP
# In-place single-step replacement — the sane alternative to nuking the whole
# path tail on every "not for me" or "too easy" click. See the audit in the
# team chat for why we moved away from tail-regeneration as the default.
_LEVEL_TIERS = ["beginner", "intermediate", "advanced"]


def _load_step_full(step_id: str, user_id: str) -> tuple[dict, dict]:
    """Fetch step + owning path + course; enforce ownership. Raises ValueError."""
    r = (
        supabase_client.table("path_steps")
        .select(
            "*, learning_paths!inner(id, user_id, goal_text), "
            "courses(id, title, description, provider, difficulty, "
            "duration_hrs, resource_url, skill_tags, prerequisites)"
        )
        .eq("id", step_id)
        .execute()
    )
    if not r.data:
        raise ValueError("Step not found")
    step = r.data[0]
    if (step.get("learning_paths") or {}).get("user_id") != user_id:
        raise ValueError("Step not found")
    return step, step["learning_paths"]


def _score_alternative(candidate: dict, skipped_course: dict, target_diff: str) -> float:
    """Higher is better. Overlap on skill_tags + difficulty match beats similarity."""
    cand_tags = {t.lower() for t in (candidate.get("skill_tags") or [])}
    skipped_tags = {t.lower() for t in (skipped_course.get("skill_tags") or [])}
    overlap = len(cand_tags & skipped_tags) / max(len(cand_tags | skipped_tags), 1)  # Jaccard
    diff_match = 1.0 if (candidate.get("difficulty") == target_diff) else 0.0
    similarity = float(candidate.get("similarity") or 0.0)
    # Overlap dominates (weight 3), then diff match (2), then similarity (1).
    return 3.0 * overlap + 2.0 * diff_match + similarity


def swap_step(step_id: str, user_id: str, level_hint: int = 0) -> dict:
    """Replace a single step with the best available alternative.

    Args:
      step_id:    the step being swapped out.
      user_id:    caller (ownership-checked).
      level_hint: +1 = "too easy" (find a harder replacement), 0 = plain swap.

    Behavior:
      1. Marks the skipped step as `skipped` in place (kept for history).
      2. Bumps sequence_order of every later step in the path by +1.
      3. Inserts the alternative right after the skipped step in the same
         milestone, with a fresh grounded explanation.
      4. Writes a feedback_event so the mutation is auditable.
      5. Never touches the global profile.current_level - the too-easy signal
         only shapes THIS replacement.
    """
    step, path = _load_step_full(step_id, user_id)
    skipped_course = step.get("courses") or {}

    if step.get("status") in ("skipped", "completed"):
        return {"swapped": False, "reason": f"Step already {step['status']}"}

    # Fetch profile
    prof_r = supabase_client.table("profiles").select("*").eq("id", user_id).execute()
    if not prof_r.data:
        raise ValueError("Profile not found")
    profile = prof_r.data[0]

    # Target difficulty: current course level (+level_hint tiers).
    cur_diff = skipped_course.get("difficulty") or profile.get("current_level") or "beginner"
    cur_idx = _LEVEL_TIERS.index(cur_diff) if cur_diff in _LEVEL_TIERS else 0
    target_diff = _LEVEL_TIERS[max(0, min(len(_LEVEL_TIERS) - 1, cur_idx + level_hint))]

    # Recommender candidates
    candidates = get_recommender().recommend(profile) or []

    # Filter out anything already in this path (any status), completed elsewhere,
    # and the skipped course itself.
    in_path = {row["course_id"] for row in (supabase_client.table("path_steps")
               .select("course_id").eq("path_id", path["id"]).execute().data or [])
               if row.get("course_id")}
    completed_ids = set(profile.get("completed_courses") or [])
    excluded = in_path | completed_ids | {skipped_course.get("id")}

    candidates = [c for c in candidates if c.get("id") not in excluded]
    if not candidates:
        # No alternative available — mark skipped anyway, don't insert anything.
        _set_step_status_local(step_id, "skipped")
        _log_swap_event(user_id, path["id"], step_id, note="no alternative available")
        return {"swapped": False, "reason": "No alternative course available in the library"}

    # Rank
    candidates.sort(
        key=lambda c: _score_alternative(c, skipped_course, target_diff),
        reverse=True,
    )
    replacement = candidates[0]

    # Bump sequence_orders of everything after the skipped step, then insert.
    old_seq = int(step.get("sequence_order") or 0)
    _bump_later_sequences(path["id"], after=old_seq)
    _set_step_status_local(step_id, "skipped")

    explanation = generate_explanation(profile, replacement)
    inserted = supabase_client.table("path_steps").insert({
        "path_id": path["id"],
        "course_id": replacement["id"],
        "sequence_order": old_seq + 1,
        "milestone_label": step.get("milestone_label"),
        "status": "not_started",
        "explanation": explanation,
    }).execute()
    new_row = inserted.data[0] if inserted.data else None
    _log_swap_event(
        user_id, path["id"], step_id,
        note=f"swapped for {replacement.get('title')} (level_hint={level_hint})",
    )

    return {
        "swapped": True,
        "old_step_id": step_id,
        "new_step": {
            "step_id": new_row["id"] if new_row else "",
            "course_id": replacement["id"],
            "title": replacement.get("title", ""),
            "provider": replacement.get("provider", ""),
            "duration_hrs": replacement.get("duration_hrs", 0),
            "difficulty": replacement.get("difficulty", ""),
            "skill_tags": replacement.get("skill_tags", []),
            "resource_url": replacement.get("resource_url", ""),
            "milestone_label": step.get("milestone_label"),
            "explanation": explanation,
            "status": "not_started",
            "sequence_order": old_seq + 1,
        },
    }


def _set_step_status_local(step_id: str, status: str) -> None:
    supabase_client.table("path_steps").update({"status": status}).eq("id", step_id).execute()


def _bump_later_sequences(path_id: str, after: int) -> None:
    """Add +1 to sequence_order for every step in `path_id` with sequence_order > after."""
    later = (
        supabase_client.table("path_steps")
        .select("id, sequence_order")
        .eq("path_id", path_id)
        .gt("sequence_order", after)
        .execute()
    )
    # supabase-py has no bulk-update-with-expression; do individual updates in
    # descending order to avoid transient unique conflicts if we ever add one.
    for row in sorted(later.data or [], key=lambda r: r["sequence_order"], reverse=True):
        supabase_client.table("path_steps").update(
            {"sequence_order": row["sequence_order"] + 1}
        ).eq("id", row["id"]).execute()


def _log_swap_event(user_id: str, path_id: str, step_id: str, note: str) -> None:
    supabase_client.table("feedback_events").insert({
        "user_id": user_id,
        "path_id": path_id,
        "step_id": step_id,
        "event_type": "not_interested",  # reuse existing enum; note carries the semantic
        "note": note,
    }).execute()


def _ensure_course_in_catalog(course_data: dict) -> dict:
    """Ensures a dynamically found or synthesized course exists in the database courses table."""
    url = (course_data.get("resource_url") or "").strip()
    title = (course_data.get("title") or "").strip()

    # Check if this course or URL already exists
    if url and url != "https://google.com":
        existing = supabase_client.table("courses").select("*").eq("resource_url", url).execute()
        if existing.data:
            return existing.data[0]
    if title:
        existing = supabase_client.table("courses").select("*").ilike("title", title).execute()
        if existing.data:
            return existing.data[0]

    # Create embedding for pgvector
    from app.ml.embedder import embed_text
    desc = course_data.get("description", "") or title
    tags = course_data.get("skill_tags") or []
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]

    emb = embed_text(f"{title} {desc} {' '.join(tags)}")

    new_course = {
        "title": title,
        "description": desc,
        "provider": course_data.get("provider", "Web Learning Resource"),
        "difficulty": course_data.get("difficulty", "beginner"),
        "duration_hrs": int(course_data.get("duration_hrs") or 6),
        "resource_url": url or "https://google.com",
        "skill_tags": tags,
        "prerequisites": course_data.get("prerequisites") or [],
        "embedding": emb,
    }
    res = supabase_client.table("courses").insert(new_course).execute()
    if res.data:
        return res.data[0]
    return course_data


def swap_step_with_preference(
    step_id: str, user_id: str, preference: str = "custom", note: str = ""
) -> dict:
    """Realtime in-depth AI & Web Search re-recommendation for a single step according to learner's preference."""
    step, path = _load_step_full(step_id, user_id)
    old_course = step.get("courses") or {}
    old_title = old_course.get("title") or "Current Module"
    old_skills = old_course.get("skill_tags") or []
    old_diff = old_course.get("difficulty") or "beginner"
    milestone = step.get("milestone_label") or "Core Skills"

    # Fetch profile (skills, resume context, topic ratings, years, goals)
    prof_r = supabase_client.table("profiles").select("*").eq("id", user_id).execute()
    if not prof_r.data:
        raise ValueError("Profile not found")
    profile = prof_r.data[0]

    # Target specific topic/technology of this step to prevent unrelated topic jumps
    topic_keywords = f"{old_title} {' '.join(old_skills[:2])}".strip()

    # 1. Multi-query targeted live web search
    search_queries = []
    if preference == "too_advanced":
        search_queries.append(f"{topic_keywords} beginner step by step tutorial crash course guide")
        search_queries.append(f"{topic_keywords} fundamentals for beginners documentation")
    elif preference == "too_basic":
        search_queries.append(f"{topic_keywords} advanced production deep dive masterclass architecture")
        search_queries.append(f"{topic_keywords} best practices scaling guide")
    elif preference == "free_resource":
        search_queries.append(f"{topic_keywords} official documentation free course youtube freecodecamp")
        search_queries.append(f"{topic_keywords} free guide geeksforgeeks documentation")
    elif preference in ("hands_on", "practice_sheet"):
        search_queries.append(f"{topic_keywords} interactive hands-on coding tutorial lab exercises")
        search_queries.append(f"{topic_keywords} practical exercises implementation guide")
    else:
        search_queries.append(f"{topic_keywords} best online tutorial guide documentation")

    if note and note.strip():
        search_queries.append(f"{topic_keywords} {note.strip()}")

    web_results = []
    seen_urls = set()
    for q in search_queries[:3]:
        try:
            results = web_search_service.search_learning_resources(q, max_results=5)
            for r in results:
                u = r.get("url")
                if u and u not in seen_urls:
                    seen_urls.add(u)
                    web_results.append(r)
        except Exception as e:
            print(f"[path_service] search query '{q}' failed: {e}", flush=True)

    # 2. Vector search candidate fallback in DB specifically on topic
    from app.ml.embedder import embed_text
    from app.ml.retriever import retrieve_candidates
    try:
        topic_emb = embed_text(f"{topic_keywords} {preference} {note}")
        catalog_matches = retrieve_candidates(topic_emb, n=6)
    except Exception:
        catalog_matches = []

    in_path_ids = {
        row["course_id"]
        for row in (
            supabase_client.table("path_steps")
            .select("course_id")
            .eq("path_id", path["id"])
            .execute()
            .data or []
        )
        if row.get("course_id")
    }

    # 3. AI synthesis and selection
    system_prompt = """You are an expert AI Curriculum Designer and Technical Recommender.
A learner wants to re-recommend / swap a specific learning module in their active learning path.

CRITICAL INSTRUCTIONS:
1. STRICT SUBJECT DOMAIN COHERENCE: The new course MUST be on the exact same subject / technology as the current module (e.g. if the current course is Kubernetes / Containers, the replacement MUST be Kubernetes / Containers — NEVER switch to an unrelated subject like AWS Solutions Architect, React, or Python unless explicitly asked in the user's note).
2. SATISFY LEARNER INTENT:
   - 'too_advanced' / gentler: A clear, step-by-step beginner-friendly introduction with zero unnecessary jargon, focusing on foundational mechanics.
   - 'too_basic': An advanced, production-grade deep dive focusing on real-world architecture, scaling, and best practices.
   - 'free_resource': A verified free / open-source resource (Official Docs, YouTube crash course, freeCodeCamp, GeeksforGeeks, NPTEL).
   - 'hands_on': Practical hands-on exercises, labs, and interactive code implementations.
   - 'custom' / user note: Directly satisfy the learner's exact written request.
3. GROUNDING: Use the provided live web search results whenever possible to pick a REAL course / tutorial with an authentic title, provider, and valid resource URL.
4. EXPLANATION: Write a 2-sentence explanation of why this replacement is better suited for the learner based on their feedback, experience, and target goal.

Return ONLY a JSON object with this exact schema (no markdown fences, no extra keys):
{
  "title": "String",
  "provider": "String",
  "description": "String",
  "resource_url": "String",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "duration_hrs": 6,
  "skill_tags": ["String", "String"],
  "explanation": "String"
}"""

    user_payload = {
        "learner_profile": {
            "target_role": profile.get("target_role"),
            "current_level": profile.get("current_level"),
            "detected_years_experience": profile.get("detected_years_experience"),
            "goal_text": profile.get("goal_text"),
        },
        "current_module": {
            "milestone": milestone,
            "title": old_title,
            "description": old_course.get("description"),
            "difficulty": old_diff,
            "skill_tags": old_skills,
        },
        "swap_request": {
            "preference": preference,
            "user_note": note,
        },
        "live_web_search_results": web_results[:6],
        "catalog_candidates": [
            {
                "id": c.get("id"),
                "title": c.get("title"),
                "provider": c.get("provider"),
                "difficulty": c.get("difficulty"),
                "resource_url": c.get("resource_url"),
            }
            for c in catalog_matches if c.get("id") not in in_path_ids and c.get("id") != old_course.get("id")
        ][:3],
    }

    user_msg = f"<<<SWAP_REQUEST>>>\n{json.dumps(user_payload, indent=2)}\n<<<END_SWAP_REQUEST>>>"

    try:
        raw = _call_groq([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_msg},
        ], max_tokens=2500)
        parsed = json.loads(_strip_fences(raw))
    except Exception as e:
        print(f"[path_service] LLM swap call failed: {e}, falling back to top web result", flush=True)
        top_w = web_results[0] if web_results else {}
        parsed = {
            "title": top_w.get("title") or f"{old_title} (Tailored Alternative)",
            "provider": top_w.get("provider") or "Web Learning Resource",
            "description": top_w.get("snippet") or old_course.get("description") or "Alternative learning module",
            "resource_url": top_w.get("url") or old_course.get("resource_url") or "https://google.com",
            "difficulty": "beginner" if preference == "too_advanced" else "advanced" if preference == "too_basic" else old_diff,
            "duration_hrs": old_course.get("duration_hrs") or 6,
            "skill_tags": old_skills or [old_title],
            "explanation": f"Calibrated alternative module matching your request for {preference.replace('_', ' ')}."
        }

    # Ensure this course is in Supabase catalog
    replacement = _ensure_course_in_catalog(parsed)
    explanation = parsed.get("explanation") or generate_explanation(profile, replacement)

    # In-place update of the step
    supabase_client.table("path_steps").update({
        "course_id": replacement["id"],
        "explanation": explanation,
        "status": "not_started",
    }).eq("id", step_id).execute()

    _log_swap_event(
        user_id, path["id"], step_id,
        note=f"rerecommended for {replacement.get('title')} (preference={preference}, note={note[:200]})"
    )

    return {
        "swapped": True,
        "step_id": step_id,
        "replacement": replacement,
        "explanation": explanation,
    }


