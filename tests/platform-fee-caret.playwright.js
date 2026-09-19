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

async function tapWithoutMoving(input) {
  await input.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true });
  await input.dispatchEvent('touchstart');
  await input.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true });
  await input.dispatchEvent('touchend');
  await input.dispatchEvent('click');
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

    let input = await deleteDecimal(page, id, '1,234.56');
    const expectedCaret = (await inputState(page, id)).pending.expectedSelectionStart;
    await tapWithoutMoving(input);
    let state = await inputState(page, id);
    assert.equal(state.selectionStart, expectedCaret, `${name}/${id}: stationary tap keeps caret`);
    assert.ok(state.pending, `${name}/${id}: stationary tap keeps pending intent`);
    await input.press('9');
    state = await inputState(page, id);
    assert.equal(state.value, '12,349.56', `${name}/${id}: stationary tap resolves logical intent`);
    assert.equal(state.calculated, 12349.56, `${name}/${id}: stationary tap exact value`);
    assert.equal(state.pending, null, `${name}/${id}: stationary tap edit clears pending`);

    for (const key of ['ArrowLeft', 'ArrowRight']) {
      input = await deleteDecimal(page, id, '1,234.56');
      const before = await inputState(page, id);
      await input.press(key);
      state = await inputState(page, id);
      assert.notEqual(state.selectionStart, before.selectionStart, `${name}/${id}: ${key} actually moves caret`);
      assert.equal(state.pending.intentionalSelection, true, `${name}/${id}: ${key} records genuine movement`);
      await input.press('9');
      state = await inputState(page, id);
      assert.equal(state.pending, null, `${name}/${id}: ${key} edit clears pending`);
      assert.ok(!['1.23', '5.60', '67.21', '1,234,569'].includes(state.value),
        `${name}/${id}: ${key} must not collapse or append incorrectly`);
      assert.equal(state.value, key === 'ArrowLeft' ? '12,394.56' : '1,234.59',
        `${name}/${id}: ${key} respects the moved caret`);
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
    await forceSelection(page, id, 0);
    await deliberate.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true });
    await deliberate.dispatchEvent('click');
    await deliberate.press('9');
    const deliberateState = await inputState(page, id);
    assert.equal(deliberateState.pending, null, `${name}/${id}: deliberate movement clears pending`);
    assert.equal(deliberateState.value, '91,234.56', `${name}/${id}: deliberate movement is respected`);
    assert.equal(deliberateState.calculated, 91234.56, `${name}/${id}: deliberate movement exact value`);

    input = await typeFresh(page, id, '1234.56');
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
