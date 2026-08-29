"""Deterministic prerequisite validation for LLM-generated milestone
groupings - "course sequencing is mostly delegated to an LLM after
retrieval, without deterministic prerequisite graph validation" from the
audit ("LLM can produce incoherent ordering or omit critical skills").

This does not replace the LLM's grouping/labeling or invent new course
choices - course_ids are already validated against the real candidate list
upstream (path_service.generate_path drops any hallucinated id). What this
adds is a deterministic REPAIR pass: if the LLM's proposed order puts a
course needing skill X before the course that teaches skill X (a real
skill_prerequisites edge, both courses already in THIS generated path), the
sequence is reordered so the teaching course comes first. A prerequisite
that isn't taught anywhere in this specific path is left alone - reordering
can't fix a prerequisite this path never covers; that's an honest limit,
not something to silently paper over.
"""

from app.services import taxonomy_service

_MAX_REPAIR_PASSES = 5  # bounded - never loop indefinitely on a pathological/cyclic graph


def _skill_ids_for_course(course: dict) -> set[str]:
    ids = set()
    for tag in course.get("skill_tags") or []:
        sid = taxonomy_service.resolve_skill(tag)
        if sid:
            ids.add(sid)
    return ids


def validate_and_reorder(milestones: list[dict], course_lookup: dict) -> tuple[list[dict], list[str]]:
    """milestones: LLM-proposed [{label, course_ids: [...], ...}, ...],
    course_ids already filtered to real candidates. course_lookup:
    {course_id: course_dict}. Returns (possibly-reordered milestones,
    violation notes for logging/audit - never surfaced to the learner as an
    error; this is a self-healing correction, not a failure).
    """
    flat: list[str] = [cid for m in milestones for cid in m.get("course_ids", []) if cid in course_lookup]
    if len(flat) < 2:
        return milestones, []

    teaches: dict[str, set[str]] = {cid: _skill_ids_for_course(course_lookup[cid]) for cid in flat}
    needs: dict[str, set[str]] = {}
    for cid in flat:
        req: set[str] = set()
        for sid in teaches[cid]:
            for edge in taxonomy_service.get_prerequisites(sid):
                req.add(edge["prerequisite_skill_id"])
        needs[cid] = req

    violations: list[str] = []
    position = {cid: i for i, cid in enumerate(flat)}
    changed = True
    passes = 0
    while changed and passes < _MAX_REPAIR_PASSES:
        changed = False
        passes += 1
        for cid in list(flat):
            for req_skill in needs[cid]:
                providers = [c for c in flat if req_skill in teaches[c] and c != cid]
                if not providers:
                    continue  # not taught anywhere in this path - nothing reordering can fix
                earliest_provider = min(providers, key=lambda c: position[c])
                if position[earliest_provider] > position[cid]:
                    violations.append(
                        f"course {cid} needs skill {req_skill}, only taught later by {earliest_provider} - reordered earlier"
                    )
                    flat.remove(earliest_provider)
                    flat.insert(position[cid], earliest_provider)
                    position = {c: i for i, c in enumerate(flat)}
                    changed = True
                    break
            if changed:
                break

    # Re-thread the (possibly reordered) flat sequence back into milestone
    # groupings, preserving each milestone's own label/estimated_weeks and
    # course COUNT, but reflecting the corrected global order.
    reordered_milestones = []
    idx = 0
    for m in milestones:
        n = len([cid for cid in m.get("course_ids", []) if cid in course_lookup])
        reordered_milestones.append({**m, "course_ids": flat[idx: idx + n]})
        idx += n
    return reordered_milestones, violations
