const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testAllPages() {
  console.log('🚀 Launching Playwright Chromium with InitScript for Dark Mode Audits...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('e2e_mock_auth', 'true');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'dark');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const page = await context.newPage();

  try {

    const routes = [
      { name: '01_dashboard_dark', path: '/dashboard', title: 'Roadmap Dashboard' },
      { name: '02_progress_dark', path: '/progress', title: 'Progress Analytics' },
      { name: '03_skills_dark', path: '/skills', title: 'Skill Insights' },
      { name: '04_resources_dark', path: '/resources', title: 'Resources Catalog' },
      { name: '05_coach_dark', path: '/coach', title: 'AI Coach' },
      { name: '06_settings_dark', path: '/settings', title: 'Settings' },
      { name: '07_account_dark', path: '/account', title: 'Account Profile' },
      { name: '08_onboarding_dark', path: '/onboarding', title: 'Onboarding Workspace' },
    ];

    for (const r of routes) {
      console.log(`Navigating to ${r.title} (${r.path})...`);
      await page.goto(`http://localhost:5173${r.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(r.path === '/dashboard' ? 2200 : 1500);
      console.log(`Page URL for ${r.name}:`, page.url());

      const imgPath = path.join(SCREENSHOT_DIR, `${r.name}.png`);
      await page.screenshot({ path: imgPath });
      console.log(`📸 Captured screenshot: ${r.name}.png`);

      if (r.path === '/dashboard') {
        try {
          const taskCheckBtn = await page.$('button[aria-label="Toggle task completion"]');
          if (taskCheckBtn) {
            await taskCheckBtn.click();
            await page.waitForTimeout(400);
            const textarea = await page.$('textarea');
            if (textarea) {
              await textarea.fill('Completed lesson hands-on exercises.');
              await page.waitForTimeout(200);
            }
            const markDoneBtn = await page.getByRole('button', { name: /Mark done/i });
            if (await markDoneBtn.isVisible()) {
              await markDoneBtn.click();
            }
            await page.waitForTimeout(800);
            const compImgPath = path.join(SCREENSHOT_DIR, '01_dashboard_completed_task_dark.png');
            await page.screenshot({ path: compImgPath });
            console.log(`📸 Captured screenshot: 01_dashboard_completed_task_dark.png`);
          }
        } catch (e) {
          console.error('Failed to toggle task completion:', e);
        }
      }

      if (r.path === '/progress') {
        try {
          await page.evaluate(() => {
            const el = document.querySelector('.pf-content');
            if (el) el.scrollTop = 750;
          });
          await page.waitForTimeout(500);
          const lowerImgPath = path.join(SCREENSHOT_DIR, '02_progress_lower_dark.png');
          await page.screenshot({ path: lowerImgPath });
          console.log(`📸 Captured screenshot: 02_progress_lower_dark.png`);

          await page.evaluate(() => {
            const el = document.querySelector('.pf-content');
            if (el) el.scrollTop = 1600;
          });
          await page.waitForTimeout(500);
          const bottomImgPath = path.join(SCREENSHOT_DIR, '02_progress_bottom_dark.png');
          await page.screenshot({ path: bottomImgPath });
          console.log(`📸 Captured screenshot: 02_progress_bottom_dark.png`);
        } catch (e) {
          console.error('Failed to scroll progress:', e);
        }
      }

      if (r.path === '/skills') {
        try {
          const heatmapBtn = await page.getByRole('button', { name: /Skill-Gap Heatmap/i });
          if (await heatmapBtn.isVisible()) {
            await heatmapBtn.click();
            await page.waitForTimeout(1000);
            const heatmapImgPath = path.join(SCREENSHOT_DIR, '03_skills_heatmap_dark.png');
            await page.screenshot({ path: heatmapImgPath, fullPage: true });
            console.log(`📸 Captured screenshot: 03_skills_heatmap_dark.png`);
          }
        } catch (e) {
          console.log('Heatmap button click skipped:', e.message);
        }
      }
    }

    // Test Unauthenticated Auth Screen (Light & Dark, Sign In & Sign Up)
    console.log('Testing Unauthenticated Auth Screen (Sign In & Sign Up)...');
    const authContextLight = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const authPageLight = await authContextLight.newPage();
    await authPageLight.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await authPageLight.waitForTimeout(800);
    await authPageLight.screenshot({ path: path.join(SCREENSHOT_DIR, '09_auth_signin_light.png') });
    console.log('📸 Captured screenshot: 09_auth_signin_light.png');

    const createTabBtn = await authPageLight.getByRole('button', { name: 'Create account' }).first();
    if (await createTabBtn.isVisible()) {
      await createTabBtn.click();
      await authPageLight.waitForTimeout(600);
      await authPageLight.screenshot({ path: path.join(SCREENSHOT_DIR, '09_auth_signup_light.png') });
      console.log('📸 Captured screenshot: 09_auth_signup_light.png');
    }

    const authContextDark = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await authContextDark.addInitScript(() => {
      document.documentElement.classList.add('dark');
    });
    const authPageDark = await authContextDark.newPage();
    await authPageDark.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await authPageDark.waitForTimeout(800);
    await authPageDark.screenshot({ path: path.join(SCREENSHOT_DIR, '09_auth_signin_dark.png') });
    console.log('📸 Captured screenshot: 09_auth_signin_dark.png');

    const createTabBtnDark = await authPageDark.getByRole('button', { name: 'Create account' }).first();
    if (await createTabBtnDark.isVisible()) {
      await createTabBtnDark.click();
      await authPageDark.waitForTimeout(600);
      await authPageDark.screenshot({ path: path.join(SCREENSHOT_DIR, '09_auth_signup_dark.png') });
      console.log('📸 Captured screenshot: 09_auth_signup_dark.png');
    }

    console.log('🎉 Playwright Dark Mode & Auth Audit Completed!');

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
  }
}

testAllPages();
