"""Persistent, page-aware AI conversation.

One conversation row per user; every message (user + assistant) is stored, so
the thread survives navigation, reloads, and devices. This replaces the five
independent React-state chat implementations the frontend had.
"""

import json
from pathlib import Path as _Path

from app.config import supabase_client
from app.llm_client import chat_completion

MAX_HISTORY = 20  # messages of context sent to the LLM


def _load_prompt(name: str) -> str:
    return (_Path(__file__).parent.parent / "prompts" / name).read_text(encoding="utf-8")


# ── conversation plumbing ────────────────────────────────────────────────────
def get_or_create_conversation(user_id: str) -> str:
    """Idempotent, race-safe. ai_conversations has UNIQUE(user_id); two
    near-simultaneous first-load requests will both find no row and both try
    to INSERT — the second gets a unique-violation exception. Catch it and
    re-select instead of 500'ing."""
    existing = (
        supabase_client.table("ai_conversations").select("id").eq("user_id", user_id).limit(1).execute()
    )
    if existing.data:
        return existing.data[0]["id"]
    try:
        created = supabase_client.table("ai_conversations").insert({"user_id": user_id}).execute()
        if created.data:
            return created.data[0]["id"]
    except Exception as e:
        # Only swallow the race; log anything else so we still see it.
        msg = str(e).lower()
        if "duplicate" not in msg and "unique" not in msg and "23505" not in msg:
            print(f"[assistant] conversation insert failed: {type(e).__name__}: {e}", flush=True)
    # Fall through to re-select — whichever writer won, the row now exists.
    again = supabase_client.table("ai_conversations").select("id").eq("user_id", user_id).limit(1).execute()
    if again.data:
        return again.data[0]["id"]
    raise RuntimeError("Could not obtain a conversation for user")


def get_messages(user_id: str, limit: int = 100) -> list:
    convo_id = get_or_create_conversation(user_id)
    r = (
        supabase_client.table("ai_messages")
        .select("id, role, content, page_context, created_at")
        .eq("conversation_id", convo_id)
        .order("created_at")
        .limit(limit)
        .execute()
    )
    return r.data or []


def _add_message(convo_id: str, user_id: str, role: str, content: str, page_context: str = "") -> dict:
    r = supabase_client.table("ai_messages").insert({
        "conversation_id": convo_id,
        "user_id": user_id,
        "role": role,
        "content": content,
        "page_context": page_context or "",
    }).execute()
    return r.data[0] if r.data else {}


def clear_conversation(user_id: str) -> None:
    convo_id = get_or_create_conversation(user_id)
    supabase_client.table("ai_messages").delete().eq("conversation_id", convo_id).execute()


# ── learner context ──────────────────────────────────────────────────────────
def _build_learner_context(user_id: str) -> str:
    """Assemble the learner's real state so answers are grounded, not generic."""
    parts = []

    prof = (
        supabase_client.table("profiles")
        .select("goal_text, target_role, current_level, interests, weekly_hours, completed_courses")
        .eq("id", user_id).execute()
    )
    if prof.data:
        parts.append("LEARNER PROFILE:\n" + json.dumps(prof.data[0], indent=2, default=str))

    paths = (
        supabase_client.table("learning_paths")
        .select("id, goal_text, status").eq("user_id", user_id).eq("status", "active")
        .order("generated_at", desc=True).limit(1).execute()
    )
    if paths.data:
        path = paths.data[0]
        steps = (
            supabase_client.table("path_steps")
            .select("sequence_order, milestone_label, status, courses(title, provider, difficulty, duration_hrs, skill_tags)")
            .eq("path_id", path["id"]).order("sequence_order").execute()
        )
        simplified = [
            {
                "seq": s["sequence_order"],
                "milestone": s.get("milestone_label"),
                "status": s.get("status"),
                "title": (s.get("courses") or {}).get("title"),
                "difficulty": (s.get("courses") or {}).get("difficulty"),
                "hours": (s.get("courses") or {}).get("duration_hrs"),
            }
            for s in (steps.data or [])
        ]
        done = sum(1 for s in simplified if s["status"] == "completed")
        parts.append(
            f"ACTIVE PATH (goal: {path.get('goal_text','')}) — "
            f"{done}/{len(simplified)} steps complete:\n"
            + json.dumps(simplified, indent=2, default=str)
        )
    else:
        parts.append("ACTIVE PATH: none yet — the learner has not generated a roadmap.")

    return "\n\n".join(parts)


# ── main entry point ─────────────────────────────────────────────────────────
def ask(user_id: str, question: str, page_context: str = "") -> dict:
    """Append the learner's question, answer it grounded on their real state,
    persist the answer, and return both messages."""
    if not (question or "").strip():
        raise ValueError("Message cannot be empty")

    convo_id = get_or_create_conversation(user_id)
    user_msg = _add_message(convo_id, user_id, "user", question.strip(), page_context)

    history = get_messages(user_id, limit=MAX_HISTORY)
    learner_context = _build_learner_context(user_id)

    messages = [{"role": "system", "content": _load_prompt("assistant.txt")}]
    messages.append({
        "role": "system",
        "content": (
            f"{learner_context}\n\n"
            f"The learner is currently on the '{page_context or 'app'}' page. "
            "Answer using their real path and profile above. If something isn't in "
            "that context, say so plainly instead of inventing it."
        ),
    })
    # Prior turns (excluding the one we just inserted, which we append last)
    for m in history[:-1][-MAX_HISTORY:]:
        messages.append({"role": m["role"], "content": m["content"]})
    messages.append({"role": "user", "content": question.strip()})

    try:
        answer = chat_completion(messages, max_tokens=1500, temperature=0.3)
    except Exception as e:
        print(f"[assistant] LLM call failed: {type(e).__name__}: {e}", flush=True)
        raise RuntimeError("PathFinder is temporarily unavailable. Please try again.")

    if not answer:
        answer = "I couldn't generate a response just then. Could you rephrase the question?"

    assistant_msg = _add_message(convo_id, user_id, "assistant", answer, page_context)
    supabase_client.table("ai_conversations").update({"updated_at": "now()"}).eq("id", convo_id).execute()

    return {"user_message": user_msg, "assistant_message": assistant_msg, "answer": answer}
