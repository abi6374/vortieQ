const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testFontConsistency() {
  console.log('Testing Font Consistency across Dashboard, Skills, Progress, and Resources...');
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

  // Mock Roadmap API
  await page.route('**/api/roadmap**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        path: {
          id: 'path-data-analyst',
          goal_text: 'Data Analyst (Target role: Data Analyst. Target: Custom Week)',
          target_role: 'Data Analyst',
          timeframe: 'Custom Week'
        },
        weeks: [
          {
            week_number: 1,
            title: 'Foundations & Python',
            steps: [
              { id: '1', title: 'Python Basics & Pandas', duration_hrs: 4, milestone_label: 'Core Python', is_completed: true },
              { id: '2', title: 'Data Cleaning & Preprocessing', duration_hrs: 5, milestone_label: 'Data Wrangling', is_completed: false }
            ]
          }
        ],
        current_week: 1,
        percent: 35,
        completed_steps: 4,
        total_steps: 10
      })
    });
  });

  const routesToTest = [
    { url: 'http://localhost:5173/dashboard', name: 'dashboard' },
    { url: 'http://localhost:5173/progress', name: 'progress' },
    { url: 'http://localhost:5173/skills', name: 'skills' },
    { url: 'http://localhost:5173/resources', name: 'resources' }
  ];

  for (const r of routesToTest) {
    console.log(`Checking ${r.url}...`);
    await page.goto(r.url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // Verify computed font-family for h1, h2, h3
    const headingFonts = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, .s-num, .rx-card .r-title'));
      return headings.slice(0, 5).map(h => ({
        tag: h.tagName,
        text: h.innerText.slice(0, 30),
        fontFamily: window.getComputedStyle(h).fontFamily
      }));
    });
    console.log(`${r.name} Heading Fonts:`, headingFonts);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `font_${r.name}_dark.png`), fullPage: false });
  }

  // Light theme test for Progress and Skills
  await page.evaluate(() => {
    window.localStorage.setItem('pf_theme', 'light');
    document.documentElement.classList.remove('dark');
  });

  await page.goto('http://localhost:5173/progress', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'font_progress_light.png'), fullPage: false });

  await page.goto('http://localhost:5173/skills', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'font_skills_light.png'), fullPage: false });

  await browser.close();
  console.log('Font consistency tests completed successfully!');
}

testFontConsistency().catch(err => {
  console.error(err);
  process.exit(1);
});
