const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';

async function noDuplicateIds(page) {
  const duplicates = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
    return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  });
  assert.deepEqual(duplicates, []);
}

async function noHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  assert.ok(metrics.sw <= metrics.cw + 2, `horizontal overflow: ${metrics.sw} > ${metrics.cw}`);
}

async function verifyIncome(page) {
  await page.goto(`${baseURL}/income-goal-planner.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  assert.equal((await page.locator('h1').first().innerText()).trim(), 'Freelance Income Goal Calculator');
  assert.equal(await page.locator('h1').count(), 1);
  for (const heading of ['Take-Home vs Gross Revenue','Taxes, Fees, and Expenses Change the Revenue Target','Income Goal Worked Example','Income Goal Methodology','Income Goal FAQ']) {
    assert.equal(await page.getByRole('heading', { name: heading, exact: true }).count(), 1, `missing heading ${heading}`);
  }
  const supportTop = await page.locator('.income-seo-support').evaluate(el => el.getBoundingClientRect().top + window.scrollY);
  const resultTop = await page.locator('.result-zone').evaluate(el => el.getBoundingClientRect().top + window.scrollY);
  assert.ok(supportTop > resultTop, 'SEO support must stay below calculator results');
  const rate = (await page.locator('.result-number').first().innerText()).trim();
  const gross = (await page.locator('.result-stats-grid .stat-card').nth(1).locator('.stat-value').innerText()).trim();
  const billable = (await page.locator('.result-stats-grid .stat-card').nth(2).locator('.stat-value').innerText()).trim();
  console.log(`Income live defaults: rate=${rate}; gross=${gross}; billable=${billable}`);
  const supportText = await page.locator('.income-seo-support').innerText();
  assert.ok(supportText.includes(rate), `worked example must match live rate ${rate}`);
  assert.ok(supportText.includes(gross), `worked example must match live gross ${gross}`);
  assert.ok(supportText.includes(billable), `worked example must match live billable hours ${billable}`);
  for (const id of ['goalCopyBtn','goalPdfBtn','goalShareBtn','budgetNextBtn']) {
    assert.equal(await page.locator(`#${id}`).count(), 1, `missing ${id}`);
  }
  await noDuplicateIds(page);
  await noHorizontalOverflow(page);
}

async function verifyApp(page) {
  await page.goto(`${baseURL}/app/`, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.title(), 'USA Freelance Calculator Android App');
  assert.equal((await page.locator('h1').innerText()).trim(), 'USA Freelance Calculator Android App');
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://usafreelancecalculator.com/app/');
  assert.equal(await page.locator('a[download]').getAttribute('href'), '/downloads/usafreelancecalculator-installable.apk');
  const body = await page.locator('body').innerText();
  for (const fact of ['1.0.1 (Build 2)','com.usafreelancecalculator.toolkit','September 24, 2026','6a78d56301fde94f253f93fd4b695a6c19935c3ecde4b79ed397ad2a94ef0408']) {
    assert.ok(body.includes(fact), `missing app release fact ${fact}`);
  }
  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
  assert.equal(schema['@type'], 'SoftwareApplication');
  assert.equal(schema.operatingSystem, 'Android');
  assert.equal(schema.softwareVersion, '1.0.1');
  for (const href of ['/hourly-rate-calculator.html','/platform-fee-calculator.html','/tax-estimator.html','/income-goal-planner.html','/budget-planner.html']) {
    assert.equal(await page.locator(`a[href="${href}"]`).count(), 1, `missing app toolkit link ${href}`);
  }
  await noDuplicateIds(page);
  await noHorizontalOverflow(page);
}

async function verify404(page) {
  await page.goto(`${baseURL}/404.html`, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('a.primary').getAttribute('href'), '/');
  assert.equal(await page.locator('a.secondary').getAttribute('href'), '/platform-fee-calculator.html');
  await noHorizontalOverflow(page);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const profiles = [
    ['desktop Chromium', { viewport: { width: 1280, height: 900 } }],
    ['Pixel 7 mobile Chromium', { ...devices['Pixel 7'] }],
  ];
  try {
    for (const [name, options] of profiles) {
      const context = await browser.newContext(options);
      const page = await context.newPage();
      await verifyIncome(page);
      await verifyApp(page);
      await verify404(page);
      await context.close();
      console.log(`PASS ${name}`);
    }
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
