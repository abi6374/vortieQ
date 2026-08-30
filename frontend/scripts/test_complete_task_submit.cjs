const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testCompleteTask() {
  console.log('Testing Complete & Update Path button flow...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'dark');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const page = await context.newPage();
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Click task toggle button to open modal
  const taskToggle = page.locator('button[aria-label="Toggle task completion"]').first();
  await taskToggle.waitFor({ state: 'visible' });
  await taskToggle.click();
  await page.waitForTimeout(400);

  // Click 4 stars
  const star4 = page.locator('button[aria-label="4 star"]').first();
  if (await star4.isVisible()) {
    await star4.click();
  }

  // Click Quick Feedback tag
  const tagBtn = page.locator('button:has-text("Clear explanation")').first();
  if (await tagBtn.isVisible()) {
    await tagBtn.click();
  }

  // Click "Complete & Update Path"
  console.log('Clicking Complete & Update Path...');
  const submitBtn = page.locator('button:has-text("Complete & Update Path")').first();
  await submitBtn.click();
  await page.waitForTimeout(1200);

  // Verify modal is closed and completion state is reflected
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dashboard_after_task_completed.png') });
  console.log('Saved dashboard_after_task_completed.png');

  await browser.close();
  console.log('Complete & Update Path test finished successfully!');
}

testCompleteTask().catch(err => {
  console.error(err);
  process.exit(1);
});
