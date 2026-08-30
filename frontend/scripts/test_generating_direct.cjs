const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testGeneratingDirect() {
  const browser = await chromium.launch({ headless: true });

  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await lightContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'light');
      window.localStorage.setItem('pf_dev_bypass', 'true');
    } catch (e) {}
  });

  const page = await lightContext.newPage();
  await page.goto('http://localhost:5173/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Fill in role input if empty
  const roleInput = page.locator('input[type="text"]').first();
  if (await roleInput.isVisible()) {
    await roleInput.fill('Data Analyst');
  }

  // Type in experience textarea (Required)
  const textarea = page.locator('textarea').first();
  if (await textarea.isVisible()) {
    await textarea.fill('I have 2 years of experience with Python, SQL, and Excel for data analysis and reporting. I have built automated ETL pipelines and dashboards in PowerBI.');
    await page.waitForTimeout(400);
  }

  // Click Continue
  const continueBtn = page.locator('button:has-text("Continue"):not(:disabled)').first();
  if (await continueBtn.isVisible()) {
    await continueBtn.click();
    await page.waitForTimeout(1000);
  }

  // Topic calibration step if present: click Continue/Next
  const continueBtn2 = page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("Confirm")').first();
  if (await continueBtn2.isVisible()) {
    await continueBtn2.click();
    await page.waitForTimeout(1000);
  }

  // Goal compass step: click "Create learning path" / "Generate"
  const generateBtn = page.locator('button:has-text("Create learning path"), button:has-text("Generate"), button:has-text("Build my path")').first();
  if (await generateBtn.isVisible()) {
    console.log('Clicking Create learning path...');
    await generateBtn.click();
  }

  // Sample progress values as overlay runs
  const overlay = page.locator('.genov');
  await overlay.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

  if (await overlay.isVisible()) {
    console.log('Generating overlay active! Taking snapshots...');

    // 1. Initial snapshot (t = 0.1s)
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_progress_01_start.png') });
    console.log('Saved overlay_progress_01_start.png');

    // 2. Mid snapshot (t = 2.5s)
    await page.waitForTimeout(2400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_progress_02_mid.png') });
    console.log('Saved overlay_progress_02_mid.png');

    // 3. Steady high snapshot (t = 6s)
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overlay_progress_03_high.png') });
    console.log('Saved overlay_progress_03_high.png');
  }

  await browser.close();
  console.log('Done testing overlay direct!');
}

testGeneratingDirect().catch(err => {
  console.error(err);
  process.exit(1);
});
