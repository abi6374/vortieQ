const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testOverlayAnimation() {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'light');
      window.localStorage.setItem('pf_dev_bypass', 'true');
    } catch (e) {}
  });

  const page = await context.newPage();

  // Mock API to delay response by 12s so we observe the continuous, steady progress bar
  await page.route('**/api/paths/generate*', async route => {
    await new Promise(r => setTimeout(r, 12000));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'test-path-123' })
    });
  });

  await page.route('**/api/profile/extract-structured*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        topics: [{ topic_name: 'Python', confidence: 'high', rating: 'intermediate' }],
        detected_years_experience: 2,
        recommended_goal: 'Data Analyst'
      })
    });
  });

  await page.goto('http://localhost:5173/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Fill in role input if empty
  const roleInput = page.locator('input[type="text"]').first();
  if (await roleInput.isVisible()) {
    await roleInput.fill('Data Analyst');
  }

  // Type in experience textarea
  const textarea = page.locator('textarea').first();
  if (await textarea.isVisible()) {
    await textarea.fill('I have 2 years of experience with Python, SQL, and Excel for data analysis and reporting. I have built automated ETL pipelines and dashboards in PowerBI.');
    await page.waitForTimeout(300);
  }

  // Click Continue from Intake
  const continueBtn = page.locator('button:has-text("Continue"):not(:disabled)').first();
  if (await continueBtn.isVisible()) {
    await continueBtn.click();
    await page.waitForTimeout(1000);
  }

  // Click Continue from AssessSkills (topics)
  const continueBtn2 = page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("Confirm")').first();
  if (await continueBtn2.isVisible()) {
    await continueBtn2.click();
    await page.waitForTimeout(1000);
  }

  // GoalCompass: Click .btn-plan
  const planBtn = page.locator('.btn-plan');
  await planBtn.waitFor({ state: 'visible' });
  console.log('Clicking .btn-plan to trigger GeneratingOverlay...');
  await planBtn.click();

  // Now GeneratingOverlay is mounted!
  const overlay = page.locator('.genov');
  await overlay.waitFor({ state: 'visible', timeout: 5000 });
  console.log('GeneratingOverlay visible!');

  // Frame 1: 0.3s (~5%)
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_progress_frame1.png') });
  console.log('Saved overlay_progress_frame1.png');

  // Frame 2: 2.5s (~30%)
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_progress_frame2.png') });
  console.log('Saved overlay_progress_frame2.png');

  // Frame 3: 5.5s (~60%)
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_progress_frame3.png') });
  console.log('Saved overlay_progress_frame3.png');

  // Frame 4: 8.5s (~82%)
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_progress_frame4.png') });
  console.log('Saved overlay_progress_frame4.png');

  await browser.close();
  console.log('All animation frames saved successfully!');
}

testOverlayAnimation().catch(err => {
  console.error(err);
  process.exit(1);
});
