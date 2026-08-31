const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';

async function testGoalCompass() {
  const browser = await chromium.launch({ headless: true });

  // 1. Light Mode
  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await lightContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'light');
      document.documentElement.classList.remove('dark');
    } catch (e) {}
  });

  const page = await lightContext.newPage();
  await page.goto('http://localhost:5173/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Step 1: Type description
  const textarea = page.locator('textarea').first();
  await textarea.fill('I know Python, Pandas, Numpy, SQL, React, and FastAPI.');
  await page.waitForTimeout(300);

  const step1Continue = page.locator('button:has-text("Continue")').first();
  await step1Continue.click();
  await page.waitForTimeout(4000);

  // Step 2: Skip GitHub
  const skipGithub = page.locator('button:has-text("Skip for now"), button:has-text("Skip")').first();
  if (await skipGithub.isVisible()) {
    await skipGithub.click();
    await page.waitForTimeout(1200);
  }

  // Step 3: On "Your skills", click Continue
  const step3Continue = page.locator('button:has-text("Continue")').first();
  if (await step3Continue.isVisible()) {
    await step3Continue.click();
    await page.waitForTimeout(1200);
  }

  // Step 4: On "Your Confidence Level", click Continue to reach Step 5 (Goal Compass)
  const step4Continue = page.locator('button:has-text("Continue")').first();
  if (await step4Continue.isVisible()) {
    await step4Continue.click();
    await page.waitForTimeout(1200);
  }

  // Capture Step 5 (Goal Compass) Light
  const step5Path = path.join(ARTIFACT_DIR, 'step5_goalcompass_light.png');
  await page.screenshot({ path: step5Path, fullPage: false });
  console.log('Saved step5_goalcompass_light.png');

  // 2. Dark Mode
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'dark');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const darkPage = await darkContext.newPage();
  await darkPage.goto('http://localhost:5173/onboarding', { waitUntil: 'networkidle' });
  await darkPage.waitForTimeout(1000);

  const darkTextarea = darkPage.locator('textarea').first();
  await darkTextarea.fill('I know Python, Pandas, Numpy, SQL, React, and FastAPI.');
  await darkPage.waitForTimeout(300);

  const darkStep1Continue = darkPage.locator('button:has-text("Continue")').first();
  await darkStep1Continue.click();
  await darkPage.waitForTimeout(4000);

  const darkSkipGithub = darkPage.locator('button:has-text("Skip for now"), button:has-text("Skip")').first();
  if (await darkSkipGithub.isVisible()) {
    await darkSkipGithub.click();
    await darkPage.waitForTimeout(1200);
  }

  const darkStep3Continue = darkPage.locator('button:has-text("Continue")').first();
  if (await darkStep3Continue.isVisible()) {
    await darkStep3Continue.click();
    await darkPage.waitForTimeout(1200);
  }

  const darkStep4Continue = darkPage.locator('button:has-text("Continue")').first();
  if (await darkStep4Continue.isVisible()) {
    await darkStep4Continue.click();
    await darkPage.waitForTimeout(1200);
  }

  const step5Dark = path.join(ARTIFACT_DIR, 'step5_goalcompass_dark.png');
  await darkPage.screenshot({ path: step5Dark, fullPage: false });
  console.log('Saved step5_goalcompass_dark.png');

  await browser.close();
}

testGoalCompass().catch(err => {
  console.error(err);
  process.exit(1);
});
