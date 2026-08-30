"""Canonical skills taxonomy resolution.

Maps free-text skill mentions (course skill_tags, resume-extracted topics,
GitHub-derived topics, self-assessment entries, learner interests) onto ONE
canonical skill_id via the skill_aliases table (migration 006/010) - so
"JavaScript", "javascript", and "js" are recognized as the same skill
instead of silently producing disconnected signals. This is also the
enforcement point for "an interest is not competency": resolving a skill
name only ever returns an identity (skill_id) - it never itself asserts a
mastery level. Only mastery_service writes mastery_probability, and always
from an explicit evidence_source.
"""

import re

from app.config import supabase_client

_WS_RE = re.compile(r"\s+")


def normalize(text: str) -> str:
    """Lowercase + collapse whitespace - the same normalization aliases are
    stored under, so lookups are a plain equality match."""
    return _WS_RE.sub(" ", (text or "").strip().lower())


_alias_cache: dict[str, str | None] | None = None


def _load_alias_cache() -> dict[str, str | None]:
    global _alias_cache
    if _alias_cache is None:
        rows = supabase_client.table("skill_aliases").select("alias, skill_id").execute().data or []
        _alias_cache = {r["alias"]: r["skill_id"] for r in rows}
    return _alias_cache


def invalidate_cache() -> None:
    """Call after inserting a new skill/alias in the same process (tests,
    or a future admin-facing taxonomy-editing endpoint)."""
    global _alias_cache
    _alias_cache = None


def resolve_skill(text: str) -> str | None:
    """Returns the canonical skill_id for a free-text mention, or None if it
    doesn't match any known alias. Deliberately does NOT fabricate a new
    skill on every miss - see resolve_or_create_skill for the ingestion path
    that's allowed to grow the taxonomy."""
    key = normalize(text)
    if not key:
        return None
    return _load_alias_cache().get(key)


def resolve_or_create_skill(text: str) -> str | None:
    """Like resolve_skill, but if no existing skill/alias matches, creates a
    new canonical skill (using the input text, title-cased, as its
    canonical_name) and aliases it under the normalized text. Used only by
    ingestion paths that are ALREADY working with real, external evidence
    (a course's own skill_tags, a resume's extracted topics, a GitHub
    repo's detected languages) - this grows the taxonomy to cover real
    skills it doesn't have yet, it does not fabricate mastery data."""
    key = normalize(text)
    if not key:
        return None
    existing = resolve_skill(key)
    if existing:
        return existing

    canonical_name = key.title()
    try:
        existing_skill = (
            supabase_client.table("skills").select("id").eq("canonical_name", canonical_name).execute()
        )
        if existing_skill.data:
            skill_id = existing_skill.data[0]["id"]
        else:
            created = supabase_client.table("skills").insert({"canonical_name": canonical_name}).execute()
            if not created.data:
                return None
            skill_id = created.data[0]["id"]

        supabase_client.table("skill_aliases").upsert(
            {"skill_id": skill_id, "alias": key}, on_conflict="alias"
        ).execute()
        invalidate_cache()
        return skill_id
    except Exception as e:
        print(f"[taxonomy_service] resolve_or_create_skill failed for {text!r}: {type(e).__name__}: {e}", flush=True)
        return None


def resolve_many(texts: list[str], create_missing: bool = False) -> dict[str, str]:
    """Batch version. Returns {original_text: skill_id} for every text that
    resolved (misses are simply absent from the result - never fabricated)."""
    out = {}
    for t in texts or []:
        skill_id = resolve_or_create_skill(t) if create_missing else resolve_skill(t)
        if skill_id:
            out[t] = skill_id
    return out


def get_prerequisites(skill_id: str) -> list[dict]:
    """Real prerequisite edges for a skill: [{prerequisite_skill_id, required_level}, ...]."""
    r = (
        supabase_client.table("skill_prerequisites")
        .select("prerequisite_skill_id, required_level")
        .eq("skill_id", skill_id)
        .execute()
    )
    return r.data or []


def get_skill_names(skill_ids: list[str]) -> dict[str, str]:
    """{skill_id: canonical_name} for the given ids - any id that doesn't
    resolve is simply absent from the result (never a fabricated label).
    Used to turn a prerequisite-gap UUID into human-readable text for an
    honest reason_for_change message."""
    ids = [i for i in dict.fromkeys(skill_ids or []) if i]
    if not ids:
        return {}
    r = supabase_client.table("skills").select("id, canonical_name").in_("id", ids).execute()
    return {row["id"]: row["canonical_name"] for row in (r.data or [])}
