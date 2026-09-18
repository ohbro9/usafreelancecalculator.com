const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const baseURL = process.env.PFC_BASE_URL || 'http://127.0.0.1:4173';

async function inputState(page, id) {
  return page.evaluate((inputId) => {
    const input = document.getElementById(inputId);
    return {
      value: input.value,
      selectionStart: input.selectionStart,
      selectionEnd: input.selectionEnd,
      pending: input._platformTransactionPendingDecimal || null,
      calculated: input._platformTransactionLiveValue
        && input._platformTransactionLiveValue.formatted === input.value
        ? input._platformTransactionLiveValue.value
        : Number(input.value.replace(/,/g, ''))
    };
  }, id);
}

async function typeFresh(page, id, raw) {
  const input = page.locator(`#${id}`);
  await input.click();
  await input.press('ControlOrMeta+A');
  await input.pressSequentially(raw);
  return input;
}

async function deleteDecimal(page, id, raw) {
  const input = await typeFresh(page, id, raw.replace(/,/g, ''));
  await page.evaluate((inputId) => {
    const element = document.getElementById(inputId);
    const caret = element.value.indexOf('.') + 1;
    element.setSelectionRange(caret, caret);
  }, id);
  await input.press('Backspace');
  const state = await inputState(page, id);
  assert.ok(state.pending, `${id}: deleting decimal must create pending state`);
  assert.equal(state.value, raw.replace('.', ''), `${id}: decimal-only deletion display`);
  return input;
}

async function forceSelection(page, id, position) {
  await page.evaluate(({ inputId, requested }) => {
    const input = document.getElementById(inputId);
    const next = requested === 'end' ? input.value.length : requested;
    input.setSelectionRange(next, next);
    document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
  }, { inputId: id, requested: position });
}

async function runProfile(browser, name, options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.goto(`${baseURL}/platform-fee-calculator.html`);

  const transactionCases = [
    ['1,234.56', '12,349.56', 12349.56],
    ['5,601.12', '56,019.12', 56019.12],
    ['67,213.44', '672,139.44', 672139.44]
  ];

  for (const id of ['amtGross', 'amtNet']) {
    if (id === 'amtNet') await page.locator('#tabNet').click();
    for (const [original, expectedDisplay, expectedValue] of transactionCases) {
      const input = await deleteDecimal(page, id, original);
      await forceSelection(page, id, 'end');
      await input.press('9');
      const state = await inputState(page, id);
      assert.equal(state.value, expectedDisplay, `${name}/${id}: forced end jump`);
      assert.equal(state.calculated, expectedValue, `${name}/${id}: forced end numeric intent`);
      assert.equal(state.pending, null, `${name}/${id}: forced edit clears pending`);

      await deleteDecimal(page, id, original);
      await input.press('9');
      assert.equal((await inputState(page, id)).value, expectedDisplay, `${name}/${id}: no jump`);
    }

    for (const separator of ['.', ',']) {
      const input = await deleteDecimal(page, id, '1,234.56');
      await forceSelection(page, id, 'end');
      await input.press(separator);
      const state = await inputState(page, id);
      assert.equal(state.value, '1,234.56', `${name}/${id}: reinsert ${separator}`);
      assert.equal(state.calculated, 1234.56, `${name}/${id}: separator preserves cents`);
      assert.equal(state.pending, null, `${name}/${id}: separator clears pending`);
    }

    for (const jump of [0, 4, 5, 6, 'end']) {
      const input = await deleteDecimal(page, id, '1,234.56');
      await forceSelection(page, id, jump);
      await input.press('9');
      assert.equal((await inputState(page, id)).value, '12,349.56', `${name}/${id}: adversarial jump ${jump}`);
    }

    const deliberate = await deleteDecimal(page, id, '1,234.56');
    await deliberate.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true });
    await forceSelection(page, id, 0);
    await deliberate.press('9');
    const deliberateState = await inputState(page, id);
    assert.equal(deliberateState.pending, null, `${name}/${id}: deliberate movement clears pending`);
    assert.notEqual(deliberateState.value, '12,349.56', `${name}/${id}: deliberate movement is respected`);

    let input = await typeFresh(page, id, '1234.56');
    await page.evaluate((inputId) => document.getElementById(inputId).setSelectionRange(2, 2), id);
    await input.press('Backspace');
    assert.equal((await inputState(page, id)).calculated, 1234.56, `${name}/${id}: grouping comma deletion`);

    input = await typeFresh(page, id, '1234.56');
    await page.evaluate((inputId) => document.getElementById(inputId).setSelectionRange(7, 7), id);
    await input.press('Backspace');
    assert.equal((await inputState(page, id)).calculated, 1234.6, `${name}/${id}: first decimal digit deletion`);
    input = await typeFresh(page, id, '1234.56');
    await input.press('Backspace');
    assert.equal((await inputState(page, id)).calculated, 1234.5, `${name}/${id}: second decimal digit deletion`);

    for (const value of ['67213.44', '5601.12', '1234.56']) {
      await typeFresh(page, id, value);
      assert.equal((await inputState(page, id)).calculated, Number(value), `${name}/${id}: sequential ${value}`);
    }

    input = await deleteDecimal(page, id, '1,234.56');
    await input.blur();
    const blurred = await inputState(page, id);
    assert.equal(blurred.value, '1,234.56', `${name}/${id}: blur canonicalizes pending value`);
    assert.equal(blurred.pending, null, `${name}/${id}: blur clears pending`);
  }

  await page.locator('#tabNet').click();
  await typeFresh(page, 'amtNet', '1000.55');
  const reverse = await inputState(page, 'amtNet');
  assert.equal(reverse.value, '1,000.55', `${name}: reverse-mode transaction display`);
  assert.equal(reverse.calculated, 1000.55, `${name}: reverse-mode transaction value`);

  console.log(`PASS ${name}`);
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  await runProfile(browser, 'desktop Chromium', { viewport: { width: 1280, height: 800 } });
  await runProfile(browser, 'Pixel 7 mobile Chromium', { ...devices['Pixel 7'] });
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
