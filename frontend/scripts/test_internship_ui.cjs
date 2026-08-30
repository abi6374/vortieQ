const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testInternshipUI() {
  console.log('Testing Internship Screen UI (Remote Only Checkbox + Stage CustomSelect)...');
  const browser = await chromium.launch({ headless: true });

  // 1. Dark Mode Testing
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'dark');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const darkPage = await darkContext.newPage();
  await darkPage.goto('http://localhost:5173/internships', { waitUntil: 'domcontentloaded' });
  await darkPage.waitForTimeout(1000);

  // Capture Unchecked Remote Only checkbox
  const remoteBtn = darkPage.locator('button[role="checkbox"]:has-text("Remote Only")').first();
  await remoteBtn.waitFor({ state: 'visible' });
  await remoteBtn.screenshot({ path: path.join(SCREENSHOT_DIR, 'checkbox_dark_unchecked.png') });
  console.log('Saved checkbox_dark_unchecked.png');

  // Click Remote Only checkbox to check it
  await remoteBtn.click();
  await darkPage.waitForTimeout(300);
  await remoteBtn.screenshot({ path: path.join(SCREENSHOT_DIR, 'checkbox_dark_checked.png') });
  console.log('Saved checkbox_dark_checked.png');

  // Switch to "My Applications" tab
  const myAppsTab = darkPage.locator('button:has-text("My Applications")').first();
  await myAppsTab.click();
  await darkPage.waitForTimeout(500);

  // If no application tracked, switch back and track first card
  let stageSelect = darkPage.locator('.relative.inline-block button').first();
  if (!(await stageSelect.isVisible())) {
    await darkPage.locator('button:has-text("Discover Internships")').first().click();
    await darkPage.waitForTimeout(400);
    const trackBtn = darkPage.locator('button:has-text("Track")').first();
    if (await trackBtn.isVisible()) {
      await trackBtn.click();
      await darkPage.waitForTimeout(400);
    }
    await myAppsTab.click();
    await darkPage.waitForTimeout(400);
  }

  stageSelect = darkPage.locator('.relative.inline-block button').first();
  if (await stageSelect.isVisible()) {
    await stageSelect.click();
    await darkPage.waitForTimeout(400);
    await darkPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'stage_dropdown_dark_open.png'), fullPage: false });
    console.log('Saved stage_dropdown_dark_open.png');
  }

  // 2. Light Mode Testing
  const lightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await lightContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_theme', 'light');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      document.documentElement.classList.remove('dark');
    } catch (e) {}
  });

  const lightPage = await lightContext.newPage();
  await lightPage.goto('http://localhost:5173/internships', { waitUntil: 'domcontentloaded' });
  await lightPage.waitForTimeout(1000);

  const lightRemoteBtn = lightPage.locator('button[role="checkbox"]:has-text("Remote Only")').first();
  await lightRemoteBtn.waitFor({ state: 'visible' });
  await lightRemoteBtn.click();
  await lightPage.waitForTimeout(300);
  await lightRemoteBtn.screenshot({ path: path.join(SCREENSHOT_DIR, 'checkbox_light_checked.png') });
  console.log('Saved checkbox_light_checked.png');

  // Track first card and view stage dropdown in light mode
  const lightTrackBtn = lightPage.locator('button:has-text("Track")').first();
  if (await lightTrackBtn.isVisible()) {
    await lightTrackBtn.click();
    await lightPage.waitForTimeout(300);
  }
  const lightMyAppsTab = lightPage.locator('button:has-text("My Applications")').first();
  await lightMyAppsTab.click();
  await lightPage.waitForTimeout(400);
  const lightStageSelect = lightPage.locator('.relative.inline-block button').first();
  if (await lightStageSelect.isVisible()) {
    await lightStageSelect.click();
    await lightPage.waitForTimeout(400);
    await lightPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'stage_dropdown_light_open.png'), fullPage: false });
    console.log('Saved stage_dropdown_light_open.png');
  }

  await browser.close();
  console.log('Internship UI tests finished successfully!');
}

testInternshipUI().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
