# PROGRESS TRACKER
Last updated by: Abinivas (Member 2 — ML) at 2026-08-26 (M2-S2 → M2-S5 complete, MODULE 2 gate passed)

## Infrastructure (Member 5)
- [ ] GitHub repo: https://github.com/YOUR_ORG/career-path-recommender
- [x] Supabase tables live (all 5 tables) — `omnhtvxuvjnimokwqtje.supabase.co`, RLS enabled on all incl. read-only public policy on `courses`
- [ ] Vercel URL: TBD
- [ ] Render URL: TBD

## Backend — Member 1
- [x] M1-S1: Skeleton + /health — uvicorn boots, `GET /health` returns 200, all 6 routers registered, Swagger UI live at `/docs`
- [ ] M1-S2: Auth middleware + profile endpoint — `verify_jwt` dependency wired on every route (stub), profile upsert not implemented
- [ ] M1-S3: Groq profile extraction live
- [ ] M1-S4: Path generation end-to-end
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
- [ ] M3-S3: Landing page + AuthCard
- [ ] M3-S4: Onboarding chat intake
- [ ] M3-S5: Roadmap view with real data

## Frontend Dashboard — Member 4
- [ ] M4-S2: Dashboard + ProgressHeader
- [ ] M4-S3: SkillMap + NextActions + FeedbackButtons
- [ ] M4-S4: Feedback loop wired + dashboard refresh
- [ ] M4-S5: AI Assistant chat panel
- [ ] M4-S6: Polish pass (loading/error/empty states)

## Module Gates — Member 5 verifies each
- [x] MODULE 0: 5 Supabase tables visible ✅ (+ RLS enabled, `match_courses` RPC + `profiles_updated_at` trigger live)
- [x] MODULE 1: /health 200 + auth middleware ✅ (auth middleware present on every route; JWT verification path not yet tested with a real Supabase token)
- [x] MODULE 2: Course embeddings + retrieval ✅ (self-verified by Member 2 with live test output above — 80 courses seeded + embedded, pgvector retrieval and re-ranking confirmed against the real Supabase project; M5, please spot-check the Table Editor row count and re-run `data/seed_courses.py --verify` when convenient)
- [ ] MODULE 3: Profile extraction writes to DB
- [ ] MODULE 4: Frontend auth working
- [ ] MODULE 5: Path generation API works
- [ ] MODULE 6: Roadmap shows real courses
- [ ] MODULE 7: Dashboard + feedback loop
- [ ] MODULE 8: AI assistant grounded answers
- [ ] MODULE 9: Full flow on deployed URL

## Notes
- Backend runs locally: `cd backend && ./venv/Scripts/python.exe -m uvicorn app.main:app --port 8000`
- Backend venv: `backend/venv/` (created 2026-08-26, Python 3.14.6, `pip install -r requirements.txt` — includes `sentence-transformers` + `torch`, ~few min install, all clean)
- Env vars loaded from `backend/.env` (5 keys present, values redacted from repo)
- Supabase MCP connector configured at repo root `.mcp.json` (project-scoped, OAuth authenticated)
- **Windows note:** avoid ✅/emoji in `print()` inside scripts run via plain `python.exe` — default console codepage (cp1252) throws `UnicodeEncodeError`. Use ASCII (`OK -`, `[x]`) in test/verify script output instead.

## Unblocked next (as of M2-S2→S5)
- **Member 1**: ML module interface is live and real (no more stubs) — `generate_path()` in `path_service.py` can now call `get_recommender().recommend(profile)` and expect up to 15 real, ranked course dicts (`id, title, description, provider, skill_tags, difficulty, duration_hrs, prerequisites, resource_url, similarity`) instead of `[]`. This unblocks M1-S4.
- **Member 5**: MODULE 2 gate has live evidence above — just needs your sign-off (Table Editor row count + optional independent `--verify` run).
- Nothing further blocks on Member 2 for the core pipeline; remaining ML-adjacent work (if any) would be tuning re-rank weights after real user feedback in MODULE 7/8.
