# PROGRESS TRACKER
Last updated by: kavindra-e-m at 2026-08-26 08:08 IST

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
- [ ] M2-S2: embed_text() working (384 floats) — stub returns zeros
- [ ] M2-S3: 80 courses seeded with embeddings — CSV + seeder files empty
- [ ] M2-S4: retrieve_candidates() pgvector working — `match_courses` RPC exists in DB, Python stub returns []
- [ ] M2-S5: Recommender.recommend() re-ranking done

## Frontend Auth + Onboarding — Member 3
- [ ] M3-S1: React scaffold, folder structure — folder tree scaffolded, files empty
- [ ] M3-S2: AuthContext, routing, supabaseClient
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
- [ ] MODULE 2: Course embeddings + retrieval
- [ ] MODULE 3: Profile extraction writes to DB
- [ ] MODULE 4: Frontend auth working
- [ ] MODULE 5: Path generation API works
- [ ] MODULE 6: Roadmap shows real courses
- [ ] MODULE 7: Dashboard + feedback loop
- [ ] MODULE 8: AI assistant grounded answers
- [ ] MODULE 9: Full flow on deployed URL

## Notes
- Backend runs locally: `cd backend && ./venv/Scripts/python.exe -m uvicorn app.main:app --port 8000`
- Env vars loaded from `backend/.env` (5 keys present, values redacted from repo)
- Supabase MCP connector configured at repo root `.mcp.json` (project-scoped, OAuth authenticated)
