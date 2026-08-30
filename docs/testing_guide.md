# Test suite — reproducible commands

## Backend (Python 3.11.9 — 3.14 is blocked by a Windows WDAC policy on scipy)

```bash
cd backend
python -m venv venv
source venv/Scripts/activate   # Windows Git Bash; use venv\Scripts\activate.bat for cmd.exe
pip install -r requirements.txt
pytest -q
```

Expected: **144 passed** (as of this round). No live network calls, no live
Supabase writes — every external dependency (Supabase client, GitHub API,
LLM calls, web search, resource-URL reachability checks) is mocked, so this
runs in CI without secrets or network access.

(One pre-existing exception, tracked separately, not this suite's general
behavior: `test_swap_step_with_preference_realtime_flow` reaches the real
`app.ml.retriever.retrieve_candidates` → `match_courses` RPC against
whatever `SUPABASE_URL` is configured - read-only, no writes, but a real
~10s network round-trip. See the spawned follow-up task for the fix.)

Run one file / one class / one test:

```bash
pytest tests/test_ranking_engine.py -v
pytest tests/test_ranking_engine.py::TestMasteryChangesRanking -v
pytest tests/test_ranking_engine.py::TestMasteryChangesRanking::test_high_mastery_learner_scores_beginner_content_lower_than_matched_content -v
```

## Test file map (platform-audit-relevant additions)

| File | Covers |
|---|---|
| `test_taxonomy_and_mastery.py` | Skill alias resolution, mastery confidence-weighted combination math, per-evidence-source update rules |
| `test_catalog_service.py` | Dynamic catalog ingestion, verification, promotion to `courses` |
| `test_ranking_engine.py` | Hard filtering, **mastery materially changing rank order** (the actual acceptance criterion), prerequisites using real edges (not interests), diversity re-ranking |
| `test_path_planner.py` | Deterministic prerequisite reordering of LLM-proposed milestones |
| `test_rate_limit_durable.py` | Postgres-backed rate limiter: allow/reject/fail-open/no-double-count |
| `test_idempotency_service.py` | Duplicate-click/retry replay, in-flight `425`, concurrent-reservation race |
| `test_security_and_integrity.py` | All security-audit rounds (see `docs/security_audit.md`) |
| `test_core_flows.py` | Resume extraction (incl. confidence never fabricated when the LLM omits it), profile upsert (including the partial-update fix), path-version bumping, the full `swap_step_with_preference` realtime flow (incl. real mastery-evidence updates for too_advanced/too_basic) |
| `test_feedback_realtime.py` | too_hard mastery/prerequisite-gap handling, resource_unavailable's live re-check-before-swap safety property, apply_recent_feedback firing immediately with no week gate |

## Live/production verification (cannot run in CI — needs real Supabase credentials)

The pattern used throughout this project: mint a real HS256 JWT with the
project's actual `SUPABASE_JWT_SECRET` for a real, pre-existing test user,
then hit the deployed EC2 backend directly.

```bash
python -c "
import jwt, time
from app.config import settings
print(jwt.encode(
    {'sub': '<real-user-uuid>', 'aud': 'authenticated',
     'iat': int(time.time()), 'exp': int(time.time()) + 3600},
    settings.SUPABASE_JWT_SECRET, algorithm='HS256',
))
"
```

```bash
curl -H "Authorization: Bearer <token>" http://13.206.51.130/api/roadmap
```

Every live-verification result reported in `docs/security_audit.md` and
`docs/platform_audit_remediation.md` was produced this way, with real
before/after checks against the live database (via the Supabase MCP tools)
rather than trusting an HTTP 200 alone.

## Frontend

```bash
cd frontend
npm install
npm run build      # production build - verifies no syntax/import errors
npm run test:e2e   # Playwright - health/landing checks always run; authed
                    # checks skip cleanly without PLAYWRIGHT_EMAIL/PASSWORD
```

To verify the mock-auth/fabricated-data removal specifically: build for
production, then run the automated bundle-purity check (this used to be a
manual `grep` a person had to remember to re-run before every release -
it's now a real Playwright test, `tests/e2e/bundle-purity.spec.js`, that
fails loudly in CI if any of these strings reappear).

```bash
npm run build
npx playwright test tests/e2e/bundle-purity.spec.js
# expected: 12 passed
```
