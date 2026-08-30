const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testFixes() {
  console.log('Testing Get Started container & Circular progress loader fixes...');
  const browser = await chromium.launch({ headless: true });

  // 1. Dark Mode
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'dark');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const darkPage = await darkContext.newPage();
  await darkPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await darkPage.waitForTimeout(1000);

  // Capture Navbar "Get Started" button close-up
  const navBtn = darkPage.locator('.specular-button:has-text("Get Started")').first();
  await navBtn.waitFor({ state: 'visible' });
  await navBtn.screenshot({ path: path.join(SCREENSHOT_DIR, 'get_started_dark_btn.png') });
  console.log('Saved get_started_dark_btn.png');

  // Scroll to Live Roadmap Simulator and capture circular progress loader
  const liveDemoSection = darkPage.locator('#demo').first();
  await liveDemoSection.scrollIntoViewIfNeeded();
  await darkPage.waitForTimeout(500);

  const progressLoader = darkPage.locator('.w-12.h-12.relative.flex.items-center.justify-center').first();
  await progressLoader.waitFor({ state: 'visible' });
  await progressLoader.screenshot({ path: path.join(SCREENSHOT_DIR, 'progress_loader_dark.png') });
  console.log('Saved progress_loader_dark.png');

  // Full roadmap card capture
  await liveDemoSection.screenshot({ path: path.join(SCREENSHOT_DIR, 'roadmap_preview_dark.png') });
  console.log('Saved roadmap_preview_dark.png');

  // 2. Light Mode
  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await lightContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'light');
      document.documentElement.classList.remove('dark');
    } catch (e) {}
  });

  const lightPage = await lightContext.newPage();
  await lightPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await lightPage.waitForTimeout(1000);

  const lightNavBtn = lightPage.locator('.specular-button:has-text("Get Started")').first();
  await lightNavBtn.waitFor({ state: 'visible' });
  await lightNavBtn.screenshot({ path: path.join(SCREENSHOT_DIR, 'get_started_light_btn.png') });
  console.log('Saved get_started_light_btn.png');

  const lightLiveDemoSection = lightPage.locator('#demo').first();
  await lightLiveDemoSection.scrollIntoViewIfNeeded();
  await lightPage.waitForTimeout(500);

  const lightProgressLoader = lightPage.locator('.w-12.h-12.relative.flex.items-center.justify-center').first();
  await lightProgressLoader.waitFor({ state: 'visible' });
  await lightProgressLoader.screenshot({ path: path.join(SCREENSHOT_DIR, 'progress_loader_light.png') });
  console.log('Saved progress_loader_light.png');

  await lightLiveDemoSection.screenshot({ path: path.join(SCREENSHOT_DIR, 'roadmap_preview_light.png') });
  console.log('Saved roadmap_preview_light.png');

  await browser.close();
  console.log('All fix verifications completed successfully!');
}

testFixes().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
