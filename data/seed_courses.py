"""
Seeds data/courses_raw.csv into the Supabase `courses` table, embedding each
course with the same embed_text() used at query time (backend/app/ml/embedder.py).

Run from the repo root:
    backend/venv/Scripts/python.exe data/seed_courses.py            # seed + verify
    backend/venv/Scripts/python.exe data/seed_courses.py --verify   # verify only
"""
import csv
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).parent.parent
load_dotenv(REPO_ROOT / "backend" / ".env")

from supabase import create_client

# Import embed_text from the backend app without installing it as a package.
sys.path.insert(0, str(REPO_ROOT / "backend"))
from app.ml.embedder import embed_text  # noqa: E402

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def seed_courses(csv_path: str = None) -> None:
    csv_path = csv_path or str(REPO_ROOT / "data" / "courses_raw.csv")
    seeded = 0
    skipped = 0

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            title = row["title"].strip()

            # Check if already exists (safe to re-run)
            existing = supabase.table("courses").select("id").eq("title", title).execute()
            if existing.data:
                print(f"  SKIP (exists): {title}")
                skipped += 1
                continue

            skill_tags = [s.strip() for s in row["skill_tags"].split(";") if s.strip()]
            prerequisites = [p.strip() for p in row["prerequisites"].split(";") if p.strip()]

            # Embedding input mirrors how a learner query is built at retrieval time
            embed_input = f"{title}. {row['description'].strip()} Skills: {', '.join(skill_tags)}"
            embedding = embed_text(embed_input)

            supabase.table("courses").insert({
                "title": title,
                "description": row["description"].strip(),
                "provider": row["provider"].strip(),
                "skill_tags": skill_tags,
                "difficulty": row["difficulty"].strip(),
                "duration_hrs": int(row["duration_hrs"]),
                "prerequisites": prerequisites,
                "resource_url": row["resource_url"].strip(),
                "embedding": embedding,
            }).execute()

            print(f"  OK  Seeded: {title}")
            seeded += 1

    print(f"\nDone. Seeded: {seeded}, Skipped: {skipped}, Total: {seeded + skipped}")


def verify_retrieval() -> None:
    print("\nVerification - top 5 matches for 'learn python for data science':")
    test_embedding = embed_text("learn python for data science machine learning")
    result = supabase.rpc("match_courses", {
        "query_embedding": test_embedding,
        "match_count": 5,
    }).execute()
    for i, course in enumerate(result.data or [], 1):
        print(f"  {i}. [{course['similarity']:.3f}] {course['title']} ({course['difficulty']})")


if __name__ == "__main__":
    if "--verify" in sys.argv:
        verify_retrieval()
    else:
        seed_courses()
        verify_retrieval()
