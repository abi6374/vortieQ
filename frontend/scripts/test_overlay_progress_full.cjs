const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testOverlayProgressFull() {
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

  // Intercept profile & generate API calls
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

  await page.route(url => url.pathname.endsWith('/api/paths/generate'), async route => {
    console.log('Intercepted generate! Holding for 16s to capture 99% progression...');
    await new Promise(r => setTimeout(r, 16000));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'test-path-123' })
    });
  });

  await page.goto('http://localhost:5173/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Step 1: Fill experience textarea
  const textarea = page.locator('textarea').first();
  await textarea.fill('I have 2 years of experience with Python, SQL, and Excel for data analysis.');
  await page.waitForTimeout(400);

  // Click Step 1 Continue
  const btn1 = page.locator('button:has-text("Continue"):not(:disabled)').first();
  await btn1.click();
  await page.waitForTimeout(1200);

  // Step 2: AssessSkills Continue
  const btn2 = page.locator('button:has-text("Continue")').first();
  await btn2.waitFor({ state: 'visible', timeout: 5000 });
  await btn2.click();
  await page.waitForTimeout(1200);

  // Step 3: GoalCompass -> click button
  const buildBtn = page.locator('button.btn-plan, button:has-text("Create my learning plan")').first();
  await buildBtn.waitFor({ state: 'visible', timeout: 5000 });
  await buildBtn.click();
  console.log('Clicked build path button, overlay now visible!');

  // Frame 1: ~65% (at 5.5s)
  await page.waitForTimeout(5500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_smooth_65pct.png') });
  console.log('Saved overlay_smooth_65pct.png');

  // Frame 2: ~96% (at 12s)
  await page.waitForTimeout(6500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_smooth_96pct.png') });
  console.log('Saved overlay_smooth_96pct.png');

  // Frame 3: ~99% (at 15s)
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_smooth_99pct.png') });
  console.log('Saved overlay_smooth_99pct.png');

  // Frame 4: 100% Success state
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_smooth_100pct.png') });
  console.log('Saved overlay_smooth_100pct.png');

  await browser.close();
  console.log('All overlay frames captured successfully!');
}

testOverlayProgressFull().catch(err => {
  console.error(err);
  process.exit(1);
});
