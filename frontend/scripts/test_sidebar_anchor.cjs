const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';

async function testScroll() {
  const browser = await chromium.launch({ headless: true });

  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await lightContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'light');
      document.documentElement.classList.remove('dark');
    } catch (e) {}
  });

  const page = await lightContext.newPage();
  await page.goto('http://localhost:5173/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Scroll the right-side content container down
  await page.evaluate(() => {
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.scrollTop = 300;
    }
  });

  await page.waitForTimeout(600);

  const lightPath = path.join(ARTIFACT_DIR, 'onboarding_sidebar_anchored.png');
  await page.screenshot({ path: lightPath, fullPage: false });
  console.log('Saved onboarding_sidebar_anchored.png');

  await browser.close();
}

testScroll().catch(err => {
  console.error(err);
  process.exit(1);
});
