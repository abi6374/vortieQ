const { chromium } = require('playwright');

async function measureLayout() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const h1 = await page.evaluate(() => ({
    appH: document.querySelector('.app')?.offsetHeight,
    brandH: document.querySelector('.brand-panel')?.offsetHeight,
    formH: document.querySelector('.form-panel')?.offsetHeight,
    brandInnerH: document.querySelector('.brand-inner')?.offsetHeight,
    formBodyH: document.querySelector('.form-body')?.offsetHeight,
  }));

  // Click Create Account
  await page.locator('button:has-text("Create account")').first().click();
  await page.waitForTimeout(400);

  const h2 = await page.evaluate(() => ({
    appH: document.querySelector('.app')?.offsetHeight,
    brandH: document.querySelector('.brand-panel')?.offsetHeight,
    formH: document.querySelector('.form-panel')?.offsetHeight,
    brandInnerH: document.querySelector('.brand-inner')?.offsetHeight,
    formBodyH: document.querySelector('.form-body')?.offsetHeight,
  }));

  console.log('SignIn Heights:', h1);
  console.log('Create Heights:', h2);

  await browser.close();
}

measureLayout().catch(console.error);
