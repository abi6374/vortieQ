# PROGRESS TRACKER
Last updated by: kavindra-e-m (Member 1 — Backend) at 2026-08-26 (M1-S2 → M1-S4 complete, MODULE 3 + 5 gates passed)
Previously: Login-39t at 2026-08-26 (M3-S3 landing page + AuthCard complete)
Previously: Abinivas (Member 2 — ML) at 2026-08-26 (M2-S2 → M2-S5 complete, MODULE 2 gate passed)

## Infrastructure (Member 5)
- [ ] GitHub repo: https://github.com/YOUR_ORG/career-path-recommender
- [x] Supabase tables live (all 5 tables) — `omnhtvxuvjnimokwqtje.supabase.co`, RLS enabled on all incl. read-only public policy on `courses`
- [ ] Vercel URL: TBD
- [ ] Render URL: TBD

## Backend — Member 1
- [x] M1-S1: Skeleton + /health — uvicorn boots, `GET /health` returns 200, all 6 routers registered, Swagger UI live at `/docs`
- [x] M1-S2: Auth middleware + profile endpoint — `verify_jwt` decodes Supabase HS256 JWT (aud `authenticated`) with granular 401s (expired / invalid / no-sub). `upsert_profile()` writes to Supabase. Tested live: no header → 401, garbage token → 401, valid JWT → 200 + real row in `profiles`.
- [x] M1-S3: Groq profile extraction live — `prompts/profile_extract.txt` + `extract_profile()`: strips markdown fences, validates all 4 keys, retries once, safe fallback. Tested live: *"marketing manager … data analysis … dashboards with Python … 15 hours a week"* → `{target_role: "Data Analyst", current_level: "beginner", interests: ["python","data analysis","dashboards"], weekly_hours: 15}`, persisted to `profiles`.
- [x] M1-S4: Path generation end-to-end — `path_service.generate_path/generate_explanation/get_path` + `prompts/path_generate.txt` + `prompts/explain.txt`. Tested live: `POST /api/paths/generate` → 200 in ~11s, 3 milestones / 8 steps, all with real providers and grounded 2-sentence explanations; `learning_paths` + `path_steps` rows written; `GET /api/paths/{id}` returns the same shape from DB; another user's JWT → 404 (ownership enforced).
- [ ] M1-S5: Feedback + adaptation
- [ ] M1-S6: AI assistant endpoint

## ML — Member 2
- [x] M2-S2: embed_text() working (384 floats) — `backend/app/ml/embedder.py`, `sentence-transformers` `all-MiniLM-L6-v2` loaded once at module level, L2-normalized. Tested: `python -m app.ml.embedder` → 384 dims, magnitude 1.000000.
- [x] M2-S3: 80 courses seeded with embeddings — `data/courses_raw.csv` generated (20 each: Data Science/ML, Web Dev, Cloud/DevOps, Product/Business Tech), `data/seed_courses.py` implemented and **run live**: 80/80 seeded, 0 skipped, into `omnhtvxuvjnimokwqtje.supabase.co`. Verify query "learn python for data science" → top hit `Python Basics for Data Science` (similarity 0.722).
- [x] M2-S4: retrieve_candidates() pgvector working — `backend/app/ml/retriever.py` calls `match_courses` RPC via `app.config.supabase_client`. Tested live: query "React web development JavaScript" → top hit `React.js Fundamentals` (0.687).
- [x] M2-S5: Recommender.recommend() re-ranking done — `backend/app/ml/recommender.py`: embeds goal+role+interests → retrieves top 20 → re-ranks by level fit (±1 tier), prerequisite⊆interests boost, and similarity. Tested live end-to-end for a beginner "Data Scientist" profile → 15 ranked courses returned, `registry.get_recommender()` wired to real class, `app.main` imports clean with it.
  - ML module interface (embed_text/retrieve_candidates/Recommender.recommend/get_recommender) unchanged from §5.2 contract — safe for Member 1 to call from `path_service.py` now.

## Frontend Auth + Onboarding — Member 3
- [x] M3-S1: React scaffold, folder structure — Vite+React+Tailwind scaffolded, all 24 component/page/lib/hook files created, `npm run dev` + `npm run build` pass, `.env.example` + `vercel.json` in place
- [x] M3-S2: AuthContext, routing, supabaseClient — `supabaseClient.js` (createClient), `apiClient.js` (axios + JWT interceptor via `supabase.auth.getSession`), `AuthContext.jsx` (session/loading + signIn/signUp/signOut + onAuthStateChange), `useAuth` hook, `ProtectedRoute`, and full React Router setup (`/`, `/onboarding`, `/roadmap/:pathId`, `/roadmap`, `/dashboard`, `*`→`/`)
- [x] M3-S3: Landing page + AuthCard — indigo gradient landing ("PathAI" + brain logo + tagline), redirects to `/dashboard` when a session exists; AuthCard white card with Sign In / Sign Up tabs, loading spinner, error text, error clears on typing; sign-in → `/dashboard`, sign-up → `/onboarding`. Verified in browser (both tabs render, build passes)
- [ ] M3-S4: Onboarding chat intake
- [ ] M3-S5: Roadmap view with real data

## Frontend Dashboard — Member 4
- [x] M4-S2: Dashboard + ProgressHeader
- [ ] M4-S3: SkillMap + NextActions + FeedbackButtons
- [ ] M4-S4: Feedback loop wired + dashboard refresh
- [ ] M4-S5: AI Assistant chat panel
- [ ] M4-S6: Polish pass (loading/error/empty states)

## Module Gates — Member 5 verifies each
- [x] MODULE 0: 5 Supabase tables visible ✅ (+ RLS enabled, `match_courses` RPC + `profiles_updated_at` trigger live)
- [x] MODULE 1: /health 200 + auth middleware ✅ (JWT verification now tested for real — valid token → 200, missing/garbage token → 401)
- [x] MODULE 2: Course embeddings + retrieval ✅ (self-verified by Member 2 with live test output above — 80 courses seeded + embedded, pgvector retrieval and re-ranking confirmed against the real Supabase project; M5, please spot-check the Table Editor row count and re-run `data/seed_courses.py --verify` when convenient)
- [x] MODULE 3: Profile extraction writes to DB ✅ (`POST /api/profile/` with a real JWT → Groq-extracted profile persisted; verified by SQL against `public.profiles`)
- [ ] MODULE 4: Frontend auth working
- [x] MODULE 5: Path generation API works ✅ (`POST /api/paths/generate` → 3 milestones / 8 real courses in ~11s, rows in `learning_paths` + `path_steps`, 8/8 steps carry explanations; `GET /api/paths/{id}` round-trips and enforces ownership)
- [ ] MODULE 6: Roadmap shows real courses
- [ ] MODULE 7: Dashboard + feedback loop
- [ ] MODULE 8: AI assistant grounded answers
- [ ] MODULE 9: Full flow on deployed URL

## Notes
- Backend runs locally: `cd backend && ./venv/Scripts/python.exe -m uvicorn app.main:app --port 8000`
- Backend venv: `backend/venv/` — **rebuilt on Python 3.11.9 (was 3.14.6)**. See "Python 3.11 required" below. `pip install -r requirements.txt` (includes `sentence-transformers` + `torch`, ~few min install, all clean).
- Env vars loaded from `backend/.env` (6 keys — the 5 originals plus optional `GROQ_MODEL`; values redacted from repo)
- Supabase MCP connector configured at repo root `.mcp.json` (project-scoped, OAuth authenticated)
- **Windows note:** avoid ✅/emoji in `print()` inside scripts run via plain `python.exe` — default console codepage (cp1252) throws `UnicodeEncodeError`. Use ASCII (`OK -`, `[x]`) in test/verify script output instead.
- **Restarting the server on Windows:** a stale uvicorn keeps port 8000 and the new one silently fails to bind (`Errno 10048`) — you then test against *old code*. Kill it first:
  `Get-NetTCPConnection -LocalPort 8000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`

## ⚠️ Python 3.11 required (do not use 3.14)
On Python 3.14 the `scipy` cp314 wheel is blocked by this machine's WDAC code-integrity policy
(`Policy ID {0283ac0f-…}`, "did not meet the Enterprise signing level requirements"), which breaks
`scipy → sklearn → sentence-transformers → app.ml.embedder` and therefore the entire app import.
Rebuilding the venv on **Python 3.11.9** resolves it (scipy drops to 1.17.1, an established build that
clears the reputation check). 3.11 also matches `backend/Dockerfile` and Render's runtime.
```
winget install Python.Python.3.11
cd backend; Remove-Item -Recurse -Force venv; py -3.11 -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

## ⚠️ Groq model changed — llama-3.3-70b-versatile is GONE
Groq no longer serves `llama-3.3-70b-versatile` (404 `model_not_found`). Available chat models on our key:
`openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen/qwen3.8-27b`, `qwen/qwen3.6-27b`, `groq/compound*`.
We now use **`openai/gpt-oss-120b`**, set once in `config.py` as `settings.GROQ_MODEL` and overridable via
`GROQ_MODEL` in `.env` — change it in that one place if Groq retires it too.
**These are reasoning models:** chain-of-thought is billed against `max_tokens` *before* any answer, so a
tight budget returns an empty `content` (this silently produced blank explanations until fixed). All calls
now pass `reasoning_effort="low"` with generous `max_tokens`, and coalesce `content or ""`.

## Unblocked next (as of M1-S2→S4)
- **Member 3**: `POST /api/profile/` and `POST /api/paths/generate` are live and return real data — wire the onboarding flow (M3-S4) and roadmap view (M3-S5) to them now. Response shape is in the API contract; note the profile route is `/api/profile/` **with the trailing slash**.
- **Member 4**: `GET /api/paths/{path_id}` returns milestones with per-step `step_id`, `status`, `skill_tags`, `provider`, `resource_url` and `explanation` — enough to build the dashboard (M4-S2/S3) against real data instead of mocks.
- **Member 1 (me)**: next is M1-S5 (feedback + adaptation) then M1-S6 (assistant). `feedback_service.handle_feedback()` and `assistant_service.ask()` are still stubs returning `None`.
- **Member 5**: MODULE 2, 3 and 5 gates all have live evidence — needs your sign-off.
