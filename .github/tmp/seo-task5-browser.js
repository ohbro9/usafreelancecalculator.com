const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';

async function assertNoOverflow(page, label) {
  const dims = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert.ok(dims.scrollWidth <= dims.clientWidth + 1, `${label}: horizontal overflow ${dims.scrollWidth} > ${dims.clientWidth}`);
}

async function assertNoDuplicateIds(page, label) {
  const duplicates = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(el => el.id).filter(Boolean);
    return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  });
  assert.deepEqual(duplicates, [], `${label}: duplicate ids: ${duplicates.join(', ')}`);
}

async function setMoney(page, selector, value) {
  const input = page.locator(selector);
  await input.click();
  await input.press('ControlOrMeta+A');
  await input.pressSequentially(value);
  await input.blur();
}

async function runPlatform(context, label) {
  const page = await context.newPage();
  await page.goto(`${baseURL}/platform-fee-calculator.html`, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.title(), 'Freelance Platform Fee Calculator | See What You Keep', `${label}: platform title`);
  assert.equal((await page.locator('h1').first().innerText()).trim(), 'Freelance Platform Fee Calculator', `${label}: platform h1`);
  await assertNoOverflow(page, `${label}/platform`);
  await assertNoDuplicateIds(page, `${label}/platform`);

  await setMoney(page, '#amtGross', '1000.55');
  await page.waitForTimeout(100);
  assert.equal((await page.locator('#resNet1').innerText()).trim(), '$900.49', `${label}: Client Pays cents result`);

  await page.locator('#tabNet').click();
  await setMoney(page, '#amtNet', '1000.55');
  await page.waitForTimeout(100);
  assert.equal((await page.locator('#resGross2').innerText()).trim(), '$1,111.72', `${label}: I Want to Keep reverse result`);

  assert.ok(await page.locator('#downloadBtn').count(), `${label}: PNG control exists`);
  assert.ok(await page.locator('#pdfBtn').count(), `${label}: PDF control exists`);
  const guide = page.locator('.pfc-seo-guide');
  await guide.scrollIntoViewIfNeeded();
  assert.ok(await guide.isVisible(), `${label}: platform guide visible`);
  assert.match(await guide.innerText(), /Client Pays/);
  assert.match(await guide.innerText(), /I Want to Keep/);
  await assertNoOverflow(page, `${label}/platform after guide`);
  await page.close();
}

async function runTax(context, label) {
  const page = await context.newPage();
  await page.goto(`${baseURL}/tax-estimator.html`, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.title(), 'Freelance Tax Calculator 2026 | Estimate Taxes & Take-Home', `${label}: tax title`);
  assert.equal((await page.locator('h1').first().innerText()).trim(), 'Freelance Tax Calculator for US Freelancers', `${label}: tax h1`);
  assert.ok(await page.locator('#yr2026.active').count(), `${label}: 2026 remains default`);
  await assertNoOverflow(page, `${label}/tax`);
  await assertNoDuplicateIds(page, `${label}/tax`);

  await setMoney(page, '#incomeInput', '100000');
  await setMoney(page, '#expInput', '20000');
  await page.waitForTimeout(250);
  const takeHome = (await page.locator('#heroMainAmt').innerText()).trim();
  const quarterly = (await page.locator('#saQuarterly').innerText()).trim();
  assert.notEqual(takeHome, '$—', `${label}: tax take-home calculates`);
  assert.notEqual(quarterly, '$—', `${label}: quarterly estimate calculates`);

  const guide = page.locator('.tax-seo-guide');
  await guide.scrollIntoViewIfNeeded();
  assert.ok(await guide.isVisible(), `${label}: tax guide visible`);
  assert.match(await guide.innerText(), /Self-Employment Tax/);
  assert.match(await guide.innerText(), /Quarterly Estimated Taxes/);
  await assertNoOverflow(page, `${label}/tax after guide`);
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const profiles = [
    ['desktop Chromium', { viewport: { width: 1280, height: 900 } }],
    ['Pixel 7 mobile Chromium', { ...devices['Pixel 7'] }],
  ];
  for (const [label, options] of profiles) {
    const context = await browser.newContext(options);
    await runPlatform(context, label);
    await runTax(context, label);
    console.log(`PASS ${label}`);
    await context.close();
  }
  await browser.close();
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
