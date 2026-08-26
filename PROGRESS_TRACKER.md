# PROGRESS TRACKER
Last updated by: Login-39t (Member 3 — Frontend) at 2026-08-26 (M3-S4 onboarding chat intake complete)
Previously: kavindra-e-m (Member 1 — Backend) at 2026-08-26 (M1-S5 + M1-S6 complete, MODULE 7 + 8 backend halves passed)
Previously: Kubojah-Dan (Member 4 — Dashboard) at 2026-08-26 (M4-S3 + M4-S4 complete, feedback loop wired)
Previously: kavindra-e-m (Member 1 — Backend) at 2026-08-26 (M1-S2 → M1-S4 complete, MODULE 3 + 5 gates passed)

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
- [x] M1-S5: Feedback + adaptation — `feedback_service.handle_feedback` writes to `feedback_events`, then: `completed` flips status only; `too_easy` bumps `current_level` one tier (capped at advanced) and re-sequences the not_started tail via recommender + Groq; `not_interested` drops the course's `skill_tags` from `interests` (guarded to keep them non-empty) and re-sequences. Tested live on path `8b240587…`: invalid step → 404, bad event_type → 400, `completed` → 1s no regen, `too_easy` → level `beginner→intermediate` + 8 new steps including an advanced course, `not_interested` on Python course → "python" removed from interests → path skewed to BI/Tableau/Power BI as expected. Sequence_order continues from the last kept step (no collisions).
- [x] M1-S6: AI assistant endpoint — `assistant_service.ask` fetches profile + path + steps (ownership-checked), grounds the Groq call with `prompts/assistant.txt`. Tested live: Q "why is Python not in my path?" → correct answer citing seq numbers, completed/skipped statuses, and the exact course titles; Q "which course should I start with?" → identified seq 4 (first not_started) and tied it to the marketing→Data Analyst goal; bad path_id → 404. Responses in ~1–2s.

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
- [x] M3-S4: Onboarding chat intake — `OnboardingPage` 3-phase state machine (chat → confirm → generating): `ChatInput` (textarea + "Generate My Path →" w/ spinner, disabled when empty/loading) → `POST /api/profile/` → `GoalConfirm` (target role, level badge, interest tags, weekly hours; confirm / rephrase) → `POST /api/paths/generate` → navigate `/roadmap/:pathId`; `GeneratingLoader` 4 stages advancing every 1.5s + pulsing bar; indigo gradient bg matching Landing. `npm run build` passes
- [ ] M3-S5: Roadmap view with real data

## Frontend Dashboard — Member 4
- [x] M4-S2: Dashboard + ProgressHeader — light-theme dashboard fetches newest active path from Supabase (nested `path_steps`→`courses`), computes progress %, skills gained, next 3 steps; `ProgressHeader` SVG ring (r40, circumference 251.2, indigo-600 on gray-200) with "View full roadmap →"; empty state → `/onboarding`
- [x] M4-S3: SkillMap + NextActions + FeedbackButtons — `SkillMap` green pill badges ("Skills Gained" 🧠) + empty-state copy; `NextActions` ("Up Next") renders up to 3 white step cards (title/provider/difficulty badge/duration + rule + feedback) with all-caught-up empty state; `FeedbackButtons` posts to `/api/steps/{id}/feedback` (completed/too_easy/not_interested) with per-button spinner, all-disabled-while-loading, and auto-hiding (3s) error text
- [x] M4-S4: Feedback loop wired + dashboard refresh — `DashboardPage.handleFeedback` re-fetches after every feedback and shows an animated indigo toast when `path_updated`; roadmap wired end-to-end: `ResourceItem` embeds `FeedbackButtons`, `onRefresh` threaded `RoadmapTimeline → MilestoneCard → ResourceItem`, and `RoadmapPage.refetchPath` re-calls `GET /api/paths/{pathId}` (normalized, with sample fallback). `npm run build` passes.
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
- [x] MODULE 7: Dashboard + feedback loop ✅ (M4-S2..S4 frontend + M1-S5 backend now both live; `POST /api/steps/{id}/feedback` returns real `{feedback_id, path_updated, updated_steps}` and mutates DB — Member 4's UI can stop treating the response as a no-op)
- [x] MODULE 8: AI assistant grounded answers ✅ (`POST /api/assistant/ask` returns answers grounded on the real path — Q about "Python removed" correctly referenced completed/skipped statuses and course names from the DB. Frontend M4-S5 chat panel still pending.)
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

## Unblocked next (as of M1-S5 + M1-S6)
- **Member 3**: M3-S4 (onboarding chat intake) + M3-S5 (roadmap view) — every backend endpoint they need is live and returning real data. Reminder: `POST /api/profile/` needs the **trailing slash**.
- **Member 4**: M4-S5 (AI Assistant chat panel) is now unblocked — `POST /api/assistant/ask` body: `{question, path_id}`, response: `{answer}`. Also: your M4-S4 feedback loop is now talking to real backend (was hitting a `"not implemented"` stub before) — `path_updated:true` responses now include real `updated_steps`.
- **Member 1 (me)**: All 6 backend steps done. Remaining backend work is polish/edge-cases: rate-limit protection on the LLM endpoints, better error messages, maybe async explanation generation to cut regen from ~10s to ~2s.
- **Member 5**: MODULE 2, 3, 5, 7, 8 gates all have live evidence — needs your sign-off, plus the deploy prep (Vercel/Render URLs still TBD on line 8–10).

### Known slow paths (worth flagging in demo script)
- `POST /api/paths/generate` first-run: ~11s. Cold model load + 1 sequence call + N explain calls.
- `POST /api/steps/{id}/feedback` with `too_easy`/`not_interested`: first ~40s, warm ~10s (N sequential explain calls). If demo timing is tight, consider making explanations async and rendering them progressively on the frontend.
- `POST /api/assistant/ask`: 1–2s. Fine as-is.
