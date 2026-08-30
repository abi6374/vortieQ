import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Bundle-purity regression test (Part A / Part E of the platform audit).
 *
 * Every one of these strings names a real fabrication or dev/e2e-bypass
 * pattern that was found and removed from this codebase this session (see
 * docs/platform_audit_remediation.md section 3 for the full history). Each
 * is either:
 *   - dev/e2e-only code gated behind `import.meta.env.DEV` (a Vite
 *     build-time constant, false in a real `vite build`), which Rollup's
 *     dead-code elimination should strip entirely from what ships to
 *     Vercel - not just "hard to trigger", genuinely absent from the JS; or
 *   - a fabricated default value (a hardcoded confidence percentage, a
 *     fake detected skill, a fabricated dev-bypass identity) that has no
 *     legitimate reason to exist in the shipped bundle at all.
 *
 * This was previously verified by hand (an ad-hoc `grep -c` after every
 * fabrication-removal round, documented in docs/testing_guide.md) - this
 * test makes that check automatic and reproducible in CI instead of
 * relying on someone remembering to re-run it by hand before every release.
 *
 * Requires `npm run build` to have already produced `dist/` (this is a
 * fast static-file check with no browser or backend involved - `request`
 * fixture is unused, this only reads the filesystem).
 */

function readDistBundle() {
  const distDir = path.resolve(__dirname, '../../dist/assets')
  if (!fs.existsSync(distDir)) {
    return null
  }
  const jsFiles = fs.readdirSync(distDir).filter((f) => f.endsWith('.js'))
  return jsFiles.map((f) => fs.readFileSync(path.join(distDir, f), 'utf-8')).join('\n')
}

test.describe('production bundle contains no mock/dev/fabricated learner data', () => {
  let bundle

  test.beforeAll(() => {
    bundle = readDistBundle()
    test.skip(bundle === null, 'dist/ not found - run `npm run build` before this test (see docs/testing_guide.md)')
  })

  const forbiddenStrings = [
    // Dev/e2e auth and roadmap bypasses (AuthContext.jsx, useRoadmap.js) -
    // gated behind import.meta.env.DEV, must be dead-code-eliminated.
    'pf_dev_bypass',
    'e2e_mock_auth',
    'MOCK_DEV_ROADMAP',
    'dev-bypass@pathfinder.local',
    'dev-bypass-token',
    // A historical fabricated dev-bypass identity, confirmed removed -
    // regression guard against it silently coming back.
    'hcltech@pathfinder',
    // LearnerIntakeWorkspace.jsx's removed free-text keyword-to-fake-skill
    // scanner - fabricated confidence_pct:82/'intermediate' for any of 49
    // hardcoded tech words found anywhere in the learner's goal text.
    'extractKeywordsFromText',
    'COMMON_TECH_SKILLS',
    // AssessSkills.jsx's removed arbitrary confidence-invention formula and
    // its hardcoded 3-skill fallback.
    'confidenceFor',
    'Added during skill calibration',
    // The literal fabricated confidence values these functions used to
    // hardcode, and the "modern stacks" filler fallback text.
    "'modern stacks'",
  ]

  for (const needle of forbiddenStrings) {
    test(`bundle does not contain "${needle}"`, () => {
      expect(bundle.includes(needle)).toBe(false)
    })
  }

  test('bundle does not contain the fabricated default confidence literal 82%% pattern', () => {
    // Matches the exact `X: 82` shape used by the old fabrication code
    // (confidence_pct: 82) without false-flagging on an unrelated number
    // 82 appearing anywhere else (e.g. a CSS value or an unrelated id).
    expect(/confidence_pct["']?\s*:\s*82\b/.test(bundle)).toBe(false)
  })

  // YouTube Data API v3 adapter (backend-only by design - see
  // app/services/youtube_provider.py and app/config.py's YOUTUBE_API_KEY).
  // The frontend never imports or references it at all, so this is a
  // structural guarantee, not a runtime gate that could be bypassed - but
  // the same "verify, don't just assume" standard applies to a secret as
  // to any other claim in this codebase. A real Google API key has a
  // recognizable literal prefix ("AIza") that a bundle containing one
  // would trivially match; a bare env var NAME appearing at all would
  // also indicate someone wired it into client code by mistake.
  test('bundle contains no YouTube API key literal or reference', () => {
    expect(/\bAIza[0-9A-Za-z_-]{30,}\b/.test(bundle)).toBe(false)
    expect(bundle.includes('YOUTUBE_API_KEY')).toBe(false)
  })
})
