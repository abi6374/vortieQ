import { test, expect } from '@playwright/test'

/**
 * Auth-gated flows. Skipped unless PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD
 * are provided so credentials never live in the repo. Set them locally with:
 *   $env:PLAYWRIGHT_EMAIL="…"; $env:PLAYWRIGHT_PASSWORD="…"; npx playwright test
 */
const EMAIL = process.env.PLAYWRIGHT_EMAIL
const PASSWORD = process.env.PLAYWRIGHT_PASSWORD
const shouldRun = Boolean(EMAIL && PASSWORD)

test.describe(shouldRun ? 'PathFinder authenticated flows' : 'PathFinder authenticated flows (skipped — no creds)', () => {
  test.skip(!shouldRun, 'Set PLAYWRIGHT_EMAIL + PLAYWRIGHT_PASSWORD to run authed tests')

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.locator('#pfa-email').fill(EMAIL)
    await page.locator('#pfa-pw').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL(/dashboard|onboarding/, { timeout: 15_000 })
  })

  test('sidebar navigates between every main section without blanking', async ({ page }) => {
    for (const label of ['Progress', 'Skill insights', 'Resources', 'My roadmap']) {
      await page.getByRole('button', { name: label, exact: true }).click()
      // Each section renders something with real text, not a blank page.
      await expect(page.locator('body')).not.toBeEmpty()
      await expect(page.getByText('PathFinder').first()).toBeVisible()
    }
  })

  test('shared AI conversation persists across routes', async ({ page }) => {
    await page.getByRole('button', { name: /Ask PathFinder/i }).click()
    const hello = `pw-${Date.now()}`
    await page.getByPlaceholder(/Ask PathFinder anything/i).fill(hello)
    await page.getByRole('button', { name: /Send/i }).click()
    await expect(page.getByText(hello)).toBeVisible({ timeout: 15_000 })

    // Navigate somewhere else and reopen the coach — the message should still be there.
    await page.getByRole('button', { name: 'Resources', exact: true }).click()
    await page.getByRole('button', { name: /Ask PathFinder/i }).click()
    await expect(page.getByText(hello)).toBeVisible()
  })

  test('Account changes persist across reload', async ({ page }) => {
    await page.goto('/account')
    const nameField = page.getByLabel('Name')
    const stamp = `PW Test ${Date.now().toString().slice(-5)}`
    await nameField.fill(stamp)
    await page.getByRole('button', { name: /Save changes/i }).click()
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 10_000 })
    await page.reload()
    await expect(nameField).toHaveValue(stamp)
  })
})
