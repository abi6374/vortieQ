const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/AIML/.gemini/antigravity-ide/brain/59d008db-6768-4696-8aee-eb51d4fe7969';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testHackathonAndInternshipFixes() {
  console.log('Testing neat CustomSelect dropdowns and Hackathon/Internship redirection links...');
  const browser = await chromium.launch({ headless: true });

  const setupMocks = async (page) => {
    await page.route('**/api/hackathons', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hackathons: [
            {
              id: 'hack-1',
              name: 'ETHGlobal AI Hackathon 2026',
              tagline: 'Build autonomous web3 AI agents and smart contract pipelines.',
              status: 'upcoming',
              starts_at: '2026-09-15T00:00:00Z',
              ends_at: '2026-09-18T00:00:00Z',
              is_online: true,
              themes: ['AI/ML', 'Web3', 'Blockchain'],
              prizes: '$50,000 in bounties',
              registration_url: 'https://ethglobal.com',
            },
            {
              id: 'hack-2',
              name: 'Global Open Source Championship',
              tagline: 'Collaborative code sprint for modern developer tooling.',
              status: 'ongoing',
              starts_at: '2026-08-25T00:00:00Z',
              ends_at: '2026-09-05T00:00:00Z',
              is_online: true,
              themes: ['Open Source', 'DevOps'],
              prizes: '$25,000 in awards',
              registration_url: 'https://devpost.com',
            }
          ]
        })
      });
    });

    await page.route('**/api/hackathons/user/mine', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ hackathons: [] })
      });
    });

    await page.route('**/api/internships', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          internships: [
            {
              id: 'intern-1',
              title: 'AI Systems Engineering Intern',
              company: 'Anthropic',
              location: 'San Francisco, CA / Remote',
              is_remote: true,
              duration: '3 months',
              stipend: '$9,000 / month',
              published_at: '2026-08-28T00:00:00Z',
              categories: ['AI/ML'],
              skills_required: ['Python', 'PyTorch', 'vLLM'],
              apply_url: 'https://anthropic.com/careers',
            }
          ]
        })
      });
    });

    await page.route('**/api/internships/user/mine', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ internships: [] })
      });
    });
  };

  // 1. Light Mode Hackathons Screen Test
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('e2e_mock_auth', 'true');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'light');
      document.documentElement.classList.remove('dark');
    } catch (e) {}
  });

  const page = await context.newPage();
  await setupMocks(page);
  await page.goto('http://localhost:5173/hackathons', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Find the status dropdown trigger
  const dropdownTrigger = page.locator('button[aria-haspopup="listbox"]').first();
  await dropdownTrigger.waitFor({ state: 'visible', timeout: 8000 });
  await dropdownTrigger.click();
  await page.waitForTimeout(300);

  // Capture screenshot of the sleek custom dropdown menu open
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'custom_dropdown_light.png'), fullPage: false });
  console.log('Saved custom_dropdown_light.png');

  // Select "Upcoming"
  const upcomingOption = page.locator('button[role="option"]:has-text("Upcoming")');
  await upcomingOption.click();
  await page.waitForTimeout(300);

  // Check the Register button on the first hackathon card
  const registerBtn = page.locator('a:has-text("Register on Website")').first();
  await registerBtn.waitFor({ state: 'visible', timeout: 5000 });
  const href = await registerBtn.getAttribute('href');
  const target = await registerBtn.getAttribute('target');
  console.log(`Hackathon Register link href: ${href}, target: ${target}`);

  // 2. Dark Mode Hackathons Screen Test
  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await darkContext.addInitScript(() => {
    try {
      window.localStorage.setItem('e2e_mock_auth', 'true');
      window.localStorage.setItem('pf_dev_bypass', 'true');
      window.localStorage.setItem('pf_theme', 'dark');
      document.documentElement.classList.add('dark');
    } catch (e) {}
  });

  const darkPage = await darkContext.newPage();
  await setupMocks(darkPage);
  await darkPage.goto('http://localhost:5173/hackathons', { waitUntil: 'domcontentloaded' });
  await darkPage.waitForTimeout(1000);

  const darkDropdownTrigger = darkPage.locator('button[aria-haspopup="listbox"]').first();
  await darkDropdownTrigger.waitFor({ state: 'visible', timeout: 8000 });
  await darkDropdownTrigger.click();
  await darkPage.waitForTimeout(300);

  await darkPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'custom_dropdown_dark.png'), fullPage: false });
  console.log('Saved custom_dropdown_dark.png');

  // 3. Internships Screen Test
  const internPage = await context.newPage();
  await setupMocks(internPage);
  await internPage.goto('http://localhost:5173/internships', { waitUntil: 'domcontentloaded' });
  await internPage.waitForTimeout(1000);

  const applyBtn = internPage.locator('a:has-text("Apply on Website")').first();
  await applyBtn.waitFor({ state: 'visible', timeout: 5000 });
  const applyHref = await applyBtn.getAttribute('href');
  const applyTarget = await applyBtn.getAttribute('target');
  console.log(`Internship Apply link href: ${applyHref}, target: ${applyTarget}`);

  await internPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'internships_apply_link.png'), fullPage: false });
  console.log('Saved internships_apply_link.png');

  await browser.close();
  console.log('Hackathon and internship verification completed successfully!');
}

testHackathonAndInternshipFixes().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
