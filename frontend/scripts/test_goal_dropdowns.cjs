const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testGoalDropdowns() {
  console.log('Testing Dynamic Goal Dropdowns in Resources & Progress Screens...');
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

  // Mock Supabase / API calls to provide realistic user learning paths
  await page.route('**/rest/v1/learning_paths**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'path-data-analyst',
          user_id: '11111111-1111-1111-1111-111111111111',
          goal_text: 'Data Analyst (Target role: Data Analyst. Target: Custom Week)',
          target_role: 'Data Analyst',
          timeframe: 'Custom Week',
          status: 'active',
          generated_at: new Date().toISOString()
        },
        {
          id: 'path-ml-engineer',
          user_id: '11111111-1111-1111-1111-111111111111',
          goal_text: 'Machine Learning Specialist (Target role: ML Engineer)',
          target_role: 'Machine Learning Specialist',
          timeframe: '10 weeks',
          status: 'completed',
          generated_at: new Date(Date.now() - 30 * 86400000).toISOString()
        }
      ])
    });
  });

  await page.route('**/api/roadmap**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        path: {
          id: 'path-data-analyst',
          goal_text: 'Data Analyst (Target role: Data Analyst)',
          target_role: 'Data Analyst',
          timeframe: 'Custom Week'
        },
        weeks: [],
        current_week: 1,
        percent: 4,
        completed_steps: 1,
        total_steps: 25
      })
    });
  });

  // 1. Test Resources Screen
  console.log('Navigating to /resources...');
  await page.goto('http://localhost:5173/resources', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Click Goal dropdown in TopBar
  const resourcesGoalDropdown = page.locator('header.pf-topbar button:has(svg)').first();
  await resourcesGoalDropdown.waitFor({ state: 'visible' });
  await resourcesGoalDropdown.click();
  await page.waitForTimeout(400);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'resources_goal_dropdown_open_dark.png'), fullPage: false });
  console.log('Saved resources_goal_dropdown_open_dark.png');

  // 2. Test Progress Screen
  console.log('Navigating to /progress...');
  await page.goto('http://localhost:5173/progress', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Click Goal dropdown in TopBar of Progress Screen
  const progressGoalDropdown = page.locator('header.pf-topbar button:has(svg)').first();
  await progressGoalDropdown.waitFor({ state: 'visible' });
  await progressGoalDropdown.click();
  await page.waitForTimeout(400);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'progress_goal_dropdown_open_dark.png'), fullPage: false });
  console.log('Saved progress_goal_dropdown_open_dark.png');

  // Switch to light theme and capture Progress Screen
  await page.evaluate(() => {
    window.localStorage.setItem('pf_theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'progress_goal_dropdown_open_light.png'), fullPage: false });
  console.log('Saved progress_goal_dropdown_open_light.png');

  await browser.close();
  console.log('All tests completed successfully!');
}

testGoalDropdowns().catch(err => {
  console.error(err);
  process.exit(1);
});
