const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testAuthLayout() {
  const browser = await chromium.launch({ headless: true });

  // 1. Light Mode Sign In & Create Account
  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await lightContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'light');
    } catch (e) {}
  });

  const page = await lightContext.newPage();
  await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_signin_centered_light.png') });
  console.log('Saved auth_signin_centered_light.png');

  // Switch to Create Account tab
  const createTab = page.locator('button:has-text("Create account")').first();
  await createTab.click();
  await page.waitForTimeout(400);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_create_placeholder_light.png') });
  console.log('Saved auth_create_placeholder_light.png');

  // 2. Dark Mode Sign In & Create Account
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'dark');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const darkPage = await darkContext.newPage();
  await darkPage.goto('http://localhost:5173/auth', { waitUntil: 'networkidle' });
  await darkPage.waitForTimeout(600);

  await darkPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_signin_centered_dark.png') });
  console.log('Saved auth_signin_centered_dark.png');

  const darkCreateTab = darkPage.locator('button:has-text("Create account")').first();
  await darkCreateTab.click();
  await darkPage.waitForTimeout(400);

  await darkPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_create_placeholder_dark.png') });
  console.log('Saved auth_create_placeholder_dark.png');

  await browser.close();
  console.log('All AuthScreen layout & placeholder tests completed!');
}

testAuthLayout().catch(err => {
  console.error(err);
  process.exit(1);
});
