"""Deterministic, explainable, versioned recommendation scoring.

Replaces Recommender._rerank()'s ad-hoc scoring - two real, confirmed audit
findings this fixes directly:
  1. Scoring only ever used ONE global `current_level` - a learner's real
     per-skill mastery (learner_skill_mastery, built from resume/GitHub/
     self-assessment/feedback evidence - see mastery_service.py) was stored
     but never consulted, so 95% Python confidence didn't stop beginner
     Python content from being recommended.
  2. "Course prerequisites subset of learner interests" was used as a proxy
     for "learner has the prerequisites" - being INTERESTED in Docker was
     silently read as HAVING Docker competency. Real prerequisites_met now
     checks actual skill_prerequisites edges against actual
     learner_skill_mastery rows.

Every score is a named, explicit, weighted feature - not a black box - so a
caller can persist a real recommendation_runs/recommendation_explanations
row (see persist_recommendation_run) showing exactly why each course did or
didn't get picked. SCORING_VERSION + WEIGHTS are versioned together:
changing the formula means bumping the version, so past runs stay
interpretable against the weights that actually produced them.
"""

import hashlib
import json

from app.config import supabase_client
from app.services import taxonomy_service

SCORING_VERSION = "v1.1-deterministic"

LEVEL_ORDER = {"beginner": 0, "intermediate": 1, "advanced": 2}
_LEVEL_NAMES = ["beginner", "intermediate", "advanced"]

WEIGHTS = {
    "relevance": 2.5,            # pgvector cosine similarity to goal/interests (from retrieval)
    "skill_gap_coverage": 2.0,   # covers skills the learner has LOW real mastery in
    "goal_alignment": 1.5,       # tag overlap with explicit interests/target role
    "difficulty_fit": 1.5,       # course level vs. REAL per-skill mastery, not one global level
    "prerequisites_met": 2.0,    # real skill_prerequisites edges satisfied by real mastery
    "format_preference": 0.5,    # neutral (0.5) when format isn't tracked for this course - never guessed
    # v1.1: 0.5 -> 1.5. A real learner with a very low weekly_hours budget
    # (e.g. 2h/week) was still getting recommended the same long courses as
    # everyone else, which the hour-based week-packer then had no choice but
    # to split into dozens of tiny weekly slivers (a 22h course became 11
    # separate weeks). At 0.5 with the old formula's narrow [0.2, 1.0]
    # output range, time_fit could never meaningfully outweigh relevance/
    # skill-gap/prerequisites even when it should - see the widened
    # _time_fit_score below for the other half of this fix.
    "time_fit": 1.5,             # duration vs. remaining weekly-hour budget
    "quality_freshness": 1.0,    # verified/available + real recency
    "diversity": 0.5,            # penalizes repeating an already-well-covered skill in THIS batch
}
# Negative weights are hard-filter territory (see hard_filter) rather than
# continuous penalties: a completed/disliked/unavailable course is EXCLUDED,
# not merely down-ranked - a wrong recommendation shown at position 20
# instead of position 1 is still a wrong recommendation.


def _mastery_to_level(mastery_probability: float) -> str:
    if mastery_probability >= 0.7:
        return "advanced"
    if mastery_probability >= 0.4:
        return "intermediate"
    return "beginner"


def _time_fit_score(duration_hrs: float, weekly_hours_remaining: float | None) -> float:
    """How well a course's real duration fits a learner's real weekly-hour
    budget. v1.1: widened from a narrow [0.2, 1.0] range to a real [0.0, 1.0]
    spread - the old floor of 0.2 for even a wildly-mismatched course (e.g. a
    22h course against a 2h/week budget) meant this feature could never
    meaningfully outweigh relevance/skill-gap/prerequisites even at a higher
    weight. Courses that fit within roughly half a week's budget are
    rewarded as ideal; the hour-based week-packer (roadmap_service.
    plan_weeks_with_splits) still correctly splits anything longer across
    multiple weeks regardless of this score - this only shapes which
    courses get SELECTED in the first place, so a learner with little
    weekly time is steered toward shorter real content instead of the same
    long courses everyone else gets, which used to turn into dozens of
    tiny split parts."""
    if not weekly_hours_remaining or weekly_hours_remaining <= 0:
        return 0.5  # unknown budget - neutral, not fabricated
    ratio = duration_hrs / weekly_hours_remaining
    if ratio <= 0.5:
        return 1.0
    if ratio <= 1:
        return 0.8
    if ratio <= 2:
        return 0.4
    if ratio <= 4:
        return 0.15
    return 0.0


def input_snapshot_hash(profile: dict, candidate_ids: list[str]) -> str:
    """Deterministic hash of what went into a scoring run - lets
    recommendation_runs prove two runs used the same real inputs (or
    prove they didn't) without storing the full profile blob twice."""
    payload = json.dumps({
        "goal_text": profile.get("goal_text", ""),
        "target_role": profile.get("target_role", ""),
        "interests": sorted(profile.get("interests") or []),
        "weekly_hours": profile.get("weekly_hours"),
        "candidate_ids": sorted(candidate_ids),
    }, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()[:16]


def hard_filter(candidates: list[dict], completed_ids: set[str],
                 disliked_ids: set[str] | None = None) -> tuple[list[dict], dict[str, str]]:
    """Rejects invalid candidates OUTRIGHT before any scoring - never just
    down-ranked. Returns (eligible, {course_id: reason} for rejected).

    Real production gap this closes: catalog_service already rejected a
    search-engine-results URL (e.g. "google.com/search?q=...") at
    INGESTION time for any newly web-searched/YouTube-sourced resource -
    but that check never ran against the ORIGINAL seed-era `courses` rows
    (source='seed', inserted before this validation module existed, never
    independently re-checked since). Those rows flow through the exact
    same recommender both generate_path() (initial path creation) and
    swap_step/swap_step_with_preference use, so this filter is the one
    place both flows are guaranteed to share - applying the URL check
    HERE, on every real candidate regardless of source or age, is what
    actually closes the gap rather than only guarding new ingestions
    while old ones keep slipping through generate_path().
    """
    from app.services.catalog_service import is_search_results_url

    disliked_ids = disliked_ids or set()
    eligible = []
    reasons: dict[str, str] = {}
    for c in candidates:
        cid = c.get("id")
        if cid in completed_ids:
            reasons[cid] = "already_completed"
            continue
        if cid in disliked_ids:
            reasons[cid] = "learner_marked_not_interested"
            continue
        if c.get("availability_status") == "unavailable":
            reasons[cid] = "resource_unavailable"
            continue
        if is_search_results_url(c.get("resource_url") or ""):
            reasons[cid] = "resource_url_is_a_search_results_page"
            continue
        eligible.append(c)
    return eligible, reasons


def _skill_gap_and_prereqs(course: dict, mastery_by_name: dict, mastery_by_id: dict) -> tuple[float, float, str]:
    """Returns (skill_gap_coverage, prerequisites_met, difficulty_fit_level)
    for one course, using REAL learner_skill_mastery + skill_prerequisites -
    never the "interest == competency" shortcut this replaces.

    Two mastery lookups are needed: mastery_by_name (keyed by lowercased
    canonical_name) to match a course's own skill_tags text, and
    mastery_by_id (keyed by skill_id/UUID) because skill_prerequisites edges
    reference the prerequisite by id, not name.
    """
    tags = course.get("skill_tags") or []
    if not tags:
        return 0.0, 1.0, "beginner"  # nothing to gap-check or gate on

    gaps = []
    prereq_checks = []
    masteries = []
    for tag in tags:
        m = mastery_by_name.get(tag.lower())
        mastery_prob = float(m["mastery_probability"]) if m else 0.0
        masteries.append(mastery_prob)
        gaps.append(1.0 - mastery_prob)

        skill_id = taxonomy_service.resolve_skill(tag)
        if not skill_id:
            continue
        for edge in taxonomy_service.get_prerequisites(skill_id):
            prereq_m = mastery_by_id.get(edge["prerequisite_skill_id"])
            required = float(edge["required_level"])
            have = float(prereq_m["mastery_probability"]) if prereq_m else 0.0
            prereq_checks.append(have >= required)

    avg_gap = sum(gaps) / len(gaps) if gaps else 0.0
    prereqs_met = (sum(1 for p in prereq_checks if p) / len(prereq_checks)) if prereq_checks else 1.0
    avg_mastery = sum(masteries) / len(masteries) if masteries else 0.0
    return avg_gap, prereqs_met, _mastery_to_level(avg_mastery)


def score_candidates(
    eligible: list[dict],
    profile: dict,
    mastery_by_name: dict,
    mastery_by_id: dict | None = None,
    weekly_hours_remaining: float | None = None,
) -> list[dict]:
    """Returns eligible courses annotated with total_score + feature_scores,
    sorted descending. Diversity is applied as a post-pass (greedy MMR-style
    re-ranking) so the top of the list doesn't collapse into five near-
    duplicate courses on the learner's single strongest skill."""
    mastery_by_id = mastery_by_id or {}
    interests = set((i or "").lower() for i in (profile.get("interests") or []))
    target_role_words = set((profile.get("target_role") or "").lower().split())
    goal_words = set((profile.get("goal_text") or "").lower().split())
    alignment_vocab = interests | target_role_words | goal_words

    scored = []
    for course in eligible:
        tags = [t.lower() for t in (course.get("skill_tags") or [])]
        relevance = float(course.get("similarity") or 0.0)

        skill_gap, prereqs_met, expected_level = _skill_gap_and_prereqs(course, mastery_by_name, mastery_by_id)

        overlap = len(set(tags) & alignment_vocab)
        goal_alignment = overlap / max(len(tags), 1) if tags else 0.0

        course_level = course.get("difficulty", "beginner")
        level_gap = abs(LEVEL_ORDER.get(course_level, 0) - LEVEL_ORDER.get(expected_level, 0))
        difficulty_fit = {0: 1.0, 1: 0.5}.get(level_gap, 0.0)

        duration = float(course.get("duration_hrs") or 0)
        time_fit = _time_fit_score(duration, weekly_hours_remaining)

        availability = course.get("availability_status")
        if availability == "available":
            quality_freshness = 1.0
        elif availability == "stale":
            quality_freshness = 0.3
        elif availability is None:
            quality_freshness = 0.7  # seed data: curated but not live-verified
        else:
            quality_freshness = 0.5

        format_preference = 0.5  # neutral: courses table has no tracked format for seed rows

        features = {
            "relevance": relevance,
            "skill_gap_coverage": skill_gap,
            "goal_alignment": goal_alignment,
            "difficulty_fit": difficulty_fit,
            "prerequisites_met": prereqs_met,
            "format_preference": format_preference,
            "time_fit": time_fit,
            "quality_freshness": quality_freshness,
        }
        total = sum(WEIGHTS[k] * v for k, v in features.items())
        scored.append({"course": course, "feature_scores": features, "total_score": total})

    scored.sort(key=lambda s: s["total_score"], reverse=True)
    return _apply_diversity(scored)


def _apply_diversity(scored: list[dict]) -> list[dict]:
    """Greedy re-rank: once a skill has been well-represented by
    higher-ranked picks, further courses covering ONLY that same skill drop
    slightly, so the batch doesn't collapse into near-duplicates. Does not
    reorder across a large score gap - diversity breaks ties among similar
    candidates, it doesn't override a clearly better-fit course."""
    if len(scored) <= 1:
        return scored
    covered: dict[str, int] = {}
    result = []
    remaining = list(scored)
    while remaining:
        def adjusted(item):
            tags = [t.lower() for t in (item["course"].get("skill_tags") or [])]
            redundancy = sum(min(covered.get(t, 0), 2) for t in tags) / max(len(tags), 1)
            return item["total_score"] - WEIGHTS["diversity"] * redundancy

        remaining.sort(key=adjusted, reverse=True)
        picked = remaining.pop(0)
        result.append(picked)
        for t in (picked["course"].get("skill_tags") or []):
            covered[t.lower()] = covered.get(t.lower(), 0) + 1
    return result


def persist_recommendation_run(
    user_id: str, path_id: str | None, trigger: str, profile: dict,
    candidates: list[dict], hard_filter_reasons: dict[str, str],
    scored: list[dict], final_course_ids: list[str],
) -> str | None:
    """Real audit trail: what was considered, why anything was rejected
    outright, every feature score, the weights/version that produced them,
    and what was finally chosen. Best-effort (never blocks a real
    recommendation on a logging failure)."""
    try:
        run = supabase_client.table("recommendation_runs").insert({
            "user_id": user_id,
            "path_id": path_id,
            "trigger": trigger,
            "input_snapshot_hash": input_snapshot_hash(profile, [c.get("id") for c in candidates]),
            "candidate_course_ids": [c.get("id") for c in candidates],
            "hard_filter_reasons": hard_filter_reasons,
            "scoring_version": SCORING_VERSION,
            "weights": WEIGHTS,
            "final_course_ids": final_course_ids,
        }).execute()
        if not run.data:
            return None
        run_id = run.data[0]["id"]

        explanations = [
            {
                "recommendation_run_id": run_id,
                "course_id": item["course"]["id"],
                "rank": rank,
                "total_score": item["total_score"],
                "feature_scores": item["feature_scores"],
                "selected": item["course"]["id"] in final_course_ids,
            }
            for rank, item in enumerate(scored, start=1)
            if item["course"].get("id")
        ]
        if explanations:
            supabase_client.table("recommendation_explanations").insert(explanations).execute()
        return run_id
    except Exception as e:
        print(f"[ranking_engine] failed to persist recommendation run: {type(e).__name__}: {e}", flush=True)
        return None
