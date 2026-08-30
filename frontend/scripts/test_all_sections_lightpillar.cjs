const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testAllSectionsLightPillar() {
  console.log('Starting Playwright test for Full-Screen Diagonal LightPillar across sections...');
  const browser = await chromium.launch({ headless: true });

  // 1. Dark Mode Tests
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'dark');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const darkPage = await darkContext.newPage();

  // Test Dashboard Dark
  console.log('Testing Dashboard Dark...');
  await darkPage.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
  await darkPage.waitForTimeout(1200);
  await darkPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'diagonal_dashboard_dark.png') });

  // Test Progress Dark
  console.log('Testing Progress Dark...');
  await darkPage.goto('http://localhost:5173/progress', { waitUntil: 'networkidle' });
  await darkPage.waitForTimeout(1000);
  await darkPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'diagonal_progress_dark.png') });

  // Test Skills Dark
  console.log('Testing Skills Dark...');
  await darkPage.goto('http://localhost:5173/skills', { waitUntil: 'networkidle' });
  await darkPage.waitForTimeout(1000);
  await darkPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'diagonal_skills_dark.png') });

  // Test Auth Dark
  console.log('Testing Auth Dark...');
  await darkPage.goto('http://localhost:5173/auth', { waitUntil: 'networkidle' });
  await darkPage.waitForTimeout(1000);
  await darkPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'diagonal_auth_dark.png') });

  // 2. Light Mode Tests
  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await lightContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'light');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      document.documentElement.classList.remove('dark');
    } catch (e) {}
  });

  const lightPage = await lightContext.newPage();

  // Test Dashboard Light
  console.log('Testing Dashboard Light...');
  await lightPage.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
  await lightPage.waitForTimeout(1200);
  await lightPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'diagonal_dashboard_light.png') });

  // Test Progress Light
  console.log('Testing Progress Light...');
  await lightPage.goto('http://localhost:5173/progress', { waitUntil: 'networkidle' });
  await lightPage.waitForTimeout(1000);
  await lightPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'diagonal_progress_light.png') });

  // Test Auth Light
  console.log('Testing Auth Light...');
  await lightPage.goto('http://localhost:5173/auth', { waitUntil: 'networkidle' });
  await lightPage.waitForTimeout(1000);
  await lightPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'diagonal_auth_light.png') });

  await browser.close();
  console.log('All tests completed successfully!');
}

testAllSectionsLightPillar().catch(err => {
  console.error(err);
  process.exit(1);
});
