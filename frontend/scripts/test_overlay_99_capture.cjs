const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function capture99Overlay() {
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
  await page.goto('http://localhost:5173/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Trigger Plan Generation to view the live GeneratingOverlay
  const generateBtn = page.locator('button.btn-plan, button:has-text("Generate"), button:has-text("Create My Roadmap")').first();
  if (await generateBtn.isVisible()) {
    await generateBtn.click();
    console.log('Clicked generate...');

    // Wait until progress reaches ~97%-99%
    await page.waitForTimeout(13500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_progress_99pct_dark.png') });
    console.log('Saved overlay_progress_99pct_dark.png');
  }

  await browser.close();
}

capture99Overlay().catch(err => {
  console.error(err);
  process.exit(1);
});
