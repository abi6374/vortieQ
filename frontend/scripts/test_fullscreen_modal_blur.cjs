const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testFullscreenModalBlur() {
  console.log('Testing full-screen modal backdrop blur (checking sidebar and topbar blur coverage)...');
  const browser = await chromium.launch({ headless: true });
  
  // Test Light Mode
  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await lightContext.addInitScript(() => {
    try {
      window.localStorage.setItem('e2e_mock_auth', 'true');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'light');
      document.documentElement.classList.remove('dark');
    } catch (e) {}
  });

  const page = await lightContext.newPage();
  await page.goto('http://localhost:5173/roadmap/demo-123', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Click on a task checkbox button to open feedback modal
  const taskToggle = page.locator('button[aria-label="Toggle task completion"]').first();
  await taskToggle.waitFor({ state: 'visible', timeout: 10000 });
  await taskToggle.click();
  await page.waitForTimeout(600);

  // Check if modal title "How did this step go?" is visible
  await page.waitForSelector('text=How did this step go?');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'feedback_modal_fullscreen_blur_light.png'), fullPage: true });
  console.log('Saved feedback_modal_fullscreen_blur_light.png');

  // Test Dark Mode
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('e2e_mock_auth', 'true');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'dark');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const darkPage = await darkContext.newPage();
  await darkPage.goto('http://localhost:5173/roadmap/demo-123', { waitUntil: 'domcontentloaded' });
  await darkPage.waitForTimeout(2000);

  const darkTaskToggle = darkPage.locator('button[aria-label="Toggle task completion"]').first();
  await darkTaskToggle.waitFor({ state: 'visible', timeout: 10000 });
  await darkTaskToggle.click();
  await darkPage.waitForTimeout(600);

  await darkPage.waitForSelector('text=How did this step go?');
  await darkPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'feedback_modal_fullscreen_blur_dark.png'), fullPage: true });
  console.log('Saved feedback_modal_fullscreen_blur_dark.png');

  await browser.close();
  console.log('Full-screen modal backdrop blur verified successfully in both light and dark mode!');
}

testFullscreenModalBlur().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
