const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testCleanState() {
  const browser = await chromium.launch({ headless: true });

  // Dark mode
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'dark');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });
  const darkPage = await darkContext.newPage();
  await darkPage.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
  await darkPage.waitForTimeout(600);
  await darkPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'dashboard_clean_dark.png') });

  await darkPage.goto('http://localhost:5173/auth', { waitUntil: 'networkidle' });
  await darkPage.waitForTimeout(600);
  await darkPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_clean_dark.png') });

  // Light mode
  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await lightContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'light');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      document.documentElement.classList.remove('dark');
    } catch (e) {}
  });
  const lightPage = await lightContext.newPage();
  await lightPage.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
  await lightPage.waitForTimeout(600);
  await lightPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'dashboard_clean_light.png') });

  await lightPage.goto('http://localhost:5173/auth', { waitUntil: 'networkidle' });
  await lightPage.waitForTimeout(600);
  await lightPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_clean_light.png') });

  await browser.close();
  console.log('Clean state screenshots saved successfully.');
}

testCleanState().catch(err => {
  console.error(err);
  process.exit(1);
});
