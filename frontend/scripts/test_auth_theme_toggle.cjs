const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testAuthThemeToggle() {
  console.log('Testing Auth Theme Toggle...');
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'light');
      document.documentElement.classList.remove('dark');
    } catch (e) {}
  });

  const page = await context.newPage();
  await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // 1. Screenshot Light Mode
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_theme_toggle_light.png') });
  console.log('Saved auth_theme_toggle_light.png');

  // 2. Click ThemeToggle button
  const toggleBtn = page.locator('button[title*="Switch to"], button[aria-label*="Switch to"]').first();
  await toggleBtn.waitFor({ state: 'visible' });
  await toggleBtn.click();
  await page.waitForTimeout(600);

  // 3. Screenshot Dark Mode
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_theme_toggle_dark.png') });
  console.log('Saved auth_theme_toggle_dark.png');

  await browser.close();
  console.log('Auth Theme Toggle test finished successfully!');
}

testAuthThemeToggle().catch(err => {
  console.error(err);
  process.exit(1);
});
