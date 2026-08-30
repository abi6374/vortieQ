const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve('C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969/playwright_screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTest() {
  console.log('=== TEST 1: FRESH USER ONBOARDING (No Existing Roadmap) ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Add auth mock without an existing roadmap
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('e2e_mock_auth', 'true');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.removeItem('pf_github_preference_mock_user');
      window.localStorage.removeItem('pf_github_preference_guest');
    } catch (e) {}
  });

  const page = await context.newPage();

  console.log('1. Navigating to /onboarding as fresh user...');
  await page.goto('http://localhost:5173/onboarding', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Capture Step 1: Learner Intake (Light)
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'rebuilt_onboarding_step1_light.png') });
  console.log('Saved rebuilt_onboarding_step1_light.png');

  // Verify profile dropdown is NOT present on fresh onboarding
  const profileDropdown = await page.locator('[data-testid="user-profile-dropdown"], .user-profile-dropdown, button:has-text("Account")').count();
  console.log('Profile dropdown count on fresh onboarding (expected 0):', profileDropdown);

  // Verify "What PathFinder will understand" is present
  const understandHeader = await page.locator('text=What PathFinder will understand').isVisible();
  console.log('"What PathFinder will understand" visible:', understandHeader);

  // Test Dark Mode on Step 1
  await page.locator('button[aria-label*="Switch to"]').first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'rebuilt_onboarding_step1_dark.png') });
  console.log('Saved rebuilt_onboarding_step1_dark.png');

  // Switch back to light
  await page.locator('button[aria-label*="Switch to"]').first().click();
  await page.waitForTimeout(300);

  // Fill in required background description
  console.log('2. Entering background description in Step 1...');
  const textarea = page.locator('textarea');
  await textarea.fill('I have 2 years of Python experience building backend APIs with FastAPI and PostgreSQL. I understand descriptive statistics and basic Pandas. I want to become a Senior AI Engineer.');
  await page.waitForTimeout(400);

  // Click Continue to move to Step 2: GitHub Integration
  console.log('3. Clicking Continue to move to Step 2 (GitHub Integration)...');
  await page.locator('button:has-text("Continue")').first().click();
  await page.waitForTimeout(1000);

  // Capture Step 2: GitHub Integration (Light)
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'rebuilt_onboarding_step2_github_light.png') });
  console.log('Saved rebuilt_onboarding_step2_github_light.png');

  // Verify Step 2 elements
  const githubHeading = await page.locator('text=Connect your GitHub profile').isVisible();
  console.log('Step 2 "Connect your GitHub profile" visible:', githubHeading);

  // Test Dark Mode on Step 2
  await page.locator('button[aria-label*="Switch to"]').first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'rebuilt_onboarding_step2_github_dark.png') });
  console.log('Saved rebuilt_onboarding_step2_github_dark.png');

  // Switch back to light
  await page.locator('button[aria-label*="Switch to"]').first().click();
  await page.waitForTimeout(300);

  // Click "Skip for now" to move to Step 3: Assess Skills
  console.log('4. Clicking "Skip for now" to proceed to Step 3 (Assess Skills)...');
  await page.locator('button:has-text("Skip for now")').first().click();
  await page.waitForTimeout(1000);

  // Capture Step 3: Assess Skills (Light)
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'rebuilt_onboarding_step3_skills_light.png') });
  console.log('Saved rebuilt_onboarding_step3_skills_light.png');

  await browser.close();
  console.log('=== All tests completed successfully! ===');
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
