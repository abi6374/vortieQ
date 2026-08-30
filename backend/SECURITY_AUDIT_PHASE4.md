# Phase 4 Security Hardening — Audit Report

**Scope:** production security-hardening pass over the Phase 1–3 feature set
(learner mastery, real-time feedback, verified dynamic resources, trusted-
provider validation, URL canonicalization, resource-unavailable handling,
catalog hard filtering) — without redesigning the UI, adding new providers,
or weakening existing recommendation functionality.

**Method:** every finding below was confirmed by reading the actual route/
service code first (never assumed from the file name or a prior report),
then fixed, then covered by a new or updated automated test, then verified
against the live EC2 deployment where the fix could plausibly regress
production. Commits are small and focused; each is independently revertable.

Commit range: `7d75529` .. `f6c538a` on `main` (7 commits, chronological):

| Commit | Summary |
|---|---|
| `7d75529` | reject search-results-page URLs in the shared `hard_filter` |
| `8e25a91` | browser security headers middleware; harden `interview.py` schemas |
| `93430a9` | strict Pydantic schemas for `account.py` mutations |
| `f87499d` | real enums + rate limiting across coach/hackathons/internships/github/resources |
| `59996c5` | harden resume upload against spoofed file types |
| `e0d773a` | idempotency + at-most-one-active-path invariant on `generate_path` |
| `f6c538a` | shared idempotency-key generation (frontend) + `noopener noreferrer` |

Plus this pass: `backend/requirements-dev.txt` and `.github/workflows/ci.yml`
(new CI: test suite + dependency vulnerability scanning), and two
test-isolation fixes in `tests/test_security_and_integrity.py` and
`tests/test_youtube_provider.py` discovered while building that CI job.

---

## 1. Strict API contracts

**Before:** several mutation routes accepted `payload: dict = Body(...)` or
bare `str`/`list[dict]` fields with no length bounds, no enum constraints,
and no rejection of unexpected shapes.

**Fixed:**

- [`backend/app/schemas/account.py`](backend/app/schemas/account.py) (new) —
  `ProfileUpdateSchema`, `SettingsUpdateSchema`, `StudySessionSchema`. Real
  `Literal` enums for `current_level`, `difficulty_preference` (matches
  migration 005's CHECK constraint exactly), `preferred_formats`, `activity`;
  length caps on every free-text field; `weekly_hours` and session `minutes`
  bounded to a sane numeric range; `interests`/`preferred_formats` capped at
  list-size limits. Wired into
  [`backend/app/routers/account.py`](backend/app/routers/account.py)'s three
  mutation routes, replacing the raw `dict`/`Body` params.
- [`backend/app/routers/interview.py`](backend/app/routers/interview.py) —
  `InterviewQuestion`, `AnswerEvaluation`, `SubmittedAnswer` replace bare
  `dict`/`list[dict]`; `_MAX_TOPIC_LEN`, `_MAX_TRANSCRIPT_LEN`,
  `_MAX_TTS_TEXT_LEN`, `_MAX_QUESTIONS_PER_SESSION` bound every free-text/
  list input reaching an LLM prompt or TTS call.
- [`backend/app/routers/coach.py`](backend/app/routers/coach.py) —
  `PracticeRequest.topic` bounded 1–200 chars; `count` bounded 1–10.
- [`backend/app/routers/hackathons.py`](backend/app/routers/hackathons.py) /
  [`internships.py`](backend/app/routers/internships.py) — `status` fields
  changed from bare `str` to `Literal[...]` matching the real DB CHECK
  constraints in migration 015 exactly (a value that violates the DB
  constraint now fails validation at the API boundary with a clear 422,
  instead of surfacing as an opaque Postgres error).

**Explicitly deferred, documented here rather than silently skipped:**
`extra="forbid"` (reject unknown fields) has **not** been added to these new
schemas. Pydantic v2's default (`extra="ignore"`) was kept to avoid a
behavior change for any frontend build already in a user's browser that
might send a field the backend no longer needs — a `model_config` change is
low-risk but real, and out of scope for this pass without a coordinated
frontend release. Recommended as a fast, standalone follow-up once the
frontend payloads are confirmed to send only known fields.

String-boolean rejection (`"false"`/`"true"` vs real JSON `false`/`true`) is
covered for free: every boolean field on the schemas above is typed `bool`,
and Pydantic v2 in its default (non-lax) mode already rejects a bare string
for a `bool`-typed field with a 422 — verified in
[`tests/test_routes_enum_validation.py`](backend/tests/test_routes_enum_validation.py)
and [`tests/test_account_security.py`](backend/tests/test_account_security.py).

---

## 2. Authentication and authorization

Audited every router for `Depends(verify_jwt)` and every DB read/write for
`.eq("user_id", current_user_id)` ownership scoping. No route was found
missing auth that should have had it, **except** one anonymously-reachable
route:

- [`backend/app/routers/github.py`](backend/app/routers/github.py) —
  `ingest_github_profile` legitimately allows unauthenticated calls (GitHub
  profile lookup is part of onboarding, before a session exists) but had
  **zero rate limiting**, making it a free anonymous-abuse vector against the
  GitHub API and this backend's compute. Fixed by adding
  `Depends(rate_limit_by_ip_or_user("github.ingest", max_calls=15))` (new
  factory in
  [`backend/app/middleware/rate_limit.py`](backend/app/middleware/rate_limit.py)),
  which keys by real `user_id` when authenticated and falls back to a
  best-effort client IP (`X-Forwarded-For` first hop) for anonymous callers
  — the plain `rate_limit()` factory hard-requires a JWT and can't protect
  an anonymous route at all.
- [`backend/app/routers/resources.py`](backend/app/routers/resources.py) —
  `/search` was authenticated but **unrate-limited**; added 30/window.
- [`backend/app/routers/hackathons.py`](backend/app/routers/hackathons.py) —
  `/refresh` clears a **process-wide shared cache** on every call; added a
  tight 3/window limit since an authenticated user hammering it degrades the
  cache for every other user, not just themselves.

**IDOR:** re-ran cross-user access/mutation tests across profile, path,
step, feedback, resume, mastery, recommendation-run, resource-report,
settings, and study-data endpoints (existing coverage in
`test_security_and_integrity.py`, re-verified this pass, no new gap found).
No route was found relying on RLS alone — the backend uses the Supabase
**service-role** key everywhere (bypasses RLS entirely), so every ownership
check is an explicit application-level `.eq("user_id", ...)`; this was
already true before Phase 4 and was re-confirmed rather than assumed.

**Dev/demo bypasses:** `frontend/src/hooks/useRoadmap.js`'s
`isDevBypassActive()` / `MOCK_DEV_ROADMAP` fallback and the equivalent in
`AuthContext.getDevBypassUser()` are both gated on `import.meta.env.DEV`, a
Vite build-time constant that is `false` in a real `vite build` — confirmed
absent from the production bundle via
`tests/e2e/bundle-purity.spec.js` (13 tests, re-run this pass, all pass)
rather than assumed from the source alone.

---

## 3. Idempotency and concurrency

**Confirmed, real, pre-existing production bug:** two simultaneous
`status='active'` rows in `learning_paths` for one real test account,
traced to `generate_path()` having **zero** duplicate-submission protection
combined with the frontend's genuine `retryPlan()` retry flow. Fixed with
two layers (idempotency keys alone can't cover a genuinely separate second
request, e.g. two browser tabs):

- [`backend/app/routers/paths.py`](backend/app/routers/paths.py) —
  `generate_path` now accepts an `Idempotency-Key` header and wraps the flow
  in the existing `idempotency_service.check_and_reserve`/`store_result`
  primitive (DB-backed, request-hash + endpoint + learner ID + response +
  status + expiry, already used by the feedback/swap/rerecommend/
  task-completion routes from an earlier phase).
- [`backend/app/services/path_service.py`](backend/app/services/path_service.py) —
  `generate_path()` now archives (`status='archived'`) any pre-existing
  `active` path for the user immediately before inserting the new one,
  scoped by `user_id` AND `status='active'` — a real application-level
  invariant, not just a client-retry guard.
- Frontend: `genIdempotencyKey()` is now a single shared export from
  [`frontend/src/lib/apiClient.js`](frontend/src/lib/apiClient.js) (was
  duplicated inline in three files). In
  [`frontend/src/pages/OnboardingPage.jsx`](frontend/src/pages/OnboardingPage.jsx),
  the key is generated once per genuine submission attempt and **reused**
  across retries of that same submission (compared by goal text / weekly
  hours / target role), cleared on success or on an actually different
  resubmission — required because the backend can only correctly replay a
  result if retries of the same logical action share the same key.

Existing idempotency coverage from earlier phases
(`/steps/{id}/feedback`, `/steps/{id}/swap`, `/roadmap/rerecommend`,
`PATCH /roadmap/tasks/{id}`) was re-verified, not re-implemented.

**Not done in this pass, honestly flagged:** a broader transactional-RPC
refactor for multi-step mutations (task completion, swap, mastery update,
path-version increment) beyond what idempotency keys + the archive-prior-
active-path invariant already provide. The idempotency layer prevents
double-application from retries/duplicate clicks; it does not give the
*same* multi-step mutation atomicity against a true mid-request crash. No
evidence of this causing a real production incident was found — flagged as
a forward-looking hardening item, not a confirmed live bug.

---

## 4. Upload security

[`backend/app/services/resume_service.py`](backend/app/services/resume_service.py):

- **Magic-byte validation**, not extension/Content-Type: `_looks_like_pdf`
  checks `data[:5] == b"%PDF-"`; `_looks_like_docx` checks
  `data[:4] == b"PK\x03\x04"` (DOCX is a ZIP/OOXML container) — a
  `.pdf`-named file that isn't really a PDF is now rejected before any
  parser touches it (`UnsupportedFileError`).
- **Encrypted-PDF rejection** via `reader.is_encrypted` — previously an
  encrypted PDF would either crash the parser or silently extract nothing.
- **Page-count bound**: `MAX_PDF_PAGES = 30`, checked before per-page text
  extraction, so a pathological 10,000-page PDF can't tie up a worker.
- **Parser timeout**: best-effort `SIGALRM`-based `PARSE_TIMEOUT_SECONDS =
  10` wall-clock bound around the actual parse call. **Honest limitation:**
  `SIGALRM` is POSIX-only — it is a real, functioning bound on the Linux
  Docker production target, but a no-op on Windows dev machines. Documented
  inline in the source, not silently assumed to work everywhere.
- **Early size guard**:
  [`backend/app/routers/profile.py`](backend/app/routers/profile.py)'s
  `upload_resume` now checks the `Content-Length` header against
  `resume_service.MAX_BYTES` before `await file.read()` fully buffers the
  body, so an oversized upload is rejected without first holding the whole
  file in memory.
- Tests: `tests/test_resume_upload_security.py` (11 tests) generate real
  PDF/DOCX bytes via `pypdf`/`python-docx` to exercise the magic-byte checks
  against real files, not fixtures with fabricated headers.

**Not implemented, explicitly documented rather than faked:**
`MALWARE_SCANNING_NOTE` in `resume_service.py` states plainly that no
antivirus/malware scanning is implemented — this requires either a paid
scanning service (e.g. ClamAV sidecar, VirusTotal API) or infrastructure
this environment doesn't currently provision. Flagged as an infrastructure
blocker, not worked around with a fake "scanned: true" flag.

---

## 5. LLM / prompt-injection security

Extended the delimiter pattern already established in `path_service.py`/
`conversation_service.py` (`<<<X>>>...<<<END_X>>>` plus an explicit
"treat as untrusted data" instruction) to the real Bedrock prompts in
[`backend/app/services/interview_service.py`](backend/app/services/interview_service.py):
`<<<LEARNER_CONTEXT>>>` (learner profile), `<<<CANDIDATE_TRANSCRIPT>>>`
(the interviewee's own answer text), `<<<INTERVIEW_TRANSCRIPT>>>` (the full
session transcript at finalize time) — none of these are LLM-controlled,
but all are learner-controlled free text that reaches a prompt, so they get
the same untrusted-data boundary already used for resumes/GitHub content/
feedback text.

**Confirmed, not assumed:** re-read `_ensure_course_in_catalog` in
`path_service.py` end to end. For any `youtube.com` URL the LLM proposes,
the function **discards** the LLM's claimed title/duration/channel and
re-fetches real metadata from the YouTube Data API via
`youtube_provider.YouTubeProviderAdapter`, then routes through
`catalog_service.ingest_youtube_result` — the LLM's fabricated data never
reaches the DB. Covered by
`test_youtube_url_is_reverified_never_trusted_from_llm_claims` (adversarial:
constructs an LLM payload with an invented title/duration and asserts the
real API-fetched values win).

**New this pass, closing a real inconsistency:** `catalog_service.
is_search_results_url()` detects a search-engine host (google/bing/yahoo/
yandex/baidu/duckduckgo/ecosia) combined with a `/search`-shaped path or a
real query param, and is now wired into **both** `catalog_service._check_url`
(new ingestions) **and** `ranking_engine.hard_filter()` (the shared choke
point between `generate_path` and the swap flow). Root cause: a real
production seed-era course was found with
`resource_url = "https://www.google.com/search?q=..."` — seed rows
(`source='seed'`, from the original CSV bootstrap) had never been validated
by `catalog_service`'s rules at all, and swap validated new URLs while
initial generation, pulling from the same `courses` table, did not. Fixing
it in the shared `hard_filter` closes the gap regardless of a candidate's
source or age, rather than only preventing new bad rows going forward.

Prerequisite filters, authorization, and catalog verification were
re-confirmed as **not** reachable or overridable from any LLM output path —
the LLM only ever supplies candidate text that is independently re-verified
(YouTube metadata) or filtered (search-results URLs, trusted-domain check)
before persistence; it has no code path that writes `user_id`, ownership,
or auth state.

---

## 6. Browser and deployment security

[`backend/app/middleware/security_headers.py`](backend/app/middleware/security_headers.py)
(new `SecurityHeadersMiddleware`, added in `main.py` before CORS) sends on
every response:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY` (clickjacking)
- `Permissions-Policy` (camera/microphone/geolocation denied)
- `Content-Security-Policy` — strict `default-src 'none'` for the JSON API;
  a looser, CDN-allowing CSP scoped only to `/docs`/`/redoc` (Swagger/ReDoc
  need their own script/style CDN sources to render at all)
- `Strict-Transport-Security` — sent **only** when the request scheme is
  actually `https` (checks `request.url.scheme` and `X-Forwarded-Proto`).
  **Honest current state:** the EC2 backend is reached over plain HTTP
  directly today (`http://13.206.51.130`), so HSTS is correctly *not* being
  sent in production right now — it activates automatically the moment TLS
  termination is added in front of the backend, with no further code change
  needed. Verified live: `curl -sI http://13.206.51.130/health` in this pass
  showed the other four headers present and HSTS correctly absent.
- Tests: `tests/test_security_headers.py` (5 tests, covers both the
  API-strict and docs-relaxed CSP branches, and both HTTP/HTTPS HSTS cases).

**CORS/credentials:** reviewed `main.py`'s CORS middleware config — no
change made; already scoped to the known Vercel frontend origin(s) rather
than `allow_origins=["*"]` with credentials, which was already correct
before this pass.

**No secrets in frontend bundle:** re-verified via
`tests/e2e/bundle-purity.spec.js` (13 tests) that the built `dist/` bundle
contains no `YOUTUBE_API_KEY` literal/reference and no other dev/mock
fabricated data — run fresh after every frontend change in this pass, not
assumed from an earlier run.

**`noopener noreferrer`:** normalized the 5 `target="_blank"` links that
had only `rel="noreferrer"` (spec-safe against reverse-tabnabbing already,
but not matching the exact requested wording) to `rel="noopener noreferrer"`
in `PersonalizedRoadmap.jsx` (×2) and `ResourcesScreen.jsx` (×3). Four other
occurrences (`NextActions.jsx`, `HackathonsScreen.jsx`,
`InternshipsScreen.jsx`, `ResourceItem.jsx`) were already compliant —
confirmed via grep before touching anything, not assumed.

**Dependency vulnerability scanning — new in this pass:**
[`.github/workflows/ci.yml`](.github/workflows/ci.yml) (new; the only prior
workflow, `deploy-backend.yml`, builds and ships the Docker image but never
ran the test suite or scanned dependencies at all). Two jobs:

- `backend-test`: installs `backend/requirements-dev.txt` (new — pytest,
  pytest-asyncio, pip-audit; never installed into the production Docker
  image, which only reads `requirements.txt`), runs the full 279-test suite
  against **fake** Supabase/Groq credentials (no real infrastructure is
  reachable from CI), then runs `pip-audit -r requirements.txt` and fails
  the build on any finding. Currently clean — verified locally via
  `pip-audit -r requirements.txt` → "No known vulnerabilities found".
- `frontend-audit`: `npm ci`, `npm run build` (fails on compile errors), then
  `npm audit`. **Real findings, honestly reported rather than force-fixed:**
  `esbuild <=0.24.2` (moderate, dev-server request-forgery, doesn't affect
  the built production bundle) and `react-router-dom` 6.x (moderate
  open-redirect + high SSR-hydration-deserialization CVE). Both fixes
  require a major-version bump (`vite` 6→8, `react-router-dom` 6→7) that
  `npm audit fix --force` would apply blindly — a breaking-change migration
  explicitly out of scope for a pass that must not redesign the UI or
  weaken existing functionality without dedicated regression testing. CI is
  configured to **report** moderate/high (visible in every run's log as a
  `::warning::`) and **fail only on critical**, so this doesn't block every
  future merge on a pre-existing, deliberately-deferred issue, while a truly
  new critical finding still stops the build.

  **Recommended follow-up** (not done here): a dedicated PR upgrading
  `react-router-dom` to v7, run through full route/navigation regression
  testing before merge — tracked as open infrastructure work, not silently
  dropped.

**Test-isolation fix discovered while building this CI job:** running the
suite against fake credentials (rather than the real local `.env`, which
had been masking the gap) surfaced that
`test_youtube_url_is_reverified_never_trusted_from_llm_claims`
(`tests/test_security_and_integrity.py`) and
`test_returns_only_eligible_verified_videos`
(`tests/test_youtube_provider.py`) both reached the **real, live**
`skill_aliases` table via `taxonomy_service`'s own module-level
`supabase_client` reference — a live-DB **read** leak (not a write), present
since the tests were written, invisible in local runs only because a real
`.env` was always present. Fixed by mocking
`app.services.taxonomy_service.resolve_skill` in both tests, matching the
pattern already used elsewhere in the same test files. Full suite re-run
against fake credentials afterward: 279/279 pass with zero network calls.

---

## Test results

Full backend suite, run twice — once against fake CI-style credentials
(proving isolation) and once against the real local `.env` (proving no
behavioral regression):

```
279 passed (fake credentials, zero live network calls)
279 passed (real local .env)
```

New/modified test files this phase: `test_security_headers.py` (5),
`test_interview_security.py` (11), `test_account_security.py` (19),
`test_routes_enum_validation.py` (8), `test_resume_upload_security.py` (11),
`test_generate_path_idempotency.py` (3), plus additions to
`test_rate_limit_durable.py` (+13) and the isolation fixes in
`test_security_and_integrity.py` / `test_youtube_provider.py` described
above.

Frontend: `npm run build` succeeds cleanly; `npx playwright test
tests/e2e/bundle-purity.spec.js` — 13/13 pass, re-run after every frontend
change in this pass.

## Deployment verification

- `e0d773a` (last backend-touching commit) deployed via
  `Deploy Backend to EC2` — confirmed **success** via the GitHub Actions API
  (`workflow_runs` for that SHA).
- Independently confirmed live: `curl http://13.206.51.130/health` →
  `{"status":"ok","version":"1.0.0"}`, HTTP 200.
- `f6c538a` (frontend-only) correctly did **not** trigger a backend
  redeploy — `deploy-backend.yml` is path-filtered to `backend/**`, as
  intended.
- No secret values were printed, logged, or committed at any point in this
  verification (GitHub masks `secrets.*` in Action logs regardless, and no
  new secret was introduced this phase).

## Honest list of unresolved infrastructure needs

1. **Malware/antivirus scanning for uploaded resumes** — not implemented.
   Requires a scanning service (ClamAV sidecar, VirusTotal API, or
   equivalent) this environment doesn't currently provision. Documented
   inline via `resume_service.MALWARE_SCANNING_NOTE`, never faked.
2. **`react-router-dom` v6→v7 / `vite` v6→v8 migration** — real moderate/
   high CVEs exist in current pinned versions; fixing requires a breaking
   major-version upgrade and full regression testing, deliberately deferred
   per this pass's "don't redesign/weaken" constraint. Tracked in CI as a
   non-blocking warning on every run so it stays visible.
3. **HSTS is currently inactive in production** because the EC2 backend is
   served over plain HTTP with no TLS termination in front of it. The
   header logic already handles the HTTPS case correctly and needs no
   further code change once TLS (e.g. an ALB, Nginx+certbot, or CloudFront)
   is added — this is an infrastructure gap, not a code gap.
4. **`SIGALRM`-based resume-parse timeout is POSIX-only** — real and
   effective on the Linux Docker production target, a documented no-op on
   Windows dev machines. No cross-platform equivalent was added since the
   only environment that matters for this bound (production) is covered.
5. **No full transactional-RPC refactor for multi-step mutations** beyond
   what idempotency keys + the generate_path at-most-one-active-path
   invariant already provide. No confirmed live incident from this gap was
   found in this pass; flagged as forward-looking hardening.
6. **`extra="forbid"` not yet added to the new strict schemas** — deferred
   to avoid a behavior change for any already-deployed frontend build that
   might send an extra field; a fast follow-up once frontend payloads are
   confirmed to send only known fields.
