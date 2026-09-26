const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';

async function setValue(page, id, value) {
  await page.locator(`#${id}`).evaluate((el, v) => {
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, String(value));
}

async function runProfile(browser, name, options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  const response = await page.goto(`${BASE}/hourly-rate-calculator.html`, { waitUntil: 'domcontentloaded' });
  assert.ok(response && response.status() < 400, `${name}: page loads`);
  await page.waitForTimeout(350);

  assert.equal(await page.title(), 'Freelance Hourly Rate Calculator | Calculate What to Charge', `${name}: title`);
  assert.equal(await page.locator('h1:visible').count(), 1, `${name}: exactly one visible H1`);
  assert.equal((await page.locator('h1:visible').innerText()).trim(), 'Freelance Hourly Rate Calculator', `${name}: H1`);
  assert.equal(await page.locator('.site-home').count(), 0, `${name}: hidden legacy Home DOM removed`);
  assert.equal(await page.locator('.home-calc-lead').count(), 0, `${name}: hidden transition DOM removed`);

  const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  assert.ok(overflow.sw <= overflow.cw + 2, `${name}: no horizontal overflow (${overflow.sw}>${overflow.cw})`);

  const dups = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(x => x.id);
    return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  });
  assert.deepEqual(dups, [], `${name}: no duplicate IDs`);

  // Forward cents case.
  await setValue(page, 'rate', '50.01');
  await setValue(page, 'hpd', '8');
  await setValue(page, 'dpw', '5');
  await setValue(page, 'wpy', '48');
  await setValue(page, 'billable', '70');
  await page.waitForTimeout(180);
  const gross = await page.evaluate(() => window.__gross ? { year: window.__gross.year, month: window.__gross.month } : null);
  assert.deepEqual(gross, { year: 67213.44, month: 5601.12 }, `${name}: forward calculation unchanged`);

  // Reverse rounding case.
  await page.locator('#tab2').click();
  await setValue(page, 'target', '80000');
  await setValue(page, 'hpdR', '8');
  await setValue(page, 'dpwR', '5');
  await setValue(page, 'wpyR', '48');
  await setValue(page, 'billableRTxt', '70');
  await page.waitForTimeout(220);
  assert.equal((await page.locator('#revBlueRate').innerText()).trim(), '$59.53/hr', `${name}: reverse quoted rate unchanged`);

  const body = (await page.locator('body').innerText()).toLowerCase();
  assert.ok(body.includes('pdf'), `${name}: PDF remains present`);
  assert.ok(body.includes('image'), `${name}: image/PNG remains present`);
  assert.ok(body.includes('share') || body.includes('copy link'), `${name}: share remains present`);

  // Theme toggle should still work.
  const beforeDark = await page.locator('body').evaluate(el => el.classList.contains('dark'));
  await page.locator('#dmBtn').click();
  await page.waitForTimeout(80);
  const afterDark = await page.locator('body').evaluate(el => el.classList.contains('dark'));
  assert.notEqual(afterDark, beforeDark, `${name}: theme toggle works`);

  assert.deepEqual(errors, [], `${name}: no page JS exceptions`);
  await context.close();
  console.log(`PASS ${name}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await runProfile(browser, 'desktop Chromium', { viewport: { width: 1280, height: 900 } });
    await runProfile(browser, 'Pixel 7 mobile Chromium', { ...devices['Pixel 7'] });
  } finally {
    await browser.close();
  }
  console.log('Hourly source cleanup browser QA: PASS');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
