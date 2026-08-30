const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testGitHubSyncFeedback() {
  console.log('Testing GitHub Sync inline green tick mark feedback in Light & Dark modes...');
  const browser = await chromium.launch({ headless: true });

  // Mock API route for /api/profile/github
  const setupMocks = async (page) => {
    await page.route('**/api/profile/github', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          username: 'Login-39t',
          repositories_analyzed: 8,
          topics: ['react', 'python', 'machine-learning', 'fastapi'],
          estimated_level: 'Intermediate',
        }),
      });
    });
  };

  // 1. Light Mode Test
  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await lightContext.addInitScript(() => {
    try {
      window.localStorage.setItem('e2e_mock_auth', 'true');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'light');
      window.localStorage.removeItem('pf_github_preference_demo-user-1');
      window.sessionStorage.removeItem('pf_github_remind_dismissed_demo-user-1');
      document.documentElement.classList.remove('dark');
    } catch (e) {}
  });

  const lightPage = await lightContext.newPage();
  await setupMocks(lightPage);
  await lightPage.goto('http://localhost:5173/roadmap/demo-123', { waitUntil: 'domcontentloaded' });
  await lightPage.waitForTimeout(2000);

  // Find the username input inside GitHub connect banner
  const input = lightPage.locator('input[placeholder="username"]');
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.fill('Login-39t');
  await lightPage.waitForTimeout(300);

  // Click Sync button
  const syncBtn = lightPage.locator('button[type="submit"]:has-text("Sync")');
  await syncBtn.click();
  await lightPage.waitForTimeout(600);

  // Verify the green tick mark and synced badge appear right in place of the input
  await lightPage.waitForSelector('text=Synced');
  await lightPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'github_sync_green_tick_light.png'), fullPage: false });
  console.log('Saved github_sync_green_tick_light.png');

  // 2. Dark Mode Test
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('e2e_mock_auth', 'true');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'dark');
      window.localStorage.removeItem('pf_github_preference_demo-user-1');
      window.sessionStorage.removeItem('pf_github_remind_dismissed_demo-user-1');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const darkPage = await darkContext.newPage();
  await setupMocks(darkPage);
  await darkPage.goto('http://localhost:5173/roadmap/demo-123', { waitUntil: 'domcontentloaded' });
  await darkPage.waitForTimeout(2000);

  const darkInput = darkPage.locator('input[placeholder="username"]');
  await darkInput.waitFor({ state: 'visible', timeout: 10000 });
  await darkInput.fill('Login-39t');
  await darkPage.waitForTimeout(300);

  const darkSyncBtn = darkPage.locator('button[type="submit"]:has-text("Sync")');
  await darkSyncBtn.click();
  await darkPage.waitForTimeout(600);

  await darkPage.waitForSelector('text=Synced');
  await darkPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'github_sync_green_tick_dark.png'), fullPage: false });
  console.log('Saved github_sync_green_tick_dark.png');

  await browser.close();
  console.log('GitHub sync green tick mark feedback test passed successfully in both Light & Dark modes!');
}

testGitHubSyncFeedback().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
