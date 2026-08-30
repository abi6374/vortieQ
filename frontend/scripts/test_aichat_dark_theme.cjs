const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testAIChatDarkTheme() {
  console.log('Testing AIChat Dark Theme...');
  const browser = await chromium.launch({ headless: true });

  // 1. Dark Mode Context
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'dark');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const darkPage = await darkContext.newPage();

  // Test Resources page with Chatbot open
  console.log('Navigating to /resources in Dark Mode...');
  await darkPage.goto('http://localhost:5173/resources', { waitUntil: 'networkidle' });
  await darkPage.waitForTimeout(800);

  // Click floating button
  console.log('Clicking Ask PathFinder FAB...');
  const fab = darkPage.locator('.pfchat-fab');
  await fab.waitFor({ state: 'visible' });
  await fab.click();
  await darkPage.waitForTimeout(500);

  // Take screenshot of empty chat panel with suggestion chips in dark mode
  await darkPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'aichat_dark_open_resources.png') });
  console.log('Saved aichat_dark_open_resources.png');

  // Type in textarea
  const textarea = darkPage.locator('.pfchat-in textarea');
  await textarea.fill('How do I build a strong data portfolio?');
  await darkPage.waitForTimeout(400);

  await darkPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'aichat_dark_typed_input.png') });
  console.log('Saved aichat_dark_typed_input.png');

  // 2. Light Mode Context
  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await lightContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'light');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      document.documentElement.classList.remove('dark');
    } catch (e) {}
  });

  const lightPage = await lightContext.newPage();
  await lightPage.goto('http://localhost:5173/resources', { waitUntil: 'networkidle' });
  await lightPage.waitForTimeout(800);

  const lightFab = lightPage.locator('.pfchat-fab');
  await lightFab.waitFor({ state: 'visible' });
  await lightFab.click();
  await lightPage.waitForTimeout(500);

  await lightPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'aichat_light_open_resources.png') });
  console.log('Saved aichat_light_open_resources.png');

  await browser.close();
  console.log('AIChat tests finished successfully!');
}

testAIChatDarkTheme().catch(err => {
  console.error(err);
  process.exit(1);
});
