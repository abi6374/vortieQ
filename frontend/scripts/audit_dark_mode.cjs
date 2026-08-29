const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runAudit() {
  console.log('🚀 Launching Playwright Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const auditReport = [];

  try {
    console.log('Navigating to http://localhost:5173/ ...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Take screenshot of Initial State (Light Theme)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_initial_light.png'), fullPage: true });
    console.log('📸 Captured 01_initial_light.png');

    // Find and click the theme toggle button (aria-label="Toggle theme" or contains Moon/Sun icon)
    const themeBtn = page.locator('button[aria-label*="theme" i], button[aria-label*="dark" i], button:has(svg.lucide-moon), button:has(svg.lucide-sun)').first();
    if (await themeBtn.isVisible()) {
      console.log('Toggling theme to Dark Mode...');
      await themeBtn.click();
      await page.waitForTimeout(800);
    } else {
      console.log('Theme toggle button not found by label, setting html.dark class manually...');
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('pf_theme', 'dark');
      });
      await page.waitForTimeout(500);
    }

    // Verify dark class is applied
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    console.log('Dark mode active:', isDark);

    const routes = [
      { name: '02_dashboard_dark', path: '/dashboard', title: 'Roadmap Dashboard' },
      { name: '03_progress_dark', path: '/progress', title: 'Progress Page' },
      { name: '04_skills_dark', path: '/skills', title: 'Skill Insights' },
      { name: '05_resources_dark', path: '/resources', title: 'Resources Page' },
      { name: '06_coach_dark', path: '/coach', title: 'AI Coach' },
      { name: '07_settings_dark', path: '/settings', title: 'Settings Page' },
      { name: '08_auth_dark', path: '/auth', title: 'Auth Page' },
      { name: '09_onboarding_dark', path: '/onboarding', title: 'Onboarding Page' },
    ];

    for (const route of routes) {
      console.log(`Auditing ${route.title} (${route.path})...`);
      await page.goto(`http://localhost:5173${route.path}`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000);

      // Re-ensure dark class is present
      await page.evaluate(() => {
        if (!document.documentElement.classList.contains('dark')) {
          document.documentElement.classList.add('dark');
        }
      });

      const shotPath = path.join(SCREENSHOT_DIR, `${route.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });
      console.log(`📸 Captured ${route.name}.png`);

      // Inspect elements for unwanted white backgrounds in dark mode
      const issues = await page.evaluate(() => {
        const found = [];
        const allElements = document.querySelectorAll('div, section, aside, header, nav, main, article, button, input, select, textarea, table, card');
        
        allElements.forEach((el) => {
          const style = window.getComputedStyle(el);
          const bg = style.backgroundColor;
          const color = style.color;
          const rect = el.getBoundingClientRect();

          // Only check visible elements with some dimension
          if (rect.width > 20 && rect.height > 20) {
            // Check for pure white or near-white background
            if (bg === 'rgb(255, 255, 255)' || bg === 'rgb(250, 250, 250)' || bg === 'rgb(249, 250, 251)') {
              // Ignore small standard light badges if intentional, flag containers and cards
              if (rect.width > 120 && rect.height > 40) {
                found.push({
                  tag: el.tagName.toLowerCase(),
                  className: el.className,
                  text: el.innerText ? el.innerText.slice(0, 40) : '',
                  bg: bg,
                  issue: 'White background in dark mode'
                });
              }
            }

            // Check for dark text on dark background
            if (color === 'rgb(29, 29, 31)' || color === 'rgb(51, 51, 51)' || color === 'rgb(17, 24, 39)') {
              // If the element is on a dark surface (e.g. #0B0E14 or #141A26 or #0E131E)
              let parent = el.parentElement;
              let isDarkParent = false;
              while (parent) {
                const pBg = window.getComputedStyle(parent).backgroundColor;
                if (pBg.includes('rgb(11, 14, 20)') || pBg.includes('rgb(20, 26, 38)') || pBg.includes('rgb(14, 19, 30)') || pBg.includes('rgb(16, 21, 32)')) {
                  isDarkParent = true;
                  break;
                }
                parent = parent.parentElement;
              }
              if (isDarkParent && el.innerText && el.innerText.trim().length > 0) {
                found.push({
                  tag: el.tagName.toLowerCase(),
                  className: el.className,
                  text: el.innerText.slice(0, 40),
                  color: color,
                  issue: 'Dark text on dark background'
                });
              }
            }
          }
        });
        return found.slice(0, 15);
      });

      auditReport.push({
        route: route.path,
        title: route.title,
        screenshot: `${route.name}.png`,
        issues: issues
      });
    }

    fs.writeFileSync(path.join(ARTIFACT_DIR, 'playwright_dark_mode_audit.json'), JSON.stringify(auditReport, null, 2));
    console.log('✅ Audit completed! Results saved to playwright_dark_mode_audit.json');

  } catch (err) {
    console.error('❌ Audit error:', err);
  } finally {
    await browser.close();
  }
}

runAudit();
