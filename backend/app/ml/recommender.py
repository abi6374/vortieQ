from app.ml.embedder import embed_text
from app.ml.retriever import retrieve_candidates

LEVEL_ORDER = {"beginner": 0, "intermediate": 1, "advanced": 2}


class Recommender:
    """
    Given a learner profile, returns an ordered and filtered list of courses.
    Strategy:
      1. Build a composite query from goal + interests + target role.
      2. Embed and retrieve top 20 candidates via pgvector.
      3. Re-rank: beginner learners see beginner/intermediate first,
         advanced learners see advanced first.
      4. Boost courses where all prerequisite tags are in the learner's
         interests (a good fit for their current knowledge).
      5. Deprioritize courses more than one level above the learner.
      6. Return the top 15.
    """

    def recommend(self, profile: dict) -> list[dict]:
        goal_text = profile.get("goal_text", "")
        target_role = profile.get("target_role", "")
        interests = profile.get("interests", [])
        current_level = profile.get("current_level", "beginner")
        completed = set(profile.get("completed_courses") or [])

        query = f"{goal_text} {target_role} {' '.join(interests)}"
        embedding = embed_text(query)
        candidates = retrieve_candidates(embedding, n=25)

        # Filter out courses the learner has already completed so we don't
        # recommend the same thing twice across paths.
        if completed:
            candidates = [c for c in candidates if c.get("id") not in completed]

        ranked = self._rerank(candidates, current_level, interests)
        return ranked[:15]

    def _rerank(self, candidates: list[dict], current_level: str, interests: list[str]) -> list[dict]:
        learner_level = LEVEL_ORDER.get(current_level, 0)
        interests_set = set(tag.lower() for tag in interests)

        scored = []
        for course in candidates:
            course_level = LEVEL_ORDER.get(course.get("difficulty", "beginner"), 0)
            level_diff = course_level - learner_level

            # Priority score: lower is better (sorted ascending)
            priority = 0.0

            # Penalize courses more than 1 level above the learner
            if level_diff > 1:
                priority += 10

            # Boost courses at the learner's level or one level above
            if level_diff == 0:
                priority -= 2
            elif level_diff == 1:
                priority -= 1

            # Boost if the course's prerequisites are a subset of the learner's interests
            prereqs = set(p.lower() for p in course.get("prerequisites", []))
            if prereqs and prereqs.issubset(interests_set):
                priority -= 2  # Good fit - learner already has the prerequisites

            # Boost by similarity score (higher similarity -> lower priority number)
            similarity = course.get("similarity", 0.0)
            priority -= similarity  # similarity is 0.0-1.0

            scored.append((priority, course))

        # Sort by priority score ascending (lowest = most relevant)
        scored.sort(key=lambda x: x[0])
        return [course for _, course in scored]


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
