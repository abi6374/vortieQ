const { chromium } = require('playwright');

async function testCtaFlows() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('🧪 1. Testing Hero CTA Click -> /auth redirect');
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);

  const heroCta = page.locator('button:has-text("Generate Your Learning Path")');
  await heroCta.click();
  await page.waitForTimeout(1000);
  console.log('Current URL after Hero CTA:', page.url());
  if (!page.url().includes('/auth')) {
    throw new Error(`Expected URL to include /auth, got ${page.url()}`);
  }

  console.log('🧪 2. Testing Navbar "Get Started" Click -> /auth');
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);
  const getStartedNav = page.locator('header a:has-text("Get Started")');
  await getStartedNav.click();
  await page.waitForTimeout(1000);
  console.log('Current URL after Get Started Nav:', page.url());
  if (!page.url().includes('/auth')) {
    throw new Error(`Expected URL to include /auth, got ${page.url()}`);
  }

  console.log('🧪 3. Testing Bottom CTA "Generate My Free Roadmap" Click -> /auth');
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);
  const bottomCta = page.locator('button:has-text("Generate My Free Roadmap")');
  await bottomCta.click();
  await page.waitForTimeout(1000);
  console.log('Current URL after Bottom CTA:', page.url());
  if (!page.url().includes('/auth')) {
    throw new Error(`Expected URL to include /auth, got ${page.url()}`);
  }

  console.log('🧪 4. Testing Direct /onboarding unauthenticated navigation -> ProtectedRoute redirects to /auth');
  await page.goto('http://localhost:5173/onboarding');
  await page.waitForTimeout(1000);
  console.log('Current URL after /onboarding access:', page.url());
  if (!page.url().includes('/auth')) {
    throw new Error(`Expected ProtectedRoute to redirect to /auth, got ${page.url()}`);
  }

  console.log('✅ ALL CTA REDIRECT TESTS PASSED PERFECTLY!');
  await browser.close();
}

testCtaFlows().catch((err) => {
  console.error('❌ CTA Flow Test Failed:', err);
  process.exit(1);
});
