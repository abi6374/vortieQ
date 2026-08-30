const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testDetail() {
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

  // Mock API endpoints to return immediate rich internship data with a tracked application
  await page.route('**/api/internships**', async route => {
    if (route.request().url().includes('/user/mine')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          internships: [
            {
              id: 'int-1',
              title: 'AI Research & Engineering Intern',
              company: 'Anthropic',
              location: 'San Francisco, CA (Hybrid / Remote)',
              application_status: 'applied',
              applied_on: new Date().toISOString(),
              apply_url: 'https://anthropic.com/careers',
              skills_required: ['PyTorch', 'Python', 'LLMs'],
              stipend: '$60 - $75 / hr'
            }
          ]
        })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          internships: [
            {
              id: 'int-1',
              title: 'AI Research & Engineering Intern',
              company: 'Anthropic',
              location: 'San Francisco, CA (Hybrid / Remote)',
              is_remote: true,
              categories: ['AI/ML'],
              skills_required: ['PyTorch', 'Python', 'LLMs'],
              stipend: '$60 - $75 / hr',
              apply_url: 'https://anthropic.com/careers'
            }
          ]
        })
      });
    }
  });

  await page.goto('http://localhost:5173/internships', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Switch to My Applications tab
  await page.locator('button:has-text("My Applications")').first().click();
  await page.waitForTimeout(400);

  // Click on the Stage CustomSelect dropdown to open the floating menu
  const stageButton = page.locator('div:has(> span:text("Stage:")) button').first();
  await stageButton.waitFor({ state: 'visible' });
  await stageButton.click();
  await page.waitForTimeout(400);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'stage_dropdown_dark_open.png'), fullPage: false });
  console.log('Saved stage_dropdown_dark_open.png');

  // Switch to light theme
  await page.evaluate(() => {
    window.localStorage.setItem('pf_theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await page.waitForTimeout(400);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'stage_dropdown_light_open.png'), fullPage: false });
  console.log('Saved stage_dropdown_light_open.png');

  await browser.close();
  console.log('Done capturing Stage CustomSelect!');
}

testDetail().catch(err => {
  console.error(err);
  process.exit(1);
});
