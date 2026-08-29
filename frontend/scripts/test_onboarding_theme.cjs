const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testOnboardingTheme() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await context.newPage();

  // Set mock auth before loading
  await page.addInitScript(() => {
    window.localStorage.setItem('e2e_mock_auth', 'true');
    window.localStorage.setItem('pf_dev_bypass', 'true');
    window.localStorage.setItem('pf_theme', 'dark');
    document.documentElement.classList.add('dark');
  });

  console.log('Navigating to http://localhost:5173/onboarding');
  await page.goto('http://localhost:5173/onboarding');
  await page.waitForTimeout(1500);

  const screenshotDir = path.resolve('C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969/playwright_screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  await page.screenshot({ path: path.join(screenshotDir, '13_onboarding_intake_dark.png'), fullPage: false });
  console.log('📸 Dark mode screenshot saved to 13_onboarding_intake_dark.png');

  // Click theme toggle button to switch to light mode
  const themeToggle = page.locator('button[aria-label*="Switch to"], button[aria-label*="Toggle Theme"]').first();
  console.log('Theme toggle found, clicking...');
  await themeToggle.click();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(screenshotDir, '13_onboarding_intake_light.png'), fullPage: false });
  console.log('📸 Light mode screenshot saved to 13_onboarding_intake_light.png');

  console.log('✅ Onboarding test completed successfully!');
  await browser.close();
}

testOnboardingTheme().catch((err) => {
  console.error('❌ Onboarding theme test failed:', err);
  process.exit(1);
});
