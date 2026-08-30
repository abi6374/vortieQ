"""Per-skill learner mastery - replaces the single global `current_level`.

Real production gap this closes: profiles.topic_ratings and
detected_years_experience were SAVED (from resume extraction, GitHub
analysis, self-assessment) but never actually consulted by the recommender
- a learner with 95% confidence in Python could still be shown beginner
Python content, because scoring only ever looked at current_level.

Every write here comes from a real, named evidence_source (never a guess):
'resume' (resume_service topic extraction), 'github' (github_service repo
analysis), 'self_assessment' (the onboarding Assess Skills step / topic
rating edits), 'completion' (a course was actually finished), 'feedback'
('too easy' signal - the recommender underestimated this skill). 'quiz' is
in the DB CHECK constraint for a future objective-assessment feature; no
current code path produces it, and this module doesn't fabricate one.

Combining new evidence with an existing estimate uses a confidence-weighted
average (more evidence -> higher combined confidence, weighted toward
whichever observation was more confident) rather than blindly overwriting
one signal with the next - a learner's resume AND their GitHub repos both
inform the same skill's mastery, not just whichever was analyzed last.
"""

from datetime import datetime, timezone

from app.config import supabase_client
from app.services import taxonomy_service

# 4-tier self-report/resume scale -> a continuous mastery_probability.
# Matches the SAME scale already used across the app (resume_service,
# profile_service.merge_topic_ratings) - not a new invented scale.
_LEVEL_TO_PROBABILITY = {
    "basic": 0.25,
    "beginner": 0.25,  # some call sites use the 3-tier recommender scale directly
    "intermediate": 0.55,
    "advanced": 0.8,
    "expert": 0.95,
}

_DEFAULT_CONFIDENCE_BY_SOURCE = {
    "resume": 0.6,
    "github": 0.7,   # real repo evidence - somewhat more reliable than free-text self-report
    "self_assessment": 0.5,
    "completion": 0.5,
    "feedback": 0.4,  # a single "too easy" click is a weak, but real, signal
    "quiz": 0.85,     # objective checks would be the most reliable source, if/when implemented
}


def _combine(existing: dict | None, new_mastery: float, new_confidence: float) -> tuple[float, float]:
    """Confidence-weighted combination of an existing mastery estimate with
    one new observation. Returns (mastery_probability, confidence)."""
    new_mastery = max(0.0, min(1.0, new_mastery))
    new_confidence = max(0.0, min(1.0, new_confidence))
    if not existing:
        return new_mastery, new_confidence

    old_mastery = float(existing.get("mastery_probability") or 0)
    old_confidence = float(existing.get("confidence") or 0)
    total_weight = old_confidence + new_confidence
    if total_weight <= 0:
        combined_mastery = new_mastery
    else:
        combined_mastery = (old_mastery * old_confidence + new_mastery * new_confidence) / total_weight
    combined_confidence = min(1.0, old_confidence + new_confidence * (1 - old_confidence))
    return combined_mastery, combined_confidence


def _upsert_mastery(user_id: str, skill_id: str, mastery: float, confidence: float,
                     source: str, note: str = "", target_level: float | None = None) -> None:
    existing_r = (
        supabase_client.table("learner_skill_mastery")
        .select("mastery_probability, confidence, decay_version")
        .eq("user_id", user_id).eq("skill_id", skill_id).execute()
    )
    existing = existing_r.data[0] if existing_r.data else None
    combined_mastery, combined_confidence = _combine(existing, mastery, confidence)

    payload = {
        "user_id": user_id,
        "skill_id": skill_id,
        "mastery_probability": round(combined_mastery, 4),
        "confidence": round(combined_confidence, 4),
        "evidence_source": source,
        "evidence_note": note[:500],
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "decay_version": (existing.get("decay_version", 1) if existing else 1) + (1 if existing else 0),
    }
    if target_level is not None:
        payload["target_level"] = max(0.0, min(1.0, target_level))
    supabase_client.table("learner_skill_mastery").upsert(payload, on_conflict="user_id,skill_id").execute()


def _apply_topics(user_id: str, topics: list[dict], source: str) -> int:
    """Shared by resume/github/self-assessment: topics share the same shape
    {name, suggested_level|level, confidence_pct, evidence}. Returns how many
    skills were actually resolved+updated (never fabricates a mastery entry
    for a name that doesn't resolve to a real skill)."""
    updated = 0
    for t in topics or []:
        name = t.get("name")
        if not name:
            continue
        level_key = (t.get("suggested_level") or t.get("level") or "").lower()
        if level_key not in _LEVEL_TO_PROBABILITY:
            continue  # unrecognized level - never guess one
        skill_id = taxonomy_service.resolve_or_create_skill(name)
        if not skill_id:
            continue
        mastery = _LEVEL_TO_PROBABILITY[level_key]
        confidence_pct = t.get("confidence_pct")
        confidence = (confidence_pct / 100.0) if isinstance(confidence_pct, (int, float)) else _DEFAULT_CONFIDENCE_BY_SOURCE[source]
        _upsert_mastery(user_id, skill_id, mastery, confidence, source, note=t.get("evidence", ""))
        updated += 1
    return updated


def update_mastery_from_resume(user_id: str, topics: list[dict]) -> int:
    return _apply_topics(user_id, topics, "resume")


def update_mastery_from_github(user_id: str, topics: list[dict]) -> int:
    return _apply_topics(user_id, topics, "github")


def update_mastery_from_self_assessment(user_id: str, topic_ratings: list[dict]) -> int:
    return _apply_topics(user_id, topic_ratings, "self_assessment")


def update_mastery_from_completion(user_id: str, skill_tags: list[str]) -> int:
    """A learner actually finished a course tagged with these skills - real,
    but weak, positive evidence. Only ever RAISES a floor (a completed
    beginner course doesn't prove expert mastery, but it's honest evidence
    of at least basic competency) - never lowers an existing higher
    estimate."""
    updated = 0
    for tag in skill_tags or []:
        skill_id = taxonomy_service.resolve_or_create_skill(tag)
        if not skill_id:
            continue
        existing_r = (
            supabase_client.table("learner_skill_mastery")
            .select("mastery_probability").eq("user_id", user_id).eq("skill_id", skill_id).execute()
        )
        floor = 0.35
        if existing_r.data and existing_r.data[0]["mastery_probability"] >= floor:
            continue  # already at or above what a single completion would justify
        _upsert_mastery(user_id, skill_id, floor, _DEFAULT_CONFIDENCE_BY_SOURCE["completion"],
                         "completion", note="Completed a course covering this skill.")
        updated += 1
    return updated


def update_mastery_from_feedback(user_id: str, skill_tags: list[str], event_type: str) -> int:
    """'too_easy' feedback means the recommender UNDERESTIMATED this skill -
    real signal, nudges mastery up. 'too_hard' is the symmetric opposite -
    the recommender OVERESTIMATED this skill, real signal, nudges mastery
    down (never below 0, and never claims the learner has zero prior
    exposure - it's a correction to an estimate, not a reset). Other
    feedback event types (completed/not_interested) don't move mastery
    here - completion is handled by update_mastery_from_completion, and
    "not interested" says nothing about competency."""
    if event_type not in ("too_easy", "too_hard"):
        return 0
    delta = 0.15 if event_type == "too_easy" else -0.15
    note = (
        "Learner marked a step covering this skill as too easy."
        if event_type == "too_easy"
        else "Learner marked a step covering this skill as too hard."
    )
    updated = 0
    for tag in skill_tags or []:
        skill_id = taxonomy_service.resolve_or_create_skill(tag)
        if not skill_id:
            continue
        existing_r = (
            supabase_client.table("learner_skill_mastery")
            .select("mastery_probability").eq("user_id", user_id).eq("skill_id", skill_id).execute()
        )
        current = existing_r.data[0]["mastery_probability"] if existing_r.data else 0.4
        adjusted = max(0.0, min(1.0, float(current) + delta))
        _upsert_mastery(user_id, skill_id, adjusted, _DEFAULT_CONFIDENCE_BY_SOURCE["feedback"],
                         "feedback", note=note)
        updated += 1
    return updated


def get_mastery_map(user_id: str) -> dict[str, dict]:
    """{skill_id: {mastery_probability, confidence, evidence_source, observed_at}}
    for every skill this learner has real evidence for. Empty dict (never a
    fabricated default) if they have none yet."""
    rows = (
        supabase_client.table("learner_skill_mastery")
        .select("skill_id, mastery_probability, confidence, evidence_source, observed_at")
        .eq("user_id", user_id).execute()
    ).data or []
    return {r["skill_id"]: r for r in rows}


def get_mastery_by_name(user_id: str) -> dict[str, dict]:
    """Same as get_mastery_map but keyed by canonical_name (lowercased) -
    convenient for matching against course.skill_tags without an extra
    per-course join."""
    mastery = get_mastery_map(user_id)
    if not mastery:
        return {}
    skills = (
        supabase_client.table("skills").select("id, canonical_name")
        .in_("id", list(mastery.keys())).execute()
    ).data or []
    by_name = {}
    for s in skills:
        m = mastery.get(s["id"])
        if m:
            by_name[s["canonical_name"].lower()] = m
    return by_name


def find_unmet_prerequisites(user_id: str, skill_tags: list[str]) -> list[dict]:
    """For a course's real skill_tags, real skill_prerequisites edges (taxonomy_
    service.get_prerequisites) whose required_level the learner's current
    mastery doesn't meet - including "no evidence at all" (treated as 0).
    Used by 'too_hard' feedback to give an honest, specific reason
    ("this needed X, which you haven't shown evidence of yet") instead of a
    generic "here's an easier one." Returns [] when there's no real gap -
    never invents a missing prerequisite for a skill that has no edges."""
    mastery = get_mastery_map(user_id)
    seen_prereq_ids: set[str] = set()
    gaps: list[dict] = []
    for tag in skill_tags or []:
        skill_id = taxonomy_service.resolve_skill(tag)
        if not skill_id:
            continue
        for edge in taxonomy_service.get_prerequisites(skill_id):
            prereq_id = edge.get("prerequisite_skill_id")
            if not prereq_id or prereq_id in seen_prereq_ids:
                continue
            seen_prereq_ids.add(prereq_id)
            required = float(edge.get("required_level") or 0.5)
            current_entry = mastery.get(prereq_id)
            current = float(current_entry["mastery_probability"]) if current_entry else 0.0
            if current < required:
                gaps.append({
                    "prerequisite_skill_id": prereq_id,
                    "required_level": required,
                    "current_mastery": current if current_entry else None,
                })
    if not gaps:
        return []
    names = taxonomy_service.get_skill_names([g["prerequisite_skill_id"] for g in gaps])
    for g in gaps:
        g["name"] = names.get(g["prerequisite_skill_id"], "")
    return [g for g in gaps if g["name"]]  # drop any id that didn't resolve to a real name
