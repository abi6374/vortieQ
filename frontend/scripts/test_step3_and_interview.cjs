const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';

async function testScreens() {
  const browser = await chromium.launch({ headless: true });

  // ── 1. STEP 3 in Light Mode ──
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

  // Step 1: Type description with several skills
  const textarea = page.locator('textarea').first();
  await textarea.fill('I have 2 years of experience with Python, Pandas, Numpy, FastAPI, React, JavaScript, MongoDB, PostgreSQL, OpenCV, Docker, and WebSocket.');
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

  // We are now on Step 3 (Your skills)
  const step3Light = path.join(ARTIFACT_DIR, 'step3_skills_light.png');
  await page.screenshot({ path: step3Light, fullPage: false });
  console.log('Saved step3_skills_light.png');

  // Toggle to Dark Mode on Step 3
  const themeToggle = page.locator('button[title*="theme" i], button[aria-label*="theme" i], header button, .theme-toggle').first();
  if (await themeToggle.isVisible()) {
    await themeToggle.click();
    await page.waitForTimeout(500);
    const step3Dark = path.join(ARTIFACT_DIR, 'step3_skills_dark.png');
    await page.screenshot({ path: step3Dark, fullPage: false });
    console.log('Saved step3_skills_dark.png');
  }

  // ── 2. AI INTERVIEW STUDIO in Light & Dark Mode ──
  const interviewPage = await lightContext.newPage();
  await interviewPage.goto('http://localhost:5173/interview', { waitUntil: 'networkidle' });
  await interviewPage.waitForTimeout(1500);

  const interviewLight = path.join(ARTIFACT_DIR, 'interview_studio_light.png');
  await interviewPage.screenshot({ path: interviewLight, fullPage: false });
  console.log('Saved interview_studio_light.png');

  // Dark Mode Interview Studio
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'dark');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });
  const darkInterviewPage = await darkContext.newPage();
  await darkInterviewPage.goto('http://localhost:5173/interview', { waitUntil: 'networkidle' });
  await darkInterviewPage.waitForTimeout(1500);

  const interviewDark = path.join(ARTIFACT_DIR, 'interview_studio_dark.png');
  await darkInterviewPage.screenshot({ path: interviewDark, fullPage: false });
  console.log('Saved interview_studio_dark.png');

  await browser.close();
}

testScreens().catch(err => {
  console.error(err);
  process.exit(1);
});
