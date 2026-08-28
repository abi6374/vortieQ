# README2 — ML Module Guide (Member 2)

> **Audience:** Member 2 (ML Engineer). This is the single reference for everything
> ML in vortieQ — what exists, the contract you must not break, how the rest of the
> backend consumes your code, and where the good improvement work is.
>
> Read this alongside `MASTER_README_part1.md` §5.2 (the ML interface contract) and
> §13 (DB schema). This file is ML-specific and kept current as the ML surface changes.

---

## 1. What the ML module owns

You own `backend/app/ml/` **exclusively**. Four files, one contract:

```
backend/app/ml/
├── embedder.py      embed_text(text) -> list[float]        (384-dim, L2-normalized)
├── retriever.py     retrieve_candidates(embedding, n) -> list[dict]
├── recommender.py   class Recommender: recommend(profile) -> list[dict]
└── registry.py      get_recommender() -> Recommender       (singleton factory)
```

Plus the data pipeline you own in `data/`:

```
data/
├── courses_raw.csv   80-course source dataset (the resource library)
├── seed_courses.py   embeds every course + upserts into Supabase `courses`
└── schema.sql        DB schema (shared; the match_courses RPC is the ML-relevant part)
```

**Rule:** the four function/class signatures in §2 are a contract. Backend services
(`path_service`, `feedback_service`) import and call them. Change the *implementation*
freely; do **not** change the *signatures* without telling Member 1, or path
generation and swap break.

---

## 2. The interface contract (do not change signatures)

```python
# embedder.py
def embed_text(text: str) -> list[float]:
    """384-float list using all-MiniLM-L6-v2. L2 normalized."""

# retriever.py
def retrieve_candidates(embedding: list[float], n: int = 15) -> list[dict]:
    """Calls Supabase match_courses RPC. Sorted by similarity desc.
       Each dict: id, title, description, provider, skill_tags, difficulty,
                  duration_hrs, prerequisites, resource_url, similarity"""

# recommender.py
class Recommender:
    def recommend(self, profile: dict) -> list[dict]:
        """profile keys: goal_text, target_role, current_level, interests,
           weekly_hours, completed_courses (optional), topic_ratings (optional).
           Returns up to 15 course dicts, re-ranked for the learner."""

# registry.py
def get_recommender() -> Recommender:
    """Singleton factory. Swap the implementation here for model upgrades."""
```

The `profile` dict handed to `recommend()` is a row from the Supabase `profiles`
table plus whatever the caller adds. **Newer keys you should be aware of:**

| key | type | added by | meaning |
|-----|------|----------|---------|
| `completed_courses` | `list[str]` (course UUIDs) | feedback "Mark Done" | courses the learner finished — filter these OUT |
| `topic_ratings` | `list[{name, level, evidence}]` | resume Assess-Skills step | per-topic self-rated levels (basic/intermediate/advanced/expert) |
| `detected_years_experience` | `int` | resume extraction | total years from the resume |

---

## 3. Current implementation state (all live & verified)

### 3.1 embedder.py — DONE
- `sentence-transformers` `all-MiniLM-L6-v2`, loaded ONCE at module import (not per call).
- Returns 384 floats, L2-normalized (so cosine == dot product in pgvector).
- Self-test: `python -m app.ml.embedder` → prints 384 dims, magnitude 1.000000.

### 3.2 retriever.py — DONE
- Calls the Supabase `match_courses` RPC via `app.config.supabase_client`.
- **IMPORTANT RPC CHANGE (already applied to the live DB):** `match_courses` now
  returns `provider` in its column list. The original `schema.sql` omitted it, so
  every recommended course came back with an empty provider. The fix is a migration
  named `add_provider_to_match_courses` and `data/schema.sql` is updated to match.
  If you ever re-run the schema from scratch, make sure your copy has `provider` in
  both the `RETURNS TABLE (...)` and the `SELECT`.
- Self-test: `python -m app.ml.retriever` → "React web development" → top hit
  `React.js Fundamentals` (~0.687).

### 3.3 recommender.py — DONE (with room to improve, see §5)
Current strategy in `recommend()`:
1. Build a composite query: `goal_text + target_role + interests`.
2. `embed_text(query)` → retrieve top **25** candidates.
3. **Filter out `completed_courses`** (so a finished course never re-appears).
4. `_rerank()` scores each candidate (lower = better):
   - `+10` penalty if course is >1 level above the learner (too hard)
   - `-2` if course level == learner level; `-1` if exactly one level above
   - `-2` if the course's prerequisites ⊆ the learner's interests (good fit)
   - `-similarity` (0–1) so more-similar courses rank higher
5. Return the top **15**.

Self-test: `python -m app.ml.recommender` → prints 5 ranked courses for a beginner
Data Scientist profile.

### 3.4 registry.py — DONE
Simple singleton. This is the swap point for a future model.

### 3.5 Data pipeline — DONE
- 80 courses seeded live into `omnhtvxuvjnimokwqtje.supabase.co` (0 skipped).
- Categories: Data Science/ML, Web Dev, Cloud/DevOps, Product/Business Tech (20 each).
- Re-run with `python data/seed_courses.py` (needs `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`).

---

## 4. How the rest of the backend consumes your ML code

You are no longer only feeding initial path generation. Three call sites now depend
on `recommend()`:

1. **`path_service.generate_path()`** — original flow. Calls `get_recommender().recommend(profile)`,
   passes candidates to Groq to sequence into milestones.

2. **`path_service.swap_step()`** — NEW. When a learner clicks "Too Easy" or "Swap"
   on a single step, this calls `recommend()`, then picks ONE alternative using a
   local `_score_alternative()` (Jaccard overlap on `skill_tags` × 3 + difficulty
   match × 2 + similarity). It excludes courses already in the path, completed
   courses, and the skipped course itself. **If you improve ranking, know that swap
   quality depends on `recommend()` returning a diverse enough top-15** — if the list
   is too narrow, swap runs out of alternatives and returns "no alternative available".

3. **`feedback_service`** — "Too Easy"/"Swap" delegate to `swap_step`; "Mark Done"
   appends to `completed_courses` which then feeds back into `recommend()`'s filter.

**Implication for you:** ranking quality now affects both first-path quality AND swap
quality. A recommender that returns 15 near-duplicates makes swap useless.

---

## 5. Where the good ML work is (open improvements)

Ranked by impact. None of these are required for the demo to work — they make it better.

### 5.1 Use `topic_ratings` in re-ranking (HIGH impact, currently ignored)
The resume Assess-Skills step now produces per-topic levels, e.g.
`[{name:"Python", level:"advanced"}, {name:"SQL", level:"basic"}]`. Right now
`recommend()` only reads the single global `current_level`. **A learner who is
advanced in Python but basic in SQL should get advanced Python courses AND basic
SQL courses in the same path.** Re-rank per-candidate against the matching topic's
level instead of the global level. This is the single biggest win available.

### 5.2 Diversity / MMR in the top-15 (MEDIUM — helps swap)
Add a diversity penalty so the top-15 isn't 10 flavors of the same course. Maximal
Marginal Relevance (down-weight a candidate that's too similar to ones already
picked) directly improves swap alternatives.

### 5.3 Weight recency / provider quality (LOW–MEDIUM)
`courses` has `provider` and `duration_hrs`. Consider a light preference for shorter
courses when `weekly_hours` is low, or reputable providers.

### 5.4 Better query construction (LOW)
Right now the embed query is a naive concat. Try weighting `goal_text` higher, or
embedding goal and interests separately and combining.

### 5.5 Model upgrade path (LOW, future)
`registry.py` exists precisely so you can swap `all-MiniLM-L6-v2` for a stronger
embedder (e.g. `bge-small-en`, `all-mpnet-base-v2` → 768-dim) WITHOUT touching other
code. **If you change embedding dimensions you MUST:** (a) update `VECTOR(384)` in
the `courses` table + the `match_courses` RPC to the new dim, (b) re-run
`seed_courses.py` to re-embed all 80 courses, (c) keep `embed_text` returning the new
dim. Do all three together or retrieval breaks.

---

## 6. Environment & gotchas (learned the hard way)

- **Python 3.11 required, not 3.14.** On 3.14 the `scipy` cp314 wheel is blocked by
  a Windows WDAC code-integrity policy on the dev machine, which cascades through
  sklearn → sentence-transformers → the whole app import. 3.11 also matches the
  Dockerfile and the EC2 runtime. Rebuild: `py -3.11 -m venv venv` then
  `pip install -r requirements.txt`.
- **Groq retired `llama-3.3-70b-versatile`.** The chat model is now
  `openai/gpt-oss-120b`, centralized as `settings.GROQ_MODEL` (override via
  `GROQ_MODEL` in `.env`). This is Member 1's concern, not the recommender's — the
  ML module doesn't call Groq — but noted so you're not surprised. These are
  reasoning models; that only affects the services that call the LLM.
- **Windows console + emoji:** avoid `✅`/emoji in `print()` in scripts run via
  plain `python.exe` (cp1252 → `UnicodeEncodeError`). Use ASCII in test output.
- **Deployment:** backend auto-deploys to AWS EC2 (`http://13.206.51.130`) on every
  push touching `backend/**` via `.github/workflows/deploy-backend.yml`. Your ML
  changes ship automatically — but the Docker build re-downloads the embedding model
  at build time, so a bad `embed_text` import will fail the deploy. Test locally first.

---

## 7. How to test your ML changes locally

```bash
cd backend
.\venv\Scripts\python.exe -m app.ml.embedder     # 384 dims, magnitude 1.0
.\venv\Scripts\python.exe -m app.ml.retriever    # live pgvector hit, needs seeded DB
.\venv\Scripts\python.exe -m app.ml.recommender  # end-to-end ranked list
```

To test the full path a recommender change affects, run the server and hit generate:

```bash
.\venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
# then POST /api/paths/generate with a valid JWT (see Member 1 for a test token)
```

**Before pushing:** run all three self-tests, confirm `python -c "from app.main import app"`
imports clean (this is what the Docker build does), then push. CI will redeploy EC2.

---

## 8. Contract change log

| date | change | who |
|------|--------|-----|
| 2026-08-26 | `match_courses` RPC gained `provider` column (migration `add_provider_to_match_courses`) | M1 (bug found during M1-S4 verify) |
| 2026-08-26 | `recommend()` now filters `profile.completed_courses` | M1 (swap/feedback redesign) |
| 2026-08-26 | `profile` may include `topic_ratings` + `detected_years_experience` (from resume step) — **not yet used by recommender, see §5.1** | M3/M1 |
| 2026-08-26 | retrieve widened to top-25 before re-rank (was 20) to give swap more alternatives | M1 |

Keep this table updated when you change the ML surface so Member 1 knows what moved.
