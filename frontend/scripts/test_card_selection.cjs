const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testCardSelection() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    window.localStorage.setItem('e2e_mock_auth', 'true');
    window.localStorage.setItem('pf_dev_bypass', 'true');
    window.localStorage.setItem('pf_theme', 'dark');
    document.documentElement.classList.add('dark');
  });

  await page.goto('http://localhost:5173/onboarding');
  await page.waitForTimeout(1500);

  const screenshotDir = path.resolve('C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969/playwright_screenshots');

  // By default, Resume card is selected, Chat card is unselected
  console.log('📸 1. Chat card UNSELECTED state');
  const chatCard = page.locator('div:has-text("Tell PathFinder in a chat")').last();
  await chatCard.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(screenshotDir, '14_chat_unselected.png'), fullPage: false });

  // Click chat card to select it
  console.log('Clicking chat card to select...');
  await chatCard.click();
  await page.waitForTimeout(1000);

  console.log('📸 2. Chat card SELECTED state');
  await page.screenshot({ path: path.join(screenshotDir, '14_chat_selected.png'), fullPage: false });

  console.log('✅ Card selection test completed successfully!');
  await browser.close();
}

testCardSelection().catch((err) => {
  console.error('❌ Card selection test failed:', err);
  process.exit(1);
});
