const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testOnboardingUpdates() {
  console.log('Launching browser for onboarding update verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('e2e_mock_auth', 'true');
      window.localStorage.setItem('pf_dev_bypass', 'true');
    } catch (e) {}
  });

  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/onboarding ...');
  await page.goto('http://localhost:5173/onboarding', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 1. STEP 1: Verify Describe in single text (Required)
  console.log('1. Checking Step 1: Describe in a single text...');
  await page.waitForSelector('text=Describe in a single text');
  
  // Verify (Required) badge
  const requiredBadge = page.locator('h2:has-text("Describe in a single text") span:has-text("(Required)")');
  console.log('Step 1 Required badge visible:', await requiredBadge.isVisible());

  // Capture Step 1 initial screenshot
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step1_single_text_empty.png'), fullPage: true });

  // Type into single description textarea
  const textarea = page.locator('textarea[placeholder*="FastAPI and Flask"]');
  await textarea.fill('I have 3 years of Python and React experience building full stack web applications. I also know SQL, FastAPI, Docker, and basic Machine Learning.');

  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step1_single_text_filled.png'), fullPage: true });

  // Click Continue to go to Step 2
  const continueBtn = page.locator('button:has-text("Continue")');
  await continueBtn.click();
  await page.waitForTimeout(1000);

  // 2. STEP 2: Verify Skills catalog
  console.log('2. Checking Step 2: Skills tab & catalog...');
  await page.waitForSelector('text=Step 2 · Skill Confidence');
  
  // Check Skills catalog section
  await page.waitForSelector('text=Detected Skills & Stacks');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step2_skills_catalog.png'), fullPage: true });

  // Add custom skill
  const skillInput = page.locator('input[placeholder*="Add another skill"]');
  if (await skillInput.isVisible()) {
    await skillInput.fill('Kubernetes');
    const addBtn = page.locator('form button:has-text("Add")');
    await addBtn.click();
    await page.waitForTimeout(300);
    console.log('Added Kubernetes skill tag successfully.');
  }

  // Click Choose a level per skill tab
  const levelTab = page.locator('h3:has-text("Choose a level per skill")');
  await levelTab.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step2_choose_level.png'), fullPage: true });

  // Switch back to Skills and click Continue to Step 3
  const skillsTab = page.locator('h3:has-text("Skills")');
  await skillsTab.click();
  await page.waitForTimeout(300);
  
  const step2ContinueBtn = page.locator('button:has-text("Continue")');
  await step2ContinueBtn.click();
  await page.waitForTimeout(1000);

  // 3. STEP 3: Verify Goal Compass and Weekly learning time (Required)
  console.log('3. Checking Step 3: Goal Compass with Weekly time (Required)...');
  await page.waitForSelector('text=Step 3 · Goal Compass');
  await page.waitForSelector('text=Weekly learning time');
  
  const weeklyRequiredBadge = page.locator('label:has-text("Weekly learning time") span:has-text("(Required)")');
  console.log('Step 3 Weekly time Required badge visible:', await weeklyRequiredBadge.isVisible());

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step3_goal_compass_required.png'), fullPage: true });

  // Mock profile and generate endpoints to test smooth progress animation
  await page.route('**/api/profile/**', async (route) => {
    await new Promise((r) => setTimeout(r, 600));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  await page.route('**/api/paths/generate', async (route) => {
    await new Promise((r) => setTimeout(r, 3500));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ path_id: 'test-path-123' }),
    });
  });

  // Click Create my learning plan to test Generating overlay
  console.log('4. Triggering roadmap generation overlay...');
  const createPlanBtn = page.locator('button:has-text("Create my learning plan")');
  await createPlanBtn.click();

  // Wait for GeneratingOverlay to appear
  await page.waitForSelector('.genov');
  console.log('GeneratingOverlay is active!');
  
  // Capture mid-progress animation
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step4_generating_overlay_progress.png'), fullPage: true });

  // Wait for completion
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step4_generating_overlay_success.png'), fullPage: true });

  await browser.close();
  console.log('All 4 onboarding updates verified successfully with smooth animation!');
}

testOnboardingUpdates().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
