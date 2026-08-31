const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';

async function capture() {
  const browser = await chromium.launch({ headless: true });

  // 1. Light Mode (Pale Sky #D8E3FF background)
  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await lightContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'light');
      document.documentElement.classList.remove('dark');
    } catch (e) {}
  });

  const lightPage = await lightContext.newPage();
  await lightPage.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
  await lightPage.waitForTimeout(1500);

  const lightPath = path.join(ARTIFACT_DIR, 'dashboard_light_palesky.png');
  await lightPage.screenshot({ path: lightPath, fullPage: false });
  console.log('Saved dashboard_light_palesky.png');

  // 2. Dark Mode
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'dark');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const darkPage = await darkContext.newPage();
  await darkPage.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
  await darkPage.waitForTimeout(1500);

  const darkPath = path.join(ARTIFACT_DIR, 'dashboard_dark.png');
  await darkPage.screenshot({ path: darkPath, fullPage: false });
  console.log('Saved dashboard_dark.png');

  await browser.close();
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
