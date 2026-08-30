const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testSidebarLabels() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'light');
      window.localStorage.setItem('pf_dev_bypass', 'true');
    } catch (e) {}
  });

  const page = await context.newPage();
  await page.goto('http://localhost:5173/skills', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Capture sidebar in light theme
  const sidebar = page.locator('aside.pf-sidebar');
  await sidebar.screenshot({ path: path.join(SCREENSHOT_DIR, 'sidebar_capitalized_light.png') });
  console.log('Saved sidebar_capitalized_light.png');

  // Switch to dark theme
  await page.evaluate(() => {
    window.localStorage.setItem('pf_theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(400);

  await sidebar.screenshot({ path: path.join(SCREENSHOT_DIR, 'sidebar_capitalized_dark.png') });
  console.log('Saved sidebar_capitalized_dark.png');

  await browser.close();
}

testSidebarLabels().catch(err => {
  console.error(err);
  process.exit(1);
});
