const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testSpecularButtons() {
  console.log('Testing SpecularButton with red specular glow on Landing Page...');
  const browser = await chromium.launch({ headless: true });

  // 1. Light Mode
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'light');
      document.documentElement.classList.remove('dark');
    } catch (e) {}
  });

  const page = await context.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Position mouse right near the hero button to trigger the red specular glow
  const heroBtn = page.locator('.specular-button:has-text("Generate Your Learning Path")').first();
  await heroBtn.waitFor({ state: 'visible' });
  const box = await heroBtn.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.75, box.y - 15);
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'specular_buttons_light.png'), fullPage: false });
  console.log('Saved specular_buttons_light.png');

  // 2. Dark Mode
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'dark');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const darkPage = await darkContext.newPage();
  await darkPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await darkPage.waitForTimeout(1000);

  const darkHeroBtn = darkPage.locator('.specular-button:has-text("Generate Your Learning Path")').first();
  await darkHeroBtn.waitFor({ state: 'visible' });
  const darkBox = await darkHeroBtn.boundingBox();
  if (darkBox) {
    await darkPage.mouse.move(darkBox.x + darkBox.width * 0.75, darkBox.y - 15);
    await darkPage.waitForTimeout(500);
  }

  await darkPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'specular_buttons_dark.png'), fullPage: false });
  console.log('Saved specular_buttons_dark.png');

  await browser.close();
  console.log('SpecularButton verification completed successfully!');
}

testSpecularButtons().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
