'use strict';

const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const baseURL = process.env.SEO_BASE_URL || 'http://127.0.0.1:4173';

async function preparePage(context) {
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(10000);
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue();
    return route.abort();
  });
  return page;
}

async function noOverflow(page, label) {
  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert.ok(layout.scrollWidth <= layout.clientWidth + 1, `${label}: no horizontal overflow`);
}

async function assertUniqueIds(page, label) {
  const duplicates = await page.evaluate(() => {
    const seen = new Set();
    const dup = new Set();
    document.querySelectorAll('[id]').forEach(el => {
      if (seen.has(el.id)) dup.add(el.id);
      seen.add(el.id);
    });
    return [...dup];
  });
  assert.deepEqual(duplicates, [], `${label}: no duplicate IDs`);
}

async function setInputs(page, values) {
  await page.evaluate((pairs) => {
    for (const [id, value] of Object.entries(pairs)) {
      const el = document.getElementById(id);
      if (!el) throw new Error(`Missing input #${id}`);
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, values);
  await page.waitForTimeout(500);
}

async function checkHome(browser, name, viewport, isMobile = false) {
  const context = await browser.newContext({ viewport, isMobile });
  try {
    const page = await preparePage(context);
    await page.goto(`${baseURL}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(250);

    assert.equal(
      (await page.locator('h1').first().innerText()).replace(/\s+/g, ' ').trim(),
      '5 Connected Freelance Calculators for Rates, Fees, Taxes, Goals & Budgeting'
    );
    await page.getByRole('heading', { name: 'Choose the Right Calculator' }).waitFor({ state: 'visible' });
    await page.getByRole('heading', { name: 'How the 5 Tools Work Together' }).waitFor({ state: 'visible' });
    await page.getByRole('heading', { name: 'Start With Your Goal' }).waitFor({ state: 'visible' });
    await page.getByRole('heading', { name: 'Why Use the Connected Toolkit?' }).waitFor({ state: 'visible' });

    for (const href of [
      'hourly-rate-calculator.html',
      'platform-fee-calculator.html',
      'tax-estimator.html',
      'income-goal-planner.html',
      'budget-planner.html',
    ]) {
      assert.ok(await page.locator(`a[href="${href}"]`).count() > 0, `${name}: link ${href}`);
    }

    await page.locator('#mainCard').waitFor({ state: 'visible' });
    await page.locator('#rate').waitFor({ state: 'visible' });
    await noOverflow(page, name);
    await assertUniqueIds(page, name);
    console.log(`PASS ${name}`);
  } finally {
    await context.close();
  }
}

async function checkHourly(browser, name, viewport, isMobile = false) {
  const context = await browser.newContext({ viewport, isMobile });
  try {
    const page = await preparePage(context);
    await page.goto(`${baseURL}/hourly-rate-calculator.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(350);

    const visibleH1 = page.locator('h1:visible');
    assert.equal(await visibleH1.count(), 1, `${name}: exactly one visible H1`);
    assert.equal(
      (await visibleH1.innerText()).replace(/\s+/g, ' ').trim(),
      'Freelance Hourly Rate Calculator'
    );
    await page.locator('#rate').waitFor({ state: 'visible' });
    await page.locator('.hourly-seo-section').waitFor({ state: 'visible' });
    await page.locator('[data-tool-share-action="native"]').waitFor({ state: 'visible' });
    await page.locator('#btnCopy').waitFor({ state: 'visible' });

    const positions = await page.evaluate(() => {
      const main = document.querySelector('#mainCard').getBoundingClientRect();
      const seo = document.querySelector('.hourly-seo-section').getBoundingClientRect();
      return {
        mainBottom: main.bottom + window.scrollY,
        seoTop: seo.top + window.scrollY,
      };
    });
    assert.ok(positions.seoTop >= positions.mainBottom - 2, `${name}: supporting guide stays below calculator`);

    await setInputs(page, {
      rate: '50.01',
      hpd: '8',
      dpw: '5',
      wpy: '48',
      billable: '70',
    });

    const forward = await page.evaluate(() => ({
      gross: window.__gross,
      payload: buildHourlyToolkitPayload(),
    }));
    assert.ok(Math.abs(forward.gross.year - 67213.44) < 0.001, `${name}: forward yearly cents`);
    assert.ok(Math.abs(forward.gross.month - 5601.12) < 0.001, `${name}: forward monthly cents`);
    assert.equal(forward.payload.normalized.annualGross, 67213.44, `${name}: forward normalized annual cents`);
    assert.equal(forward.payload.handoff.amount, 67213.44, `${name}: forward handoff cents`);

    await page.locator('#tab2').click();
    await setInputs(page, {
      target: '80000',
      hpdR: '8',
      dpwR: '5',
      wpyR: '48',
      billableR: '70',
      billableRTxt: '70',
    });
    assert.equal((await page.locator('#revBlueRate').innerText()).trim(), '$59.53/hr', `${name}: reverse quoted rate`);
    const reverse = await page.evaluate(() => ({
      gross: window.__gross,
      payload: buildHourlyToolkitPayload(),
    }));
    assert.equal(reverse.payload.normalized.hourlyGross, 59.53, `${name}: reverse quoted cents in payload`);
    assert.equal(reverse.payload.normalized.annualGross, 80008.32, `${name}: reverse annual gross from quoted rate`);
    assert.equal(reverse.payload.handoff.amount, 80008.32, `${name}: reverse handoff cents`);

    const beforeDark = await page.evaluate(() => document.body.classList.contains('dark'));
    await page.locator('#dmBtn').click();
    const afterDark = await page.evaluate(() => document.body.classList.contains('dark'));
    assert.notEqual(afterDark, beforeDark, `${name}: dark/light toggle works`);

    await noOverflow(page, name);
    await assertUniqueIds(page, name);
    console.log(`PASS ${name}`);
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await checkHome(browser, 'Home desktop 1280px', { width: 1280, height: 900 });
    await checkHome(browser, 'Home mobile 390px', { width: 390, height: 844 }, true);
    await checkHourly(browser, 'Hourly desktop 1280px', { width: 1280, height: 900 });
    await checkHourly(browser, 'Hourly mobile 390px', { width: 390, height: 844 }, true);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
