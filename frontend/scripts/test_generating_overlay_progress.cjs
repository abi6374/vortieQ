const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

async function testGeneratingOverlayProgress() {
  console.log('Testing Generating Overlay Progress Bar...');
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'light');
      window.localStorage.setItem('pf_dev_bypass', 'true');
    } catch (e) {}
  });

  const page = await context.newPage();

  // Navigate to onboarding
  await page.goto('http://localhost:5173/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Fill in onboarding steps to reach generating overlay
  // Step 1: Target role
  const roleInput = page.locator('input[placeholder*="role"], input[placeholder*="title"], input[type="text"]').first();
  if (await roleInput.isVisible()) {
    await roleInput.fill('Data Analyst');
  }

  // Find Continue button
  const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")').first();
  if (await continueBtn.isVisible()) {
    await continueBtn.click();
    await page.waitForTimeout(500);
  }

  // Type in experience box
  const expBox = page.locator('textarea').first();
  if (await expBox.isVisible()) {
    await expBox.fill('I have 2 years of experience working with Python, SQL, and Excel for data analysis and reporting. I have built automated ETL pipelines and dashboards in PowerBI.');
    await page.waitForTimeout(300);
    const nextBtn = page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("Build Profile")').first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(600);
    }
  }

  // Check if topic review appears or create plan button
  const createPlanBtn = page.locator('button:has-text("Generate"), button:has-text("Create"), button:has-text("Build"), button:has-text("Start")').first();
  if (await createPlanBtn.isVisible()) {
    await createPlanBtn.click();
    await page.waitForTimeout(200);
  }

  // Capture immediately as GeneratingOverlay appears
  await page.waitForSelector('.genov', { timeout: 8000 }).catch(() => {});

  if (await page.locator('.genov').isVisible()) {
    console.log('GeneratingOverlay detected! Sampling progress...');
    
    // Sample 1: Early progress (0-2s)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'generating_progress_start.png') });
    console.log('Saved generating_progress_start.png');

    await page.waitForTimeout(2000);
    // Sample 2: Mid progress (~30-50%)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'generating_progress_mid.png') });
    console.log('Saved generating_progress_mid.png');

    await page.waitForTimeout(3000);
    // Sample 3: High progress (~70-90%)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'generating_progress_high.png') });
    console.log('Saved generating_progress_high.png');
  }

  await browser.close();
  console.log('Progress animation test completed successfully!');
}

testGeneratingOverlayProgress().catch(err => {
  console.error(err);
  process.exit(1);
});
