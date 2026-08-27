import { test, expect } from '@playwright/test'

test.describe('PathFinder landing', () => {
  test('renders the sign-in card with all required copy', async ({ page }) => {
    await page.goto('/')
    // Brand + hero
    await expect(page.getByText('PathFinder').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /Build the path to/i })).toBeVisible()
    // Sign-in / Create account tabs and welcome section
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeVisible()
    await expect(page.getByText(/Welcome back|Create your account/)).toBeVisible()
    // Google button is present per the design contract
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible()
  })

  test('Create account tab reveals the Full name field', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    await expect(page.getByLabel('Full name')).toBeVisible()
  })

  test('password visibility toggle flips the input type', async ({ page }) => {
    await page.goto('/')
    const pw = page.locator('#pfa-pw')
    await pw.fill('secret')
    await expect(pw).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /Show password/i }).click()
    await expect(pw).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: /Hide password/i }).click()
    await expect(pw).toHaveAttribute('type', 'password')
  })
})
