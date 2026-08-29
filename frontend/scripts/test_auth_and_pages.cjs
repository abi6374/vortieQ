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
      await page.waitForTimeout(1500);
      console.log(`Page URL for ${r.name}:`, page.url());

      const imgPath = path.join(SCREENSHOT_DIR, `${r.name}.png`);
      await page.screenshot({ path: imgPath });
      console.log(`📸 Captured screenshot: ${r.name}.png`);

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

    console.log('🎉 Playwright Dark Mode Audit Completed!');

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
  }
}

testAllPages();
