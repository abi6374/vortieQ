const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testOverlayDirect() {
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

  // Intercept all generate requests and hold for 22 seconds
  await page.route(url => url.pathname.includes('/generate') || url.pathname.includes('/paths'), async route => {
    console.log('Intercepted:', route.request().url());
    if (route.request().method() === 'POST') {
      console.log('Holding generate POST request for 22s...');
      await new Promise(r => setTimeout(r, 22000));
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'test-path-123' })
      });
    }
    return route.continue();
  });

  await page.route(url => url.pathname.includes('/profile'), async route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        topics: [{ name: 'Python', confidence: 'high', suggested_level: 'intermediate' }],
        detected_years: 2,
        recommended_goal: 'Data Analyst'
      })
    });
  });

  await page.goto('http://localhost:5173/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Fill in experience textarea
  const textarea = page.locator('textarea').first();
  if (await textarea.isVisible()) {
    await textarea.fill('I have 2 years of experience with Python, SQL, and Excel for data analysis and reporting.');
    await page.waitForTimeout(300);
  }

  // Click Step 1 Continue
  const btn1 = page.locator('button:has-text("Continue"):not(:disabled)').first();
  if (await btn1.isVisible()) {
    await btn1.click();
    await page.waitForTimeout(1000);
  }

  // Step 2 Continue
  const skipOrContinue = page.locator('button:has-text("Continue"), button:has-text("Skip")').first();
  if (await skipOrContinue.isVisible()) {
    await skipOrContinue.click();
    await page.waitForTimeout(1000);
  }

  // Step 3: Create my learning plan
  const planBtn = page.locator('button.btn-plan, button:has-text("Create my learning plan")').first();
  if (await planBtn.isVisible()) {
    await planBtn.click();
    console.log('Generating overlay mounted!');

    // Sample at 5.5s (~65%)
    await page.waitForTimeout(5500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_progress_65pct.png') });
    console.log('Saved overlay_progress_65pct.png');

    // Sample at 12.5s (~96%)
    await page.waitForTimeout(7000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_progress_96pct.png') });
    console.log('Saved overlay_progress_96pct.png');

    // Sample at 18.0s (~99%)
    await page.waitForTimeout(5500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_progress_99pct.png') });
    console.log('Saved overlay_progress_99pct.png');
  }

  await browser.close();
  console.log('Test completed successfully!');
}

testOverlayDirect().catch(err => {
  console.error(err);
  process.exit(1);
});
