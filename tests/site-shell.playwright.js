const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const baseURL = process.env.SITE_BASE_URL || 'http://127.0.0.1:4173';

const paths = [
  '/',
  '/hourly-rate-calculator.html',
  '/platform-fee-calculator.html',
  '/tax-estimator.html',
  '/income-goal-planner.html',
  '/budget-planner.html',
  '/about.html',
  '/privacy.html',
  '/terms.html',
  '/contact.html',
  '/app/'
];

function expectedDestination(pathname) {
  return pathname === '/' ? '/' : pathname;
}

async function waitForClosed(page) {
  await page.waitForFunction(() => {
    const trigger = document.querySelector('[data-shell-menu-trigger]');
    const menu = document.querySelector('[data-shell-menu]');
    const backdrop = document.querySelector('[data-shell-backdrop]');
    return trigger?.getAttribute('aria-expanded') === 'false'
      && menu?.getAttribute('data-shell-open') === 'false'
      && backdrop?.getAttribute('data-shell-open') === 'false';
  });
}

async function openMenu(page, label) {
  const trigger = page.locator('[data-shell-menu-trigger]');
  await trigger.click();
  assert.equal(await trigger.getAttribute('aria-expanded'), 'true', `${label}: trigger opens menu`);
  assert.equal(await page.locator('[data-shell-menu]').getAttribute('data-shell-open'), 'true', `${label}: menu open state`);
  assert.equal(await page.locator('[data-shell-backdrop]').getAttribute('data-shell-open'), 'true', `${label}: backdrop open state`);
}

async function checkMobileMenu(page, label) {
  const trigger = page.locator('[data-shell-menu-trigger]');
  assert.equal(await trigger.isVisible(), true, `${label}: menu trigger visible`);

  await openMenu(page, label);
  const linkHeights = await page.locator('.ufc-shell-menu-link').evaluateAll((links) => (
    links.map((link) => link.getBoundingClientRect().height)
  ));
  assert.ok(linkHeights.length > 0, `${label}: menu links render`);
  for (const height of linkHeights) {
    assert.ok(height >= 43.5, `${label}: menu link height ${height}px is approximately 44px minimum`);
  }
  await page.locator('[data-shell-backdrop]').click({ position: { x: 2, y: 2 } });
  await waitForClosed(page);
  assert.equal(await trigger.evaluate((element) => document.activeElement === element), true, `${label}: backdrop close restores focus`);

  await openMenu(page, label);
  await page.keyboard.press('Escape');
  await waitForClosed(page);
  assert.equal(await trigger.evaluate((element) => document.activeElement === element), true, `${label}: Escape restores focus`);

  await openMenu(page, label);
  await page.locator('[data-shell-menu-close]').click();
  await waitForClosed(page);
  assert.equal(await trigger.evaluate((element) => document.activeElement === element), true, `${label}: close button restores focus`);

  const urlBeforeHistory = page.url();
  await openMenu(page, label);
  await page.goBack({ waitUntil: 'commit' }).catch(() => null);
  await waitForClosed(page);
  assert.equal(page.url(), urlBeforeHistory, `${label}: Back closes overlay without navigation`);
  assert.equal(await trigger.getAttribute('aria-expanded'), 'false', `${label}: Back clears trigger state`);
  assert.equal(await page.locator('[data-shell-menu]').getAttribute('data-shell-open'), 'false', `${label}: Back clears menu state`);
  assert.equal(await page.locator('[data-shell-backdrop]').getAttribute('data-shell-open'), 'false', `${label}: Back clears backdrop state`);
}

async function runProfile(browser, profile) {
  const context = await browser.newContext(profile.options);
  const page = await context.newPage();

  for (const pathname of paths) {
    const label = `${profile.name} ${pathname}`;
    const response = await page.goto(`${baseURL}${pathname}`, { waitUntil: 'load' });
    assert.ok(response && response.ok(), `${label}: page loads`);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth
    }));
    assert.ok(overflow.scrollWidth <= overflow.innerWidth + 1,
      `${label}: horizontal overflow ${overflow.scrollWidth}px > ${overflow.innerWidth + 1}px`);
    assert.equal(await page.locator('.ufc-shell-header').isVisible(), true, `${label}: header rendered`);
    assert.equal(await page.locator('.ufc-shell-footer').isVisible(), true, `${label}: footer rendered`);
    assert.ok(await page.locator('.ufc-shell-brand-mark').evaluate((image) => image.complete && image.naturalWidth > 0),
      `${label}: brand mark loaded`);

    const destination = expectedDestination(pathname);
    const activeLinks = page.locator(`[data-shell-page="${destination}"][aria-current="page"]`);
    assert.ok(await activeLinks.count() > 0, `${label}: active destination ${destination}`);

    if (profile.mobile) await checkMobileMenu(page, label);
  }

  console.log(`PASS ${profile.name} (${paths.length} paths)`);
  await context.close();
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });
  const profiles = [
    { name: 'desktop Chromium 1280x800', options: { viewport: { width: 1280, height: 800 } }, mobile: false },
    { name: 'Pixel 7 Chromium', options: { ...devices['Pixel 7'] }, mobile: true },
    { name: 'narrow mobile Chromium 320px', options: { viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true }, mobile: true }
  ];

  await Promise.all(profiles.map((profile) => runProfile(browser, profile)));
  await browser.close();
  console.log(`site-shell Playwright tests: PASS (${profiles.length} profiles, ${paths.length} paths)`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
