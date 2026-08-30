const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testAIChatVisualStates() {
  const browser = await chromium.launch({ headless: true });

  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'dark');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const page = await darkContext.newPage();

  console.log('Navigating to /resources in Dark Mode...');
  await page.goto('http://localhost:5173/resources', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500); // Wait for hydrating to finish

  const fab = page.locator('.pfchat-fab');
  await fab.waitFor({ state: 'visible' });
  await fab.click();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'aichat_dark_empty_state.png') });
  console.log('Saved aichat_dark_empty_state.png');

  // Focus and type into textarea
  const textarea = page.locator('.pfchat-in textarea');
  await textarea.fill('How should I prioritize my learning roadmap?');
  await page.waitForTimeout(400);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'aichat_dark_typed_state.png') });
  console.log('Saved aichat_dark_typed_state.png');

  // Also test light mode
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
  await lightPage.waitForTimeout(1500);

  const lightFab = lightPage.locator('.pfchat-fab');
  await lightFab.waitFor({ state: 'visible' });
  await lightFab.click();
  await lightPage.waitForTimeout(1000);

  await lightPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'aichat_light_empty_state.png') });
  console.log('Saved aichat_light_empty_state.png');

  await browser.close();
  console.log('Visual state test completed successfully!');
}

testAIChatVisualStates().catch(err => {
  console.error(err);
  process.exit(1);
});
