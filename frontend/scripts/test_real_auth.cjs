const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function runRealAuthTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const testEmail = `dev_tester_${Date.now()}@test.com`;
  const testPassword = 'Password123!@#';

  console.log(`Testing SignUp with ${testEmail}...`);
  await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle' });

  // Click "Create account" tab
  const createTab = page.locator('button:has-text("Create account")');
  await createTab.click();
  await page.waitForTimeout(500);

  // Fill sign up fields
  const nameInput = page.locator('input[placeholder*="Alex" i], input[type="text"]').first();
  if (await nameInput.isVisible()) {
    await nameInput.fill('Alex Rivera');
  }

  const emailInput = page.locator('input[type="email"]');
  await emailInput.fill(testEmail);

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(testPassword);

  const submitBtn = page.locator('button[type="submit"], button:has-text("Create account"), button:has-text("Sign up")').last();
  await submitBtn.click();
  console.log('Submitted signup form...');

  await page.waitForTimeout(3000);
  console.log('Current URL after submit:', page.url());

  // Take screenshot
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'signup_result.png'), fullPage: true });

  await browser.close();
}

runRealAuthTest();
