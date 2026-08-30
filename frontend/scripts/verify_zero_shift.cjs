const { chromium } = require('playwright');

async function verifyZeroShift() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const signin = await page.evaluate(() => {
    const hero = document.querySelector('.hero').getBoundingClientRect();
    const logo = document.querySelector('.logo-row').getBoundingClientRect();
    const privacy = document.querySelector('.privacy').getBoundingClientRect();
    const tabs = document.querySelector('.form-tabs-header').getBoundingClientRect();
    return {
      hero: { top: hero.top, left: hero.left, height: hero.height },
      logo: { top: logo.top, left: logo.left, height: logo.height },
      privacy: { top: privacy.top, left: privacy.left, height: privacy.height },
      tabs: { top: tabs.top, left: tabs.left, height: tabs.height },
    };
  });

  // Switch to Create account
  await page.locator('button:has-text("Create account")').first().click();
  await page.waitForTimeout(400);

  const create = await page.evaluate(() => {
    const hero = document.querySelector('.hero').getBoundingClientRect();
    const logo = document.querySelector('.logo-row').getBoundingClientRect();
    const privacy = document.querySelector('.privacy').getBoundingClientRect();
    const tabs = document.querySelector('.form-tabs-header').getBoundingClientRect();
    return {
      hero: { top: hero.top, left: hero.left, height: hero.height },
      logo: { top: logo.top, left: logo.left, height: logo.height },
      privacy: { top: privacy.top, left: privacy.left, height: privacy.height },
      tabs: { top: tabs.top, left: tabs.left, height: tabs.height },
    };
  });

  console.log('=== SIGN IN COORDS ===');
  console.log(signin);
  console.log('=== CREATE ACCOUNT COORDS ===');
  console.log(create);

  const diffHero = Math.abs(signin.hero.top - create.hero.top);
  const diffPrivacy = Math.abs(signin.privacy.top - create.privacy.top);
  const diffTabs = Math.abs(signin.tabs.top - create.tabs.top);

  console.log('Hero Top Delta:', diffHero);
  console.log('Privacy Top Delta:', diffPrivacy);
  console.log('Tabs Top Delta:', diffTabs);

  if (diffHero === 0 && diffPrivacy === 0 && diffTabs === 0) {
    console.log('>>> PERFECT: ZERO SHIFT (0px delta) on all anchored components! <<<');
  } else {
    console.error('>>> FAILED: Components shifted! <<<');
  }

  await browser.close();
}

verifyZeroShift().catch(console.error);
