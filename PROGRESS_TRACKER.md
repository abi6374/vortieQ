# PROGRESS TRACKER
Last updated by: Abinivas (Member 2 — ML) at 2026-08-26 (merged in AWS EC2 + Vercel deploy pipeline alongside everyone else's work)
Previously: Kubojah-Dan (Member 4 — Dashboard) at 2026-08-26 (M4-S5 + M4-S6 complete — all M4 steps done, frontend polish pass)
Previously: Login-39t (Member 3 — Frontend) at 2026-08-26 (M3-S5 roadmap view complete — all M3 steps done)
Previously: Login-39t (Member 3 — Frontend) at 2026-08-26 (M3-S4 onboarding chat intake complete)
Previously: kavindra-e-m (Member 1 — Backend) at 2026-08-26 (M1-S5 + M1-S6 complete, MODULE 7 + 8 backend halves passed)
Previously: Kubojah-Dan (Member 4 — Dashboard) at 2026-08-26 (M4-S3 + M4-S4 complete, feedback loop wired)
Previously: kavindra-e-m (Member 1 — Backend) at 2026-08-26 (M1-S2 → M1-S4 complete, MODULE 3 + 5 gates passed)

## Infrastructure (Member 5)
- [x] GitHub repo: https://github.com/abi6374/vortieQ
- [x] Supabase tables live (all 5 tables) — `omnhtvxuvjnimokwqtje.supabase.co`, RLS enabled on all incl. read-only public policy on `courses`
- [ ] Vercel URL: TBD — see `docs/deployment_guide.md` Part B (one-time connect, ~5 min, auto-deploys on every push after that)
- [ ] Render URL: **superseded — backend deploys to AWS EC2 instead, see below**
- [x] AWS EC2 backend URL: **http://13.206.51.130** — `career-path-backend` (Ubuntu 24.04, t3.micro, ap-south-1, 16GB EBS after an 8→16GB resize for `docker load` headroom, 2GB swap). `.github/workflows/deploy-backend.yml` verified live end-to-end on a real `git push`: build → save → scp to EC2 → `docker load` → restart → poll `/health` — all green (run #5, commit `1c2468a`, 5m57s). Auto-deploys on every push to `main` touching `backend/**`. `/health` and `/docs` both confirmed reachable from outside.

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
- [x] M3-S5: Roadmap view with real data — `RoadmapPage` reads `:pathId`, `GET /api/paths/{pathId}` (normalized), loading spinner + error card w/ retry, top nav (← PathAI / My Dashboard), light theme (`bg-gray-50`). `RoadmapTimeline` vertical connector; `MilestoneCard` collapsible (first open) w/ numbered marker + "~X weeks" badge; `ResourceItem` difficulty badge (green/yellow/red) + duration badge + completed line-through/grayed; `WhyThisDrawer` right-side slide-in + backdrop. Member 4's `FeedbackButtons`/`onRefresh` wiring preserved. `npm run build` passes

## Frontend Dashboard — Member 4
- [x] M4-S2: Dashboard + ProgressHeader — light-theme dashboard fetches newest active path from Supabase (nested `path_steps`→`courses`), computes progress %, skills gained, next 3 steps; `ProgressHeader` SVG ring (r40, circumference 251.2, indigo-600 on gray-200) with "View full roadmap →"; empty state → `/onboarding`
- [x] M4-S3: SkillMap + NextActions + FeedbackButtons — `SkillMap` green pill badges ("Skills Gained" 🧠) + empty-state copy; `NextActions` ("Up Next") renders up to 3 white step cards (title/provider/difficulty badge/duration + rule + feedback) with all-caught-up empty state; `FeedbackButtons` posts to `/api/steps/{id}/feedback` (completed/too_easy/not_interested) with per-button spinner, all-disabled-while-loading, and auto-hiding (3s) error text
- [x] M4-S4: Feedback loop wired + dashboard refresh — `DashboardPage.handleFeedback` re-fetches after every feedback and shows an animated indigo toast when `path_updated`; roadmap wired end-to-end: `ResourceItem` embeds `FeedbackButtons`, `onRefresh` threaded `RoadmapTimeline → MilestoneCard → ResourceItem`, and `RoadmapPage.refetchPath` re-calls `GET /api/paths/{pathId}` (normalized, with sample fallback). `npm run build` passes.
- [x] M4-S5: AI Assistant chat panel — `AssistantChat` floating 56px indigo bubble (💬) → white panel (`w-80`, full-width on mobile) with "🤖 AI Learning Assistant" header + close; seeds a welcome message on first open, posts `{question, path_id: pathId}` to `/api/assistant/ask`, animated three-dot typing bubble, auto-scroll to newest, Enter-to-send / Shift+Enter newline; `MessageBubble` role-based (user → indigo right, assistant → gray left). Mounted on Dashboard + Roadmap with the active `pathId`.
- [x] M4-S6: Polish pass — shared `ui/NavBar` (🧠 PathAI + Sign Out) on all three protected pages (Dashboard/Roadmap/Onboarding); `ui/SkeletonBlock` loaders replace spinners on Dashboard + Roadmap; `ui/ErrorCard` (⚠️ + retry) on both; Dashboard empty state (🗺️ "No learning path yet" → "Generate my first path →"); mobile-responsive (assistant full-width < sm, cards stack, `sm:` padding); `index.html` title → "PathAI — Your Career Learning Path" and body theme aligned to light. Landing verified in-browser with a clean console; `npm run build` passes.

## Module Gates — Member 5 verifies each
- [x] MODULE 0: 5 Supabase tables visible ✅ (+ RLS enabled, `match_courses` RPC + `profiles_updated_at` trigger live)
- [x] MODULE 1: /health 200 + auth middleware ✅ (JWT verification now tested for real — valid token → 200, missing/garbage token → 401)
- [x] MODULE 2: Course embeddings + retrieval ✅ (self-verified by Member 2 with live test output above — 80 courses seeded + embedded, pgvector retrieval and re-ranking confirmed against the real Supabase project; M5, please spot-check the Table Editor row count and re-run `data/seed_courses.py --verify` when convenient)
- [x] MODULE 3: Profile extraction writes to DB ✅ (`POST /api/profile/` with a real JWT → Groq-extracted profile persisted; verified by SQL against `public.profiles`)
- [ ] MODULE 4: Frontend auth working
- [x] MODULE 5: Path generation API works ✅ (`POST /api/paths/generate` → 3 milestones / 8 real courses in ~11s, rows in `learning_paths` + `path_steps`, 8/8 steps carry explanations; `GET /api/paths/{id}` round-trips and enforces ownership)
- [ ] MODULE 6: Roadmap shows real courses
- [x] MODULE 7: Dashboard + feedback loop ✅ (M4-S2..S4 frontend + M1-S5 backend now both live; `POST /api/steps/{id}/feedback` returns real `{feedback_id, path_updated, updated_steps}` and mutates DB — Member 4's UI can stop treating the response as a no-op)
- [x] MODULE 8: AI assistant grounded answers ✅ (`POST /api/assistant/ask` returns answers grounded on the real path — Q about "Python removed" correctly referenced completed/skipped statuses and course names from the DB. Frontend M4-S5 chat panel now live on Dashboard + Roadmap.)
- [ ] MODULE 9: Full flow on deployed URL — **backend half done**: EC2 live at http://13.206.51.130, auto-deploy pipeline verified on a real push (see Infrastructure section above). Still needs Vercel connect (Part B) before the full frontend↔backend flow can be tested on a public URL.

## Notes
- Backend runs locally: `cd backend && ./venv/Scripts/python.exe -m uvicorn app.main:app --port 8000`
- Backend venv: `backend/venv/` — **rebuilt on Python 3.11.9 (was 3.14.6)**. See "Python 3.11 required" below. `pip install -r requirements.txt` (includes `sentence-transformers` + `torch`, ~few min install, all clean).
- Env vars loaded from `backend/.env` (6 keys — the 5 originals plus optional `GROQ_MODEL`; values redacted from repo)
- Supabase MCP connector configured at repo root `.mcp.json` (project-scoped, OAuth authenticated)
- **Windows note:** avoid ✅/emoji in `print()` inside scripts run via plain `python.exe` — default console codepage (cp1252) throws `UnicodeEncodeError`. Use ASCII (`OK -`, `[x]`) in test/verify script output instead.
- **Restarting the server on Windows:** a stale uvicorn keeps port 8000 and the new one silently fails to bind (`Errno 10048`) — you then test against *old code*. Kill it first:
  `Get-NetTCPConnection -LocalPort 8000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`

## Unblocked next (as of M2-S2→S5)
- **Member 1**: ML module interface is live and real (no more stubs) — `generate_path()` in `path_service.py` can now call `get_recommender().recommend(profile)` and expect up to 15 real, ranked course dicts (`id, title, description, provider, skill_tags, difficulty, duration_hrs, prerequisites, resource_url, similarity`) instead of `[]`. This unblocks M1-S4.
- **Member 5**: MODULE 2 gate has live evidence above — just needs your sign-off (Table Editor row count + optional independent `--verify` run).
- Nothing further blocks on Member 2 for the core pipeline; remaining ML-adjacent work (if any) would be tuning re-rank weights after real user feedback in MODULE 7/8.
- **Update:** Member 1 has since picked this up — M1-S4 through M1-S6 are all done (see below). ✅

## Deployment (backend: AWS EC2, not Render — see `docs/deployment_guide.md`)
- Decision: backend hosts on a single EC2 instance (Docker container) instead of Render, per team request. Frontend stays on Vercel as originally planned (Part 1 §20 Render references are now stale for backend).
- CI/CD: `.github/workflows/deploy-backend.yml` — triggers on every push to `main` touching `backend/**`. Builds the Docker image on the GitHub Actions runner, `docker save`s it, `scp`s the tarball to EC2 over SSH, then `docker load` + restarts the container. No AWS IAM keys touch GitHub — only an SSH key, kept minimal on purpose.
- `backend/Dockerfile` updated: CPU-only torch wheel (smaller image, no GPU on a t2.micro anyway), embedding model pre-downloaded at build time (fast/offline container start), `HEALTHCHECK` added.
- **Note:** the Dockerfile still targets `python:3.11-slim` (unaffected by the Python 3.14/WDAC/scipy issue below — Docker images are Linux, not subject to that Windows-specific code-integrity policy), so the EC2 container build is not expected to hit it. Flagging only in case anyone rebases the Dockerfile off a local 3.14 venv assumption.
- **Still needed from Member 5 (or whoever owns AWS):** the one-time manual steps in `docs/deployment_guide.md` Part A — launch the EC2 instance + Elastic IP, install Docker, create `~/app/.env` on the box with the 5 real backend keys, add `EC2_HOST`/`EC2_USER`/`EC2_SSH_KEY` as GitHub secrets. After that, every backend push auto-deploys with no further action.
- Vercel connect (Part B) is unchanged from the original plan and equally not yet done — also needed before MODULE 9 can close.

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
- **Member 5**: MODULE 2, 3, 5, 7, 8 gates all have live evidence — needs your sign-off, plus the deploy prep (backend now targets AWS EC2, not Render — see "Deployment" section above and `docs/deployment_guide.md`; Vercel + EC2 URLs still TBD).

### Known slow paths (worth flagging in demo script)
- `POST /api/paths/generate` first-run: ~11s. Cold model load + 1 sequence call + N explain calls.
- `POST /api/steps/{id}/feedback` with `too_easy`/`not_interested`: first ~40s, warm ~10s (N sequential explain calls). If demo timing is tight, consider making explanations async and rendering them progressively on the frontend.
- `POST /api/assistant/ask`: 1–2s. Fine as-is.
