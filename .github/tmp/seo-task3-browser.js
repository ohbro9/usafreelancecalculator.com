'use strict';

const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const baseURL = process.env.SEO_BASE_URL || 'http://127.0.0.1:4173';

async function checkProfile(browser, name, viewport, isMobile = false) {
  const context = await browser.newContext({ viewport, isMobile });
  const page = await context.newPage();
  await page.goto(`${baseURL}/budget-planner.html`, { waitUntil: 'networkidle' });

  const h1 = (await page.locator('h1').first().innerText()).replace(/\s+/g, ' ').trim();
  assert.equal(h1, 'Freelance Budget Calculator', `${name}: approved H1`);

  const income = page.locator('#income');
  await income.waitFor({ state: 'visible' });
  assert.ok(await income.isEnabled(), `${name}: income input enabled`);
  await income.fill('5000');
  assert.match(await income.inputValue(), /5000|5,000/, `${name}: income input accepts a value`);

  const copySummary = page.getByRole('button', { name: /Copy Summary/i });
  await copySummary.waitFor({ state: 'visible' });
  assert.ok(await copySummary.isEnabled(), `${name}: calculator action enabled`);

  await page.locator('.budget-seo-section').waitFor({ state: 'visible' });
  const layout = await page.evaluate(() => {
    const wrapper = document.querySelector('.wrapper').getBoundingClientRect();
    const seo = document.querySelector('.budget-seo-section').getBoundingClientRect();
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      wrapperBottom: wrapper.bottom + window.scrollY,
      seoTop: seo.top + window.scrollY,
    };
  });
  assert.ok(layout.scrollWidth <= layout.clientWidth + 1, `${name}: no horizontal overflow`);
  assert.ok(layout.seoTop >= layout.wrapperBottom - 2, `${name}: supporting content remains below calculator`);

  console.log(`PASS ${name}`);
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  await checkProfile(browser, 'Budget desktop 1280px', { width: 1280, height: 800 });
  await checkProfile(browser, 'Budget mobile 390px', { width: 390, height: 844 }, true);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
