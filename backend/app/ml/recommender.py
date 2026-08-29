from app.ml.embedder import embed_text
from app.ml.retriever import retrieve_candidates
from app.ml import ranking_engine
from app.services import mastery_service

LEVEL_ORDER = {"beginner": 0, "intermediate": 1, "advanced": 2}


class Recommender:
    """
    Given a learner profile, returns an ordered and filtered list of courses.

    Strategy:
      1. Build a composite query from goal + interests + target role, embed
         it, and retrieve candidates via pgvector (this stage IS a real
         relevance signal - kept as-is).
      2. Hard-filter out anything already completed or explicitly disliked
         (see ranking_engine.hard_filter).
      3. Score every eligible candidate with ranking_engine's deterministic,
         explainable, versioned formula - using the learner's REAL per-skill
         mastery (learner_skill_mastery, built from resume/GitHub/
         self-assessment/feedback evidence) instead of one global
         current_level, and REAL skill_prerequisites edges instead of
         treating "interested in X" as "has X's prerequisites" (both real,
         confirmed fixes - see ranking_engine.py's module docstring).
    """

    def recommend(self, profile: dict) -> list[dict]:
        goal_text = profile.get("goal_text", "")
        target_role = profile.get("target_role", "")
        interests = profile.get("interests", [])
        completed = set(profile.get("completed_courses") or [])
        user_id = profile.get("id")

        query = f"{goal_text} {target_role} {' '.join(interests)}"
        embedding = embed_text(query)
        candidates = retrieve_candidates(embedding, n=30)

        eligible, filter_reasons = ranking_engine.hard_filter(candidates, completed)

        mastery_by_name = mastery_service.get_mastery_by_name(user_id) if user_id else {}
        mastery_by_id = mastery_service.get_mastery_map(user_id) if user_id else {}

        weekly_hours = profile.get("weekly_hours")
        scored = ranking_engine.score_candidates(
            eligible, profile, mastery_by_name, mastery_by_id,
            weekly_hours_remaining=float(weekly_hours) if weekly_hours else None,
        )
        ranked = [item["course"] for item in scored]

        # 20, not 15: a real learner request ("more courses recommended")
        # showed the LLM sequencer tends to pick close to the low end of its
        # allowed range - handing it more real, well-ranked candidates gives
        # a fuller path even when it doesn't use every single one.
        top = ranked[:20]

        if user_id:
            ranking_engine.persist_recommendation_run(
                user_id=user_id, path_id=None, trigger="path_generate",
                profile=profile, candidates=candidates, hard_filter_reasons=filter_reasons,
                scored=scored, final_course_ids=[c["id"] for c in top if c.get("id")],
            )
        return top


if __name__ == "__main__":
    rec = Recommender()
    test_profile = {
        "goal_text": "I want to become a data scientist",
        "target_role": "Data Scientist",
        "current_level": "beginner",
        "interests": ["python", "statistics", "data analysis"],
        "weekly_hours": 10,
    }
    results = rec.recommend(test_profile)
    print(f"Recommendations for beginner data scientist ({len(results)} courses):")
    for i, course in enumerate(results[:5], 1):
        print(f"  {i}. {course['title']} ({course['difficulty']}) [{course.get('similarity', 0):.3f}]")
    assert len(results) > 0
    print("OK - Recommender works")
