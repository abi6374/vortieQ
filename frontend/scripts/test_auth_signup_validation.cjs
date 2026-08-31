const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';

async function testAuth() {
  const browser = await chromium.launch({ headless: true });

  // 1. Landing Page -> Sign Up navigation test
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    try {
      window.localStorage.removeItem('pf_dev_bypass');
      window.localStorage.removeItem('supabase.auth.token');
      window.localStorage.setItem('pf_theme', 'light');
      document.documentElement.classList.remove('dark');
    } catch (e) {}
  });

  const page = await context.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Click Sign Up button in Navbar
  const signUpBtn = page.locator('text=Sign Up').first();
  await signUpBtn.click();
  await page.waitForTimeout(1000);

  console.log('Current URL after Sign Up click:', page.url());

  // Capture Create Account Initial View
  const createAccountLight = path.join(ARTIFACT_DIR, 'create_account_initial_light.png');
  await page.screenshot({ path: createAccountLight, fullPage: false });
  console.log('Saved create_account_initial_light.png');

  // 2. Type partial password (e.g. "pass")
  await page.fill('#pfa-name', 'Jane Doe');
  await page.fill('#pfa-email', 'jane@example.com');
  await page.fill('#pfa-pw', 'pass1');
  await page.waitForTimeout(500);

  const createAccountTypingLight = path.join(ARTIFACT_DIR, 'create_account_typing_light.png');
  await page.screenshot({ path: createAccountTypingLight, fullPage: false });
  console.log('Saved create_account_typing_light.png');

  // Type full valid password ("pass123!")
  await page.fill('#pfa-pw', 'Secret123!');
  await page.waitForTimeout(500);

  const createAccountValidLight = path.join(ARTIFACT_DIR, 'create_account_valid_light.png');
  await page.screenshot({ path: createAccountValidLight, fullPage: false });
  console.log('Saved create_account_valid_light.png');

  // 3. Dark Mode Create Account Valid
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.removeItem('pf_dev_bypass');
      window.localStorage.setItem('pf_theme', 'dark');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });
  const darkPage = await darkContext.newPage();
  await darkPage.goto('http://localhost:5173/auth?mode=create', { waitUntil: 'networkidle' });
  await darkPage.waitForTimeout(1000);
  await darkPage.fill('#pfa-name', 'Jane Doe');
  await darkPage.fill('#pfa-email', 'jane@example.com');
  await darkPage.fill('#pfa-pw', 'Secret123!');
  await darkPage.waitForTimeout(500);

  const createAccountDark = path.join(ARTIFACT_DIR, 'create_account_valid_dark.png');
  await darkPage.screenshot({ path: createAccountDark, fullPage: false });
  console.log('Saved create_account_valid_dark.png');

  await browser.close();
}

testAuth().catch(err => {
  console.error(err);
  process.exit(1);
});
