const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testDarkModeFixes() {
  console.log('Testing dark mode fixes for SkillLevelPanel, Date input, and Weekly learning time slider...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('e2e_mock_auth', 'true');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'dark');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const page = await context.newPage();

  console.log('Navigating to /onboarding in dark mode...');
  await page.goto('http://localhost:5173/onboarding', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Fill single description in Step 1 to proceed to Step 2
  const textarea = page.locator('textarea[placeholder*="FastAPI and Flask"]');
  await textarea.fill('I have experience with Excel, VBA, HTML, Python, and SQL for building data analytics tools.');
  await page.waitForTimeout(400);

  const continueBtn = page.locator('button:has-text("Continue")');
  await continueBtn.click();
  await page.waitForTimeout(1000);

  // 1. STEP 2: Verify Choose a level per skill in Dark Mode
  console.log('1. Checking Step 2: Choose a level per skill in Dark Mode...');
  const levelTab = page.locator('h3:has-text("Choose a level per skill")');
  await levelTab.click();
  await page.waitForTimeout(600);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dark_step2_skill_levels.png'), fullPage: true });
  console.log('Saved dark_step2_skill_levels.png');

  // Proceed to Step 3
  const step2ContinueBtn = page.locator('button:has-text("Continue")');
  await step2ContinueBtn.click();
  await page.waitForTimeout(1000);

  // 2. STEP 3: Verify Date Input & Weekly Learning Time Slider in Dark Mode
  console.log('2. Checking Step 3: Date Input & Weekly Learning Time Slider in Dark Mode...');
  await page.waitForSelector('text=Step 3 · Goal Compass');
  await page.waitForTimeout(500);

  // Adjust slider to 19 hours
  const slider = page.locator('#gc-weekly');
  if (await slider.isVisible()) {
    await slider.fill('19');
    await page.waitForTimeout(300);
  }

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dark_step3_goal_compass.png'), fullPage: true });
  console.log('Saved dark_step3_goal_compass.png');

  // 3. STEP 4: Verify GeneratingOverlay in Dark Mode
  console.log('3. Checking Step 4: GeneratingOverlay in Dark Mode...');
  // Mock endpoints
  await page.route('**/api/profile/**', async (route) => {
    await new Promise((r) => setTimeout(r, 600));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  await page.route('**/api/paths/generate', async (route) => {
    await new Promise((r) => setTimeout(r, 4000));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ path_id: 'test-path-dark' }),
    });
  });

  const createPlanBtn = page.locator('button:has-text("Create my learning plan")');
  await createPlanBtn.click();

  await page.waitForSelector('.genov');
  console.log('GeneratingOverlay is active in dark mode!');

  // Capture in-progress animation in dark theme
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dark_step4_generating_overlay.png'), fullPage: true });
  console.log('Saved dark_step4_generating_overlay.png');

  // Capture 100% completed state in dark theme
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dark_step4_generating_overlay_ready.png'), fullPage: true });
  console.log('Saved dark_step4_generating_overlay_ready.png');

  await browser.close();
  console.log('All dark mode verification tests completed successfully!');
}

testDarkModeFixes().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
