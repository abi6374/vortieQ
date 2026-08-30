const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testHackathonImages() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'dark');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const page = await context.newPage();
  await page.goto('http://localhost:5173/hackathons', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Scroll down the main scroll container
  await page.evaluate(() => {
    const scrollable = document.querySelector('.pf-content') || document.querySelector('main') || window;
    if (scrollable && scrollable.scrollBy) {
      scrollable.scrollBy(0, 600);
    } else {
      window.scrollBy(0, 600);
    }
  });
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'hackathons_bottom_cards_dark.png'), fullPage: false });
  console.log('Saved hackathons_bottom_cards_dark.png');

  // Also scroll into view the Hugging face card specifically
  const huggingFaceCard = page.locator('text=Hugging Face Open Source AI Agents Challenge');
  await huggingFaceCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'hackathons_huggingface_card_dark.png'), fullPage: false });
  console.log('Saved hackathons_huggingface_card_dark.png');

  await browser.close();
}

testHackathonImages().catch(err => {
  console.error(err);
  process.exit(1);
});
