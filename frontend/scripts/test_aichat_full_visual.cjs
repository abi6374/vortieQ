const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testFullVisual() {
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

  // Route both localhost 5173 and 8000 API calls
  await page.route('**/*assistant/conversation*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ messages: [] })
    });
  });

  await page.route('**/*assistant/messages*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user_message: { id: 'msg-1', role: 'user', content: 'What should I learn next?' },
        assistant_message: {
          id: 'msg-2',
          role: 'assistant',
          content: 'Based on your Data Analyst target path, your next priority is Supervised Learning Algorithms & BI Dashboards with PowerBI.'
        }
      })
    });
  });

  console.log('Navigating to /resources in Dark Mode with mock API...');
  await page.goto('http://localhost:5173/resources', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const fab = page.locator('.pfchat-fab');
  await fab.waitFor({ state: 'visible' });
  await fab.click();
  await page.waitForTimeout(600);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'aichat_dark_empty_suggestions.png') });
  console.log('Saved aichat_dark_empty_suggestions.png');

  // Click suggestion button
  const suggestionBtn = page.locator('.pfchat-sugg button').first();
  await suggestionBtn.waitFor({ state: 'visible' });
  await suggestionBtn.click();
  await page.waitForTimeout(600);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'aichat_dark_conversation_active.png') });
  console.log('Saved aichat_dark_conversation_active.png');

  await browser.close();
  console.log('Finished visual test!');
}

testFullVisual().catch(err => {
  console.error(err);
  process.exit(1);
});
