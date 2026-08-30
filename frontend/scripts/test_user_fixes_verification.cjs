const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testUserFixes() {
  const browser = await chromium.launch({ headless: true });

  // 1. Landing Page Navbar in Dark Theme
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'dark');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const landingPage = await darkContext.newPage();
  await landingPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await landingPage.waitForTimeout(600);
  await landingPage.evaluate(() => window.scrollTo(0, 250));
  await landingPage.waitForTimeout(600);
  await landingPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'landing_navbar_scrolled_dark.png') });
  console.log('Saved landing_navbar_scrolled_dark.png');

  // 2. Roadmap Page & Goal Title
  const roadmapPage = await darkContext.newPage();
  await roadmapPage.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
  await roadmapPage.waitForTimeout(800);
  await roadmapPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'roadmap_title_clean_dark.png') });
  console.log('Saved roadmap_title_clean_dark.png');

  // 3. Modal unselected stars & tag
  const taskToggle = roadmapPage.locator('button[aria-label="Toggle task completion"]').first();
  await taskToggle.waitFor({ state: 'visible' });
  await taskToggle.click();
  await roadmapPage.waitForTimeout(400);

  await roadmapPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'feedback_modal_unselected_empty.png') });
  console.log('Saved feedback_modal_unselected_empty.png');

  // Click 4th star and 'Clear explanation' tag
  const star4 = roadmapPage.locator('button[aria-label="4 star"]').first();
  if (await star4.isVisible()) {
    await star4.click();
  }

  const tagBtn = roadmapPage.locator('button:has-text("Clear explanation")').first();
  if (await tagBtn.isVisible()) {
    await tagBtn.click();
  }
  await roadmapPage.waitForTimeout(300);

  await roadmapPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'feedback_modal_manually_selected.png') });
  console.log('Saved feedback_modal_manually_selected.png');

  await browser.close();
  console.log('All tests completed successfully!');
}

testUserFixes().catch(err => {
  console.error(err);
  process.exit(1);
});
