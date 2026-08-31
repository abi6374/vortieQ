const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';

async function capture() {
  const browser = await chromium.launch({ headless: true });

  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await lightContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'light');
      document.documentElement.classList.remove('dark');
    } catch (e) {}
  });

  const lightPage = await lightContext.newPage();
  await lightPage.goto('http://localhost:5173/onboarding', { waitUntil: 'networkidle' });
  await lightPage.waitForTimeout(1500);

  const lightPath = path.join(ARTIFACT_DIR, 'onboarding_light_palesky.png');
  await lightPage.screenshot({ path: lightPath, fullPage: false });
  console.log('Saved onboarding_light_palesky.png');

  await browser.close();
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
