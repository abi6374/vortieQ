const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';

async function testConfidenceWithSkills() {
  const browser = await chromium.launch({ headless: true });

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

  // Step 1: Type description into textarea
  const textarea = page.locator('textarea').first();
  await textarea.fill('I have experience with Python, Pandas, Numpy, SQL, React, and FastAPI.');
  await page.waitForTimeout(300);

  const step1Continue = page.locator('button:has-text("Continue")').first();
  await step1Continue.click();
  
  // Wait for LLM extraction or fallback to navigate to GitHub step
  await page.waitForTimeout(4000);

  // Step 2: On GitHub step, click Skip
  const skipGithub = page.locator('button:has-text("Skip for now"), button:has-text("Skip")').first();
  if (await skipGithub.isVisible()) {
    await skipGithub.click();
    await page.waitForTimeout(1500);
  }

  // Step 3: On "Your skills", click Quick Add skills
  const quickSkills = ['Python', 'SQL', 'React', 'Docker', 'FastAPI', 'Pandas'];
  for (const s of quickSkills) {
    const btn = page.locator(`button:has-text("${s}")`).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(200);
    }
  }
  await page.waitForTimeout(500);

  const step3Continue = page.locator('button:has-text("Continue")').first();
  await step3Continue.click();
  await page.waitForTimeout(1500);

  // Step 4: Now on "Your Confidence Level", capture initial view
  const initialPath = path.join(ARTIFACT_DIR, 'confidence_step_with_skills.png');
  await page.screenshot({ path: initialPath, fullPage: false });
  console.log('Saved confidence_step_with_skills.png');

  // Scroll ONLY the inner skill list down
  await page.evaluate(() => {
    const lists = document.querySelectorAll('.overflow-y-auto');
    lists.forEach(el => {
      el.scrollTop = 500;
    });
  });

  await page.waitForTimeout(600);

  // Capture Confidence Level step scrolled view
  const scrolledPath = path.join(ARTIFACT_DIR, 'confidence_step_scrolled_down.png');
  await page.screenshot({ path: scrolledPath, fullPage: false });
  console.log('Saved confidence_step_scrolled_down.png');

  await browser.close();
}

testConfidenceWithSkills().catch(err => {
  console.error(err);
  process.exit(1);
});
