const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../../../../.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969/playwright_screenshots');

async function testLandingPage() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-web-security', '--allow-running-insecure-content']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });

  const page = await context.newPage();

  console.log('🚀 Navigating to Landing Page (Light Mode)...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. Hero light
  await page.screenshot({ path: path.join(OUT_DIR, '10_landing_hero_light.png') });
  console.log('📸 Captured: 10_landing_hero_light.png');

  // 2. Scroll to Pillars & Demo
  const demoSection = page.locator('#demo');
  if (await demoSection.count() > 0) {
    await demoSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, '11_landing_demo_light.png') });
    console.log('📸 Captured: 11_landing_demo_light.png');

    // Test clicking a task in the interactive simulator
    const taskButton = page.locator('#demo button').first();
    if (await taskButton.count() > 0) {
      await taskButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUT_DIR, '11_landing_demo_interacted_light.png') });
      console.log('📸 Captured: 11_landing_demo_interacted_light.png');
    }
  }

  // 3. Scroll to Coach and Comparison
  const coachSection = page.locator('#coach');
  if (await coachSection.count() > 0) {
    await coachSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, '12_landing_coach_light.png') });
    console.log('📸 Captured: 12_landing_coach_light.png');
  }

  // 4. Test Dark Mode
  console.log('🌙 Toggling Dark Mode on Landing Page...');
  const themeBtn = page.locator('header button[aria-label="Toggle Theme"]');
  if (await themeBtn.count() > 0) {
    await themeBtn.click();
    await page.waitForTimeout(1000);

    // Scroll to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, '10_landing_hero_dark.png') });
    console.log('📸 Captured: 10_landing_hero_dark.png');

    // Demo dark
    if (await demoSection.count() > 0) {
      await demoSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUT_DIR, '11_landing_demo_dark.png') });
      console.log('📸 Captured: 11_landing_demo_dark.png');
    }
  }

  await browser.close();
  console.log('🎉 Landing Page Playwright Audit Completed!');
}

testLandingPage().catch((err) => {
  console.error('❌ Error during landing test:', err);
  process.exit(1);
});
