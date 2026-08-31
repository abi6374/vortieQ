const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';

async function testSidebar() {
  const browser = await chromium.launch({ headless: true });

  // 1. Light Mode Expanded Sidebar
  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await lightContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'light');
      window.localStorage.setItem('pf_sidebar_collapsed', 'false');
      document.documentElement.classList.remove('dark');
    } catch (e) {}
  });

  const page = await lightContext.newPage();
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const sidebarExpandedLight = path.join(ARTIFACT_DIR, 'sidebar_expanded_light.png');
  await page.screenshot({ path: sidebarExpandedLight, fullPage: false });
  console.log('Saved sidebar_expanded_light.png');

  // 2. Dark Mode Expanded Sidebar
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'dark');
      window.localStorage.setItem('pf_sidebar_collapsed', 'false');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });
  const darkPage = await darkContext.newPage();
  await darkPage.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
  await darkPage.waitForTimeout(1500);

  const sidebarExpandedDark = path.join(ARTIFACT_DIR, 'sidebar_expanded_dark.png');
  await darkPage.screenshot({ path: sidebarExpandedDark, fullPage: false });
  console.log('Saved sidebar_expanded_dark.png');

  await browser.close();
}

testSidebar().catch(err => {
  console.error(err);
  process.exit(1);
});
