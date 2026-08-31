const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';

async function capture() {
  const browser = await chromium.launch({ headless: true });

  // Light Mode
  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await lightContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'light');
      document.documentElement.classList.remove('dark');
    } catch (e) {}
  });

  const lightPage = await lightContext.newPage();
  await lightPage.goto('http://localhost:5173/interview', { waitUntil: 'networkidle' });
  await lightPage.waitForTimeout(1000);
  await lightPage.screenshot({ path: path.join(ARTIFACT_DIR, 'interview_anchored_light.png') });
  console.log('Saved interview_anchored_light.png');

  // Dark Mode
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'dark');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const darkPage = await darkContext.newPage();
  await darkPage.goto('http://localhost:5173/interview', { waitUntil: 'networkidle' });
  await darkPage.waitForTimeout(1000);
  await darkPage.screenshot({ path: path.join(ARTIFACT_DIR, 'interview_anchored_dark.png') });
  console.log('Saved interview_anchored_dark.png');

  await browser.close();
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
