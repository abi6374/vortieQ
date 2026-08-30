const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testAIChatMessages() {
  const browser = await chromium.launch({ headless: true });

  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'dark');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      document.documentElement.classList.add('dark');
      // Mock some chat messages in localStorage or state if needed
      window.localStorage.setItem('pf_chat_thread', JSON.stringify([
        { id: '1', role: 'user', content: 'What should I focus on this week for Data Analytics?' },
        { id: '2', role: 'assistant', content: 'Based on your roadmap, your primary milestone this week is BI Dashboards with PowerBI & SQL (10 hrs). Make sure to practice SQL window functions and building interactive DAX measures.' }
      ]));
    } catch (e) {}
  });

  const page = await darkContext.newPage();
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const fab = page.locator('.pfchat-fab');
  await fab.waitFor({ state: 'visible' });
  await fab.click();
  await page.waitForTimeout(800);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'aichat_dark_with_messages.png') });
  console.log('Saved aichat_dark_with_messages.png');

  await browser.close();
}

testAIChatMessages().catch(err => {
  console.error(err);
  process.exit(1);
});
