const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testOverlayProgressFull() {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'light');
      window.localStorage.setItem('pf_dev_bypass', 'true');
    } catch (e) {}
  });

  const page = await context.newPage();

  // Intercept any request ending in /api/paths/generate
  await page.route(url => url.pathname.endsWith('/api/paths/generate'), async route => {
    console.log('Intercepted /api/paths/generate! Holding for 7 seconds to sample smooth progress...');
    await new Promise(r => setTimeout(r, 7000));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'test-path-123' })
    });
  });

  await page.route(url => url.pathname.includes('/api/profile'), async route => {
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
  await page.waitForTimeout(500);

  const roleInput = page.locator('input[type="text"]').first();
  if (await roleInput.isVisible()) await roleInput.fill('Data Analyst');

  const textarea = page.locator('textarea').first();
  if (await textarea.isVisible()) {
    await textarea.fill('I have 2 years of experience with Python, SQL, and Excel for data analysis and reporting. I have built automated ETL pipelines and dashboards in PowerBI.');
    await page.waitForTimeout(300);
  }

  const continueBtn = page.locator('button:has-text("Continue"):not(:disabled)').first();
  if (await continueBtn.isVisible()) {
    await continueBtn.click();
    await page.waitForTimeout(800);
  }

  const continueBtn2 = page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("Confirm")').first();
  if (await continueBtn2.isVisible()) {
    await continueBtn2.click();
    await page.waitForTimeout(800);
  }

  const planBtn = page.locator('.btn-plan');
  await planBtn.waitFor({ state: 'visible' });
  await planBtn.click();

  const overlay = page.locator('.genov');
  await overlay.waitFor({ state: 'visible', timeout: 5000 });

  // Frame 1: ~10% (at 0.8s)
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_smooth_10pct.png') });
  console.log('Saved overlay_smooth_10pct.png');

  // Frame 2: ~35% (at 2.8s)
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_smooth_35pct.png') });
  console.log('Saved overlay_smooth_35pct.png');

  // Frame 3: ~65% (at 5.5s)
  await page.waitForTimeout(2700);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_smooth_65pct.png') });
  console.log('Saved overlay_smooth_65pct.png');

  // Frame 4: 100% Success state (after 7s fulfilled)
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_smooth_100pct.png') });
  console.log('Saved overlay_smooth_100pct.png');

  await browser.close();
  console.log('Full progress test finished successfully!');
}

testOverlayProgressFull().catch(err => {
  console.error(err);
  process.exit(1);
});
