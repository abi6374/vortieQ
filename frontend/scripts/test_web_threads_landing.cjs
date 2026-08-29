const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testWebThreadsLanding() {
  console.log('Testing WebThreads integration on Landing Page (Light & Dark themes)...');
  const browser = await chromium.launch({ headless: true });

  // 1. Light Theme Test (WebThreads active)
  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await lightContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'light');
      document.documentElement.classList.remove('dark');
    } catch (e) {}
  });

  const lightPage = await lightContext.newPage();
  await lightPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await lightPage.waitForTimeout(1500);

  // Move mouse across the page to test mouse interaction physics with WebThreads
  await lightPage.mouse.move(300, 400);
  await lightPage.mouse.move(720, 450);
  await lightPage.mouse.move(1100, 350);
  await lightPage.waitForTimeout(600);

  await lightPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'web_threads_light_hero.png'), fullPage: false });
  console.log('Saved web_threads_light_hero.png');

  // 2. Dark Theme Test (Molten Metal active)
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'dark');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const darkPage = await darkContext.newPage();
  await darkPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await darkPage.waitForTimeout(1500);
  await darkPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'web_threads_dark_hero.png'), fullPage: false });
  console.log('Saved web_threads_dark_hero.png');

  await browser.close();
  console.log('WebThreads landing page verification completed successfully!');
}

testWebThreadsLanding().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
