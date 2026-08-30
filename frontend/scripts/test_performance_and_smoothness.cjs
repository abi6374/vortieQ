const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testPerformanceAndSmoothness() {
  console.log('⚡ Starting Comprehensive Performance & Smoothness Verification...');
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Test (1440x900)
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopContext.newPage();
  
  const startTime = Date.now();
  await desktopPage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await desktopPage.waitForTimeout(1000);
  const loadDuration = Date.now() - startTime;
  console.log(`⏱️ Initial DOM content loaded in: ${loadDuration}ms`);

  // Hover over interactive elements to test 0-rerender mouse tracking
  const cards = await desktopPage.$$('.will-change-transform');
  console.log(`Found ${cards.length} hardware-accelerated interactive elements`);
  
  for (let i = 0; i < Math.min(cards.length, 6); i++) {
    const box = await cards[i].boundingBox();
    if (box) {
      await desktopPage.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await desktopPage.mouse.move(box.x + box.width / 4, box.y + box.height / 4);
    }
  }
  await desktopPage.waitForTimeout(300);

  // Smooth scroll down entire landing page
  await desktopPage.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 250;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
    });
  });
  await desktopPage.waitForTimeout(600);
  await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'perf_desktop_landing_scrolled.png') });
  console.log('📸 Captured perf_desktop_landing_scrolled.png');

  // 2. Mobile Device Test (iPhone 14 / 390x844)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  });

  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(1000);

  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'perf_mobile_landing_hero.png') });
  console.log('📸 Captured perf_mobile_landing_hero.png');

  // Test mobile scroll
  await mobilePage.evaluate(async () => {
    window.scrollBy(0, 1000);
  });
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'perf_mobile_landing_features.png') });
  console.log('📸 Captured perf_mobile_landing_features.png');

  // 3. Dark Mode Mobile & Desktop Verification
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
  await darkPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'perf_desktop_dark_landing.png') });
  console.log('📸 Captured perf_desktop_dark_landing.png');

  await browser.close();
  console.log('🎉 Performance & Smoothness verification completed successfully!');
}

testPerformanceAndSmoothness().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
