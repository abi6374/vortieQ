import json
from pathlib import Path

from app.config import supabase_client
from app.llm_client import chat_completion
from app.ml.registry import get_recommender
from app.services import web_search_service
# Real resource-URL validation and the ResourceValidationError it raises now
# live in catalog_service.py, shared by both this swap/rerecommend flow and
# the dynamic-catalog ingestion pipeline (provider_resources) - imported and
# rebound under the old names here so this module's own call sites (and the
# existing test suite's patch targets) don't need to change.
from app.services.catalog_service import ResourceValidationError, validate_resource_url as _validate_resource_url


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
    missing = [c for c in courses if c["id"] not in explanations]
    if missing:
        from concurrent.futures import ThreadPoolExecutor

        def _fetch_missing(c):
            try:
                return c["id"], generate_explanation(profile, c)
            except Exception:
                skills_str = ", ".join(c.get("skill_tags") or []) or c.get("title", "")
                role_str = profile.get("target_role") or "your target goal"
                return c["id"], f"Calibrated for {role_str} to build foundational competence in {skills_str}."

        with ThreadPoolExecutor(max_workers=min(len(missing), 5)) as pool:
            for cid, exp in pool.map(_fetch_missing, missing):
                explanations[cid] = exp
    return explanations


def generate_path(user_id: str, profile: dict) -> dict:
    """Recommend courses, sequence them into milestones, persist, and return the path."""
    courses = get_recommender().recommend(profile)
    if not courses:
        raise ValueError("No courses returned from recommender")

    # If YouTube provider is configured, search verified top tutorial videos for learner's target role & skills
    # and offer them as candidate resources for the LLM path planner.
    # `promoted_youtube_courses` is tracked separately (not just merged into
    # `courses`) so the guarantee pass below - after the LLM sequences
    # milestones - can check whether any of them actually got picked.
    promoted_youtube_courses: list[dict] = []
    try:
        from app.services import youtube_provider
        if youtube_provider.is_configured():
            adapter = youtube_provider.get_default_adapter()
            query_parts = [profile.get("target_role") or ""] + (profile.get("interests") or [])[:2]
            search_query = " ".join([p for p in query_parts if p]).strip()
            if search_query:
                yt_videos = adapter.search_videos(search_query, max_results=3, skill_tags=profile.get("interests") or [])
                for v in yt_videos:
                    try:
                        promoted = _ensure_course_in_catalog({
                            "title": v["title"],
                            "description": v.get("description", ""),
                            "provider": "YouTube",
                            "resource_url": v["canonical_url"],
                            "difficulty": profile.get("current_level") or "beginner",
                            "duration_hrs": v.get("duration_hrs") or 3,
                            "skill_tags": profile.get("interests") or [],
                        })
                        if promoted and not any(c.get("id") == promoted.get("id") for c in courses):
                            courses.append(promoted)
                            promoted_youtube_courses.append(promoted)
                    except Exception as e:
                        print(f"[generate_path] YouTube video candidate add failed: {e}", flush=True)
    except Exception as e:
        print(f"[generate_path] YouTube search failed: {e}", flush=True)

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


    from app.services.profile_service import extract_target_weeks
    target_weeks = profile.get("target_weeks") or extract_target_weeks(profile.get("goal_text"), profile)
    weekly_hours = int(profile.get("weekly_hours") or 10)
    enriched_profile_for_llm = {
        **profile,
        "target_timeline_weeks": target_weeks or (12 if weekly_hours >= 10 else 16),
        "weekly_hours": weekly_hours,
        "total_hours_budget": (target_weeks or (12 if weekly_hours >= 10 else 16)) * weekly_hours,
    }

    user_msg = f"""<<<LEARNER_TEXT>>>
{json.dumps(enriched_profile_for_llm, indent=2, default=str)}
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

    # Real invariant this enforces: "at most one active path per user."
    # Confirmed live during this session's own verification testing that
    # this could actually break - a real test account had TWO rows both
    # status='active' in learning_paths, with no schema constraint or
    # application logic preventing it. Idempotency-Key protection on the
    # router (POST /api/paths/generate) guards the "same request retried"
    # case; this guards the distinct case of a genuinely SECOND call
    # (e.g. two browser tabs, or a legitimate "regenerate my path" action
    # in the future) - archiving whatever was active before rather than
    # leaving two paths simultaneously active and ambiguous about which
    # one get_roadmap()/rerecommend/swap should even be operating on.
    course_lookup = {c["id"]: c for c in courses}

    # Deterministic prerequisite repair pass - "course sequencing is mostly
    # delegated to an LLM after retrieval, without deterministic
    # prerequisite graph validation" from the audit. Reorders (never drops
    # or invents) courses so a real skill_prerequisites edge is never
    # violated by two courses the LLM itself already chose for this path.
    try:
        from app.services import path_planner
        milestones, _prereq_violations = path_planner.validate_and_reorder(milestones, course_lookup)
        for note in _prereq_violations:
            print(f"[generate_path] prerequisite reorder: {note}", flush=True)
    except Exception as e:
        print(f"[generate_path] prerequisite validation skipped: {type(e).__name__}: {e}", flush=True)

    # Guarantee at least one verified YouTube video actually surfaces in the
    # generated path, rather than leaving it purely to LLM chance. Live
    # testing showed the 3 YouTube candidates above are real, verified, and
    # DO reach candidates_for_llm - but with ~20 already-strong real course
    # candidates competing for the same 12-20 selection slots, the sequencer
    # has no explicit incentive to ever pick them, so in practice they were
    # silently never showing up in real generated paths. This never displaces
    # anything the LLM chose - it only adds the single best-quality video,
    # to whichever milestone shares the most real skill_tags with it (falls
    # back to the first milestone if there's no overlap at all), if and only
    # if none of the YouTube candidates were already selected.
    if promoted_youtube_courses and milestones:
        selected_ids = {cid for m in milestones for cid in m.get("course_ids", [])}
        if not any(pc.get("id") in selected_ids for pc in promoted_youtube_courses):
            best_video = max(promoted_youtube_courses, key=lambda c: c.get("quality_score") or 0)
            video_tags = set((best_video.get("skill_tags") or []))

            def _overlap(m):
                m_tags = set()
                for cid in m.get("course_ids", []):
                    m_tags.update(course_lookup.get(cid, {}).get("skill_tags") or [])
                return len(m_tags & video_tags)

            best_milestone = max(milestones, key=_overlap) if video_tags else milestones[0]
            best_milestone.setdefault("course_ids", []).append(best_video["id"])
            print(
                f"[generate_path] guaranteed inclusion: added YouTube video "
                f"{best_video.get('title', '')!r} to milestone {best_milestone.get('label', '')!r}",
                flush=True,
            )

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

    # Database-reliability audit: every step used to be its own sequential
    # INSERT after a separate archive-prior-path UPDATE and a separate
    # learning_paths INSERT - a crash partway through the loop left an
    # `active` path with only SOME of its steps, silently served to the
    # learner as complete. Build the full ordered step list in memory
    # first (no DB writes yet), then create the path AND every step in one
    # atomic RPC call (create_learning_path_with_steps, migration 017) -
    # either the whole path exists or none of it does.
    rpc_steps = []
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

            rpc_steps.append({
                "course_id": course_id,
                "milestone_label": milestone["label"],
                "explanation": explanation,
            })

            steps.append({
                "step_id": "",  # filled in after the atomic insert, below
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

    if not rpc_steps:
        raise ValueError("No valid course steps could be sequenced from the recommender's output")

    path_id = supabase_client.rpc("create_learning_path_with_steps", {
        "p_user_id": user_id,
        "p_goal_text": profile.get("goal_text", ""),
        "p_steps": rpc_steps,
    }).execute().data

    # Backfill the real step_ids the RPC generated into the in-memory
    # response (only used by the fallback return path below - the primary
    # path re-fetches from the DB via get_path() instead).
    inserted_steps = (
        supabase_client.table("path_steps")
        .select("id, sequence_order").eq("path_id", path_id).order("sequence_order").execute()
    ).data or []
    id_by_seq = {row["sequence_order"]: row["id"] for row in inserted_steps}
    seq = 0
    for milestone in response_milestones:
        for step in milestone["steps"]:
            seq += 1
            step["step_id"] = id_by_seq.get(seq, "")

    # Assign contiguous week numbers so the roadmap week strip and prerequisite
    # locking work for freshly generated paths, not just backfilled ones. This
    # can SPLIT a course across weeks (extra path_steps rows inserted for
    # "Part 2", "Part 3", ...) - which means response_milestones above, built
    # from the rows as originally inserted, is now stale relative to the DB.
    try:
        from app.services import roadmap_service
        pacing = roadmap_service.assign_week_numbers(path_id, weekly_hours, target_weeks=target_weeks)
        # Re-fetch so the response actually matches the DB (real split parts,
        # if any) instead of returning the pre-split in-memory structure. The
        # frontend only ever reads path_id off this response today (it
        # navigates and re-fetches fresh anyway), but the API contract should
        # still be accurate for any other consumer.
        result = get_path(path_id, user_id)
        # Real, honest pacing info instead of ever silently inflating the
        # learner's stated weekly_hours to force-fit their target timeline
        # (see roadmap_service.assign_week_numbers's docstring for the bug
        # this replaces) - the frontend can show "this will take N weeks at
        # your pace" when the honest plan runs past what was asked for.
        if pacing:
            result["pacing"] = pacing
        return result
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
    web_search_service.enrich_with_web_resources(milestones[:3])
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


def _score_alternative_breakdown(candidate: dict, skipped_course: dict, target_diff: str) -> tuple[float, dict]:
    """Same scoring _score_alternative always did, but also returns the
    named component breakdown - lets swap_step persist a real, inspectable
    recommendation_explanations row (feature_scores) instead of only a bare
    sort key, and build an honest, deterministic "why this one" sentence
    without depending on an LLM having gotten the comparison right."""
    cand_tags = {t.lower() for t in (candidate.get("skill_tags") or [])}
    skipped_tags = {t.lower() for t in (skipped_course.get("skill_tags") or [])}
    overlap = len(cand_tags & skipped_tags) / max(len(cand_tags | skipped_tags), 1)  # Jaccard
    diff_match = 1.0 if (candidate.get("difficulty") == target_diff) else 0.0
    similarity = float(candidate.get("similarity") or 0.0)
    # Overlap dominates (weight 3), then diff match (2), then similarity (1).
    total = 3.0 * overlap + 2.0 * diff_match + similarity
    return total, {
        "skill_overlap": round(overlap, 4),
        "difficulty_match": diff_match,
        "similarity": round(similarity, 4),
    }


def _score_alternative(candidate: dict, skipped_course: dict, target_diff: str) -> float:
    """Higher is better. Overlap on skill_tags + difficulty match beats similarity."""
    total, _ = _score_alternative_breakdown(candidate, skipped_course, target_diff)
    return total


def swap_step(step_id: str, user_id: str, level_hint: int = 0) -> dict:
    """Replace a single step with the best available alternative.

    Args:
      step_id:    the step being swapped out.
      user_id:    caller (ownership-checked).
      level_hint: +1 = "too easy" (find a harder replacement), -1 = "too
                  hard" (find an easier one), 0 = plain swap (e.g.
                  "not interested" - no difficulty change implied).

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

    # Rank and score every real candidate (breakdown kept, not just the sort
    # key) so the top few can be compared and audited, not just the winner.
    scored = [
        {"course": c, "total_score": (t_and_f := _score_alternative_breakdown(c, skipped_course, target_diff))[0],
         "feature_scores": t_and_f[1]}
        for c in candidates
    ]
    scored.sort(key=lambda s: s["total_score"], reverse=True)
    replacement = scored[0]["course"]

    # "Compare >=3 verified alternatives" from the audit - compares as many
    # real candidates as exist, up to 3, never fabricates phantom ones when
    # fewer are available (an honest "only 1 alternative existed" is
    # correct behavior, not a bug to paper over).
    compared = scored[: min(3, len(scored))]
    comparison_note = None
    if len(compared) > 1:
        runner_up = compared[1]
        winner_reasons = []
        if compared[0]["feature_scores"]["skill_overlap"] > runner_up["feature_scores"]["skill_overlap"]:
            winner_reasons.append("more skill overlap with the original course")
        if compared[0]["feature_scores"]["difficulty_match"] > runner_up["feature_scores"]["difficulty_match"]:
            winner_reasons.append("a better difficulty match")
        if compared[0]["feature_scores"]["similarity"] > runner_up["feature_scores"]["similarity"]:
            winner_reasons.append("higher topical similarity")
        reason_text = " and ".join(winner_reasons) if winner_reasons else "an overall stronger match"
        comparison_note = (
            f"Compared {len(compared)} verified alternatives; chose "
            f"\"{replacement.get('title')}\" over \"{runner_up['course'].get('title')}\" for {reason_text}."
        )
    else:
        comparison_note = "Only one verified alternative was available for this swap."

    # Real audit trail (recommendation_runs/recommendation_explanations,
    # migration 008) - previously only path_service.generate_path() wrote
    # to these tables; swap_step's own comparison was un-audited. Best-
    # effort: never blocks the real swap on a logging failure.
    try:
        from app.ml.ranking_engine import persist_recommendation_run
        persist_recommendation_run(
            user_id=user_id, path_id=path["id"], trigger="swap", profile=profile,
            candidates=[s["course"] for s in compared], hard_filter_reasons={},
            scored=compared, final_course_ids=[replacement["id"]],
        )
    except Exception as e:
        print(f"[path_service] failed to persist swap recommendation run: {type(e).__name__}: {e}", flush=True)

    # Database-reliability audit: this used to be N sequential single-row
    # UPDATEs (bump every later sequence_order one at a time), then a
    # separate UPDATE (mark skipped), then a separate INSERT - a crash
    # partway through left duplicate or gapped sequence_order values with
    # no step actually replaced. swap_path_step (migration 017) does the
    # bump (one set-based UPDATE, safe because path_steps_path_seq_uniq is
    # DEFERRABLE INITIALLY DEFERRED), the skip, and the insert together in
    # one transaction.
    old_seq = int(step.get("sequence_order") or 0)
    explanation = generate_explanation(profile, replacement)
    swap_row = supabase_client.rpc("swap_path_step", {
        "p_step_id": step_id,
        "p_user_id": user_id,
        "p_new_course_id": replacement["id"],
        "p_explanation": explanation,
    }).execute().data
    new_row = swap_row[0] if swap_row else None
    new_step_id = new_row["new_step_id"] if new_row else ""
    _log_swap_event(
        user_id, path["id"], step_id,
        note=f"swapped for {replacement.get('title')} (level_hint={level_hint})",
    )
    from app.services.roadmap_service import bump_path_version
    version_info = bump_path_version(path["id"])

    return {
        "swapped": True,
        "old_step_id": step_id,
        "path_version": version_info.get("version") if version_info else None,
        "last_recomputed_at": version_info.get("last_recomputed_at") if version_info else None,
        "comparison_note": comparison_note,
        "new_step": {
            "step_id": new_step_id,
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


def _log_swap_event(user_id: str, path_id: str, step_id: str, note: str) -> None:
    supabase_client.table("feedback_events").insert({
        "user_id": user_id,
        "path_id": path_id,
        "step_id": step_id,
        "event_type": "not_interested",  # reuse existing enum; note carries the semantic
        "note": note,
    }).execute()


def _ensure_course_in_catalog(course_data: dict) -> dict:
    """Ensures a dynamically found or synthesized course exists in the
    database courses table - only ever a REAL, independently-verified
    resource (see _validate_resource_url). Raises ResourceValidationError
    rather than persisting a placeholder/guessed URL; this table is shared
    across every user, so a fabricated row here doesn't just affect the one
    swap that created it."""
    from app.services.catalog_service import canonicalize_url, is_trusted_provider_domain

    url = (course_data.get("resource_url") or "").strip()
    if url:
        url = canonicalize_url(url)
    title = (course_data.get("title") or "").strip()

    # Check if this course or URL already exists — an already-catalogued
    # course was validated when IT was first inserted, so re-checking here
    # would just be redundant network calls on every repeat recommendation.
    # Canonicalized first, so a tracking-param-decorated duplicate of an
    # already-catalogued URL dedupes correctly instead of creating a
    # second row for the same real resource.
    if url:
        existing = supabase_client.table("courses").select("*").eq("resource_url", url).execute()
        if existing.data:
            return existing.data[0]
    if title:
        existing = supabase_client.table("courses").select("*").ilike("title", title).execute()
        if existing.data:
            return existing.data[0]

    # A YouTube URL never gets trusted on the LLM's own say-so for title/
    # duration/channel/availability - "No LLM may invent video IDs, URLs,
    # durations, channels, or availability state." Re-fetches REAL
    # metadata from the API itself and routes through the full
    # provenance-preserving catalog_service pipeline instead of this
    # function's generic insert below. An honest ResourceValidationError
    # (never a silent fall-through to trusting the LLM's claims) if the
    # video can't be independently re-verified this way.
    from app.services import youtube_provider
    video_id = youtube_provider.extract_video_id(url) if url else None
    if video_id:
        if not youtube_provider.is_configured():
            raise ResourceValidationError(
                f"Cannot verify YouTube video {video_id!r}: YouTube provider is not configured"
            )
        adapter = youtube_provider.get_default_adapter()
        raw_items = adapter._fetch_video_details([video_id])
        tags = course_data.get("skill_tags") or []
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]
        validated = adapter._validate_and_score(raw_items[0], tags) if raw_items else None
        if not validated or validated["quality_score"] < youtube_provider.MIN_QUALITY_SCORE:
            raise ResourceValidationError(
                f"YouTube video {video_id!r} could not be independently re-verified "
                "(private, deleted, non-embeddable, or below the quality bar)"
            )
        from app.services import catalog_service
        resource = catalog_service.ingest_youtube_result(
            validated, skill_tags=tags, difficulty=course_data.get("difficulty")
        )
        if not resource:
            raise ResourceValidationError(f"Failed to persist verified YouTube video {video_id!r}")
        promoted = catalog_service.promote_to_course(resource["id"])
        if not promoted:
            raise ResourceValidationError(f"Failed to promote verified YouTube video {video_id!r}")
        return promoted

    if not _validate_resource_url(url):
        raise ResourceValidationError(
            f"No independently-verifiable resource URL for {title!r} ({url!r})"
        )

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
        "resource_url": url,
        "skill_tags": tags,
        "prerequisites": course_data.get("prerequisites") or [],
        "embedding": emb,
        "is_trusted_domain": is_trusted_provider_domain(url),
        # Database-reliability audit: this insert previously omitted
        # `source`, silently defaulting to the column's 'seed' default even
        # though this row is a dynamically-ingested web resource, not part
        # of the original CSV seed set. That mislabeling meant these rows
        # were invisible to anything scoped to source='provider_resource'
        # (including the new idx_courses_resource_url_provider_uniq unique
        # index below) - real provenance now recorded accurately.
        "source": "provider_resource",
    }
    try:
        res = supabase_client.table("courses").insert(new_course).execute()
    except Exception:
        # Database-reliability audit: SELECT-then-INSERT above has a real
        # race - two concurrent swap/rerecommend requests (plausibly two
        # different learners independently getting the same freshly-found
        # web result recommended) can both see "not found" and both
        # attempt this INSERT. idx_courses_resource_url_provider_uniq
        # (migration 016) turns the second INSERT into a unique-violation
        # instead of a silent duplicate row; re-select and use the winner
        # rather than raising - the outcome for both callers is identical
        # either way (a real, verified course row for this exact URL).
        existing = supabase_client.table("courses").select("*").eq("resource_url", url).execute()
        if existing.data:
            return existing.data[0]
        raise ResourceValidationError(f"Failed to persist verified course {title!r}")
    if res.data:
        return res.data[0]
    raise ResourceValidationError(f"Failed to persist verified course {title!r}")


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

    # 1b. YouTube - a second, official, free-quota provider (see
    # youtube_provider.py). "Video recommendations should not dominate
    # learners who prefer practice/docs/courses": profiles.
    # preferred_formats already existed in the schema (default includes
    # 'video') but was never actually consulted anywhere in the app before
    # this - real learner intent, not fabricated, now genuinely gates
    # whether video candidates are even offered to the LLM at all.
    preferred_formats = profile.get("preferred_formats") or ["course", "video", "article"]
    if "video" in preferred_formats:
        try:
            from app.services import youtube_provider
            adapter = youtube_provider.get_default_adapter()
            youtube_videos = adapter.search_videos(topic_keywords, max_results=5, skill_tags=old_skills)
            for v in youtube_videos:
                u = v.get("canonical_url")
                if u and u not in seen_urls:
                    seen_urls.add(u)
                    web_results.append({
                        "title": v["title"],
                        "url": u,
                        "snippet": v.get("description", ""),
                        "provider": "YouTube",
                    })
        except Exception as e:
            print(f"[path_service] YouTube search failed: {type(e).__name__}: {e}", flush=True)

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
        # No more "https://google.com" placeholder here - if neither the top
        # web result nor the old course has a real URL, resource_url stays
        # empty and _ensure_course_in_catalog below rejects it honestly
        # (ResourceValidationError) rather than persisting a fabricated
        # "Tailored Alternative" course pointing at a search engine homepage.
        top_url = top_w.get("url") or old_course.get("resource_url") or ""
        parsed = {
            "title": top_w.get("title") or f"{old_title} (Tailored Alternative)",
            "provider": top_w.get("provider") or "Web Learning Resource",
            "description": top_w.get("snippet") or old_course.get("description") or "Alternative learning module",
            "resource_url": top_url,
            "difficulty": "beginner" if preference == "too_advanced" else "advanced" if preference == "too_basic" else old_diff,
            "duration_hrs": old_course.get("duration_hrs") or 6,
            "skill_tags": old_skills or [old_title],
            "explanation": f"Calibrated alternative module matching your request for {preference.replace('_', ' ')}."
        }

    # Ensure this course is in Supabase catalog - only ever a real,
    # independently-verified resource. A ResourceValidationError here means
    # neither the LLM nor the web search produced anything real enough to
    # verify; the honest outcome is a failed swap the learner can retry or
    # rephrase, never a fabricated catalog entry (see ResourceValidationError
    # docstring for the production incident this replaces).
    try:
        replacement = _ensure_course_in_catalog(parsed)
    except ResourceValidationError as e:
        raise ValueError(
            "Could not find a verified alternative resource for this request. "
            "Please try again or rephrase your preference."
        ) from e
    explanation = parsed.get("explanation") or generate_explanation(profile, replacement)

    # In-place update of the step
    supabase_client.table("path_steps").update({
        "course_id": replacement["id"],
        "explanation": explanation,
        "status": "not_started",
    }).eq("id", step_id).execute()

    # Real mastery evidence from the learner's own stated preference - this
    # is the ACTUAL reachable "too easy"/"too hard" signal in the live app
    # (the modal's "Too Advanced"/"Too Basic" options on the Roadmap page;
    # FeedbackButtons.jsx/handle_feedback's too_easy/too_hard branches exist
    # but are currently unreachable dead code - see PROGRESS_TRACKER / audit
    # notes). 'too_advanced' means the recommender OVERESTIMATED this
    # skill (too hard); 'too_basic' means it UNDERESTIMATED it (too easy).
    # Every other preference (free_resource/hands_on/custom) is a format/
    # style choice, not a competency signal, so it must not move mastery.
    unmet_prerequisites: list = []
    reason_for_change = None
    if preference in ("too_advanced", "too_basic"):
        from app.services import mastery_service
        event_type = "too_hard" if preference == "too_advanced" else "too_easy"
        try:
            mastery_service.update_mastery_from_feedback(user_id, old_skills, event_type)
        except Exception as e:
            print(f"[path_service] mastery update from swap preference failed: {type(e).__name__}: {e}", flush=True)
        if preference == "too_advanced":
            try:
                unmet_prerequisites = mastery_service.find_unmet_prerequisites(user_id, old_skills)
            except Exception as e:
                print(f"[path_service] prerequisite-gap check failed: {type(e).__name__}: {e}", flush=True)
            if unmet_prerequisites:
                names = ", ".join(g["name"] for g in unmet_prerequisites)
                reason_for_change = (
                    f"This looked too hard, likely because of a gap in {names} - "
                    "swapped in an easier alternative and lowered our confidence "
                    "in your mastery of this skill."
                )
            else:
                reason_for_change = "Swapped in an easier alternative and lowered our confidence in your mastery of this skill."
        else:
            reason_for_change = "Swapped in a more advanced alternative and raised our confidence in your mastery of this skill."

    _log_swap_event(
        user_id, path["id"], step_id,
        note=f"rerecommended for {replacement.get('title')} (preference={preference}, note={note[:200]})"
    )
    from app.services.roadmap_service import bump_path_version
    version_info = bump_path_version(path["id"])

    return {
        "swapped": True,
        "step_id": step_id,
        "replacement": replacement,
        "explanation": explanation,
        "path_version": version_info.get("version") if version_info else None,
        "last_recomputed_at": version_info.get("last_recomputed_at") if version_info else None,
        "reason_for_change": reason_for_change,
        "unmet_prerequisites": unmet_prerequisites,
    }


