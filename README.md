# PathFinder

**AI-powered, adaptive learning path recommender** — built for HCL Hackathon Round 2 (Sri Eshwar College of Engineering).

PathFinder turns a learner's goal ("I want to become a Data Analyst in 3 months, I know some Python, I have 8 hours a week") into a personalized, week-by-week roadmap of real courses, then keeps that roadmap honest as the learner progresses — swapping out courses that are too easy or too hard, tracking real per-skill mastery, and re-pacing the timeline against the hours the learner actually has, never a fabricated one.

- **Live app:** https://vortie-q.vercel.app
- **Live API:** http://13.206.51.130 (`/health`, `/docs` for Swagger UI)

---

## What it does

1. **Onboarding** — a resume upload (extracted server-side, never fabricated confidence scores) plus a short goal conversation build a real learner profile: target role, current level, interests, weekly hours, and per-topic skill ratings.
2. **Path generation** — an LLM sequences a shortlist of real, embedded courses (retrieved via semantic search over a seeded course catalog + live web search) into milestones and weeks, respecting prerequisites.
3. **Adaptive roadmap** — every week is paced against the learner's *real* stated weekly hours. If the honest math needs more time than the learner's target timeline, the app says so explicitly instead of quietly inflating hours to force a fit.
4. **Feedback loop** — "too easy" / "too hard" / "swap" / "mark done" all feed back into a real per-skill mastery model that re-ranks future recommendations, not just a cosmetic slider.
5. **Beyond the roadmap** — an AI coach (chat, practice questions, project ideas), mock interviews, hackathon/internship discovery, GitHub-linked progress signals, and a skills/progress dashboard, all grounded in the learner's real data.

---

## Architecture

```
frontend/   React 18 + Vite + Tailwind — deployed to Vercel
backend/    FastAPI (Python 3.11) — deployed to AWS EC2 via Docker
data/       course catalog (80 seed courses), embedding pipeline, SQL migrations
docs/       deployment guide, testing guide, security audit
```

**Backend** (`backend/app/`)

| Layer | What's there |
|---|---|
| `routers/` | `paths`, `roadmap`, `feedback`, `assistant`, `profile`, `account`, `resources`, `coach`, `interview`, `hackathons`, `internships`, `github` |
| `services/` | path generation/sequencing, roadmap pacing, mastery + ranking, catalog ingestion, resume parsing, idempotency, rate limiting, taxonomy, GitHub/YouTube/web-search adapters |
| `ml/` | `embedder` (sentence-transformers, 384-dim), `retriever` (pgvector similarity via Supabase `match_courses` RPC), `recommender` (re-ranking), `registry` (singleton swap point) |
| `middleware/` | JWT auth, Postgres-backed rate limiting, security headers |

**Data**: Supabase (Postgres + pgvector + Auth), 19 SQL migrations under `data/migrations/`, RLS enabled on every table.

**LLM**: routed through `app/llm_client.py` — Groq (`openai/gpt-oss-120b`) by default, or AWS Bedrock (`amazon.nova-pro-v1:0` via the Converse API, using the EC2 instance's IAM role — no AWS keys ever touch `.env`). Toggle with `LLM_PROVIDER`.

See [`docs/deployment_guide.md`](docs/deployment_guide.md) for the full infra walkthrough and [`PROGRESS_TRACKER.md`](PROGRESS_TRACKER.md) for the complete build history.

---

## Tech stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router, Recharts, Framer Motion, Playwright (E2E)
- **Backend**: FastAPI, Supabase (Postgres + pgvector), Groq / AWS Bedrock, sentence-transformers, pytest
- **Infra**: AWS EC2 (Docker, GitHub Actions CI/CD) for the API, Vercel for the frontend, Supabase for the database/auth

---

## Getting started

### Prerequisites
- Node.js 18+
- **Python 3.11** (not 3.14 — the `scipy`/sentence-transformers chain breaks under a Windows WDAC policy on newer Pythons; 3.11 also matches the Docker/EC2 runtime)
- A Supabase project (or the team's shared one)

### Backend

```bash
cd backend
python -m venv venv
source venv/Scripts/activate      # Windows Git Bash; venv\Scripts\activate.bat for cmd.exe
pip install -r requirements.txt
cp .env.example .env              # fill in the keys below
uvicorn app.main:app --reload --port 8000
```

Required environment variables (`backend/.env`):

| Variable | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` | Database, auth, JWT verification |
| `GROQ_API_KEY` | Default LLM provider |
| `LLM_PROVIDER` | `groq` (default) or `bedrock` |
| `AWS_REGION`, `BEDROCK_MODEL_ID` | Only used when `LLM_PROVIDER=bedrock`; AWS credentials come from the EC2 instance role, never from `.env` |
| `YOUTUBE_API_KEY` | Optional — free-resource lookups degrade gracefully (never fabricated) if unset |

### Frontend

```bash
cd frontend
npm install
cp .env.example .env               # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm run dev
```

### Seed the course catalog

```bash
cd data
python seed_courses.py   # embeds and upserts the 80-course dataset into Supabase
```

---

## Testing

```bash
# Backend — 300+ tests, fully mocked, no live network/DB calls
cd backend && pytest -q

# Frontend — production build + Playwright E2E
cd frontend && npm run build && npm run test:e2e
```

Full details, including how to run a single test and how live/production verification is done against the real deployed backend, are in [`docs/testing_guide.md`](docs/testing_guide.md).

---

## Deployment

- **Backend** auto-deploys to AWS EC2 on every push to `main` touching `backend/**` (`.github/workflows/deploy-backend.yml`): builds the Docker image, ships it over SSH, reloads the container, polls `/health`.
- **Frontend** auto-deploys to Vercel on push.

See [`docs/deployment_guide.md`](docs/deployment_guide.md) for the one-time manual setup (EC2 instance, Elastic IP, GitHub secrets).

---

## Project docs

| Doc | What's in it |
|---|---|
| [`PROGRESS_TRACKER.md`](PROGRESS_TRACKER.md) | Round-by-round build log — every fix, why it mattered, how it was verified live |
| [`DESIGN.md`](DESIGN.md) | Visual design system used across the frontend |
| [`docs/deployment_guide.md`](docs/deployment_guide.md) | EC2 + Vercel setup |
| [`docs/testing_guide.md`](docs/testing_guide.md) | Reproducible test commands, test file map |
| [`docs/security_audit.md`](docs/security_audit.md) | Security review findings and fixes |
| [`docs/platform_audit_remediation.md`](docs/platform_audit_remediation.md) | Platform-wide audit + remediation log |

---

## Team

Built by a 5-member team for HCL Hackathon Round 2:

| Member | Role |
|---|---|
| Member 1 | Backend |
| Member 2 (Abinivas) | ML |
| Member 3 | Frontend |
| Member 4 | Dashboard |
| Member 5 | Infrastructure |

## Guiding principle

Every number shown to a learner — hours per week, mastery level, skill confidence, timeline — is either real, derived from real data, or explicitly flagged as an estimate. Nothing is fabricated to make a screen look complete. This is enforced in code review and in the test suite (see `PROGRESS_TRACKER.md` for the running list of fabrication bugs found and fixed this way).
