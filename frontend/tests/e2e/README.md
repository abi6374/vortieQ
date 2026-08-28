# PathFinder end-to-end tests

Playwright suite for issue 29 of the connectivity brief. Auth-free tests run
out of the box; authed tests skip cleanly if you haven't supplied credentials.

## Setup (once)

```bash
cd frontend
npm install                    # installs @playwright/test
npx playwright install         # downloads the Chromium browser (~120MB)
```

## Run

```bash
# Full suite against the deployed Vercel app (default)
npm run test:e2e

# UI mode — pick tests, inspect, time-travel
npm run test:e2e:ui

# Against a local dev server
PLAYWRIGHT_BASE_URL=http://localhost:5173 npm run test:e2e
```

## Auth-gated tests

`authed.spec.js` needs an existing user. Set the env vars before running:

```bash
$env:PLAYWRIGHT_EMAIL="verify@example.com"
$env:PLAYWRIGHT_PASSWORD="…"
npm run test:e2e
```

Credentials are never stored in the repo. Tests skip if either is missing.

## What is covered

| Spec | Focus |
|------|-------|
| `health.spec.js` | Backend `/health`, unauthenticated 401 on `/api/roadmap`, CORS preflight from the Vercel origin |
| `landing.spec.js` | Landing renders, tab switching reveals the Full name field, password visibility toggle |
| `authed.spec.js` | Sidebar navigates every section without blanking, shared AI conversation persists across routes, Account changes persist across reload |

Add more per issue #29's test matrix as we harden the app.
