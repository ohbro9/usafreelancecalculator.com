'use strict';
// Real-page behavior checks. Tax-law certification is separate from these
// state, arithmetic, and export consistency checks. No application dependency.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const cases = [];
const test = (name, run) => cases.push({name, run});
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.005, `${a} != ${b}`);
async function seed(page, income = 100000) {
  await page.evaluate(value => {
    document.getElementById('incomeInput').value = String(value);
    calculate();
  }, income);
}
async function frames(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function mockPDF(page) {
  await page.evaluate(() => {
    window.jspdf = {jsPDF: function () {}};
    window.html2canvas = element => {
      window.pdfText = element.innerText;
      return new Promise(() => {}); // Inspect layout without pretending to render a PDF.
    };
  });
}
async function mockCopy(page) {
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true, value: {writeText(text) {window.copiedText = text; return Promise.resolve();}}
  }));
}

test('retirement plan selection recalculates and saves without another input', async page => {
  await seed(page, 20000);
  await page.evaluate(() => {
    toggleAdv(); toggleRetire();
    document.getElementById('retireInput').value = '10000'; calculate();
  });
  await page.getByRole('button', {name: 'SEP', exact: true}).click();
  await frames(page);
  const r = await page.evaluate(() => window._lastResult);
  assert.equal(r.retirePlanType, 'sep');
  near(r.retireContrib, (20000 - r.halfSE) * 0.20);
  // The debounced save may not have created this key on the first poll.
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('fte_v1_state'))?.retirePlanType === 'sep');
});
test('reset restores the default retirement plan and handoff period', async page => {
  await seed(page);
  await page.evaluate(() => {setRetirePlanType('sep'); selectSNTPeriod('month'); resetAll();});
  await frames(page);
  assert.deepEqual(await page.evaluate(() => [appState.retirePlanType, _sntPeriod]), ['401k', 'year']);
});
test('year switching refreshes the retirement Max preset', async page => {
  await seed(page);
  await page.evaluate(() => {toggleRetire(); setYear(2025);});
  await frames(page);
  const amount = await page.evaluate(() => {
    [...document.querySelectorAll('#retirePresetChips button')].find(el => el.textContent === 'Max').click();
    return document.getElementById('retireInput').value.replace(/,/g, '');
  });
  assert.equal(Number(amount), 23500);
});
test('copy uses the input changed in the same browser frame', async page => {
  await seed(page); await mockCopy(page);
  const text = await page.evaluate(() => {
    const input = document.getElementById('incomeInput');
    input.value = '60000'; input.dispatchEvent(new Event('input', {bubbles:true}));
    copySummary(); return window.copiedText;
  });
  assert.match(text, /Gross Income \(annual\):\s+\$60,000\.00/);
});
test('PDF layout uses the year changed in the same browser frame', async page => {
  await seed(page); await mockPDF(page);
  const r = await page.evaluate(() => {setYear(2025); downloadPDF(); return {text:window.pdfText, year:window._lastResult.year};});
  assert.equal(r.year, 2025); assert.match(r.text, /2025/);
});
test('PNG uses the income changed in the same browser frame', async page => {
  await seed(page);
  const r = await page.evaluate(async () => {
    HTMLAnchorElement.prototype.click = function () {};
    document.getElementById('incomeInput').value = '60000'; scheduleCalc();
    const work = downloadImage(); const captured = window._lastResult.incomeAnnual;
    await work; return captured;
  });
  assert.equal(r, 60000);
});
test('clearing income immediately blocks exports and toolkit handoff', async page => {
  await seed(page); await mockCopy(page); await mockPDF(page);
  const r = await page.evaluate(async () => {
    window.anchorClicks = 0;
    HTMLAnchorElement.prototype.click = function () {window.anchorClicks++;};
    document.getElementById('incomeInput').value = ''; scheduleCalc();
    copySummary(); downloadPDF(); await downloadImage(); goNextTool();
    return {copy:window.copiedText || '', pdf:window.pdfText || '', clicks:window.anchorClicks, handoff:window.UFCToolkit.readSession()};
  });
  assert.deepEqual(r, {copy:'', pdf:'', clicks:0, handoff:null});
});
test('copy includes a refundable-only child credit', async page => {
  await seed(page, 10000); await mockCopy(page);
  const r = await page.evaluate(() => {
    document.getElementById('dependentsInput').value = '1'; calculate(); copySummary();
    return {ctc:window._lastResult.ctc, actc:window._lastResult.actcEstimate, text:window.copiedText};
  });
  assert.equal(r.ctc, 0); assert.ok(r.actc > 0); assert.match(r.text, /Add'l Child Tax Credit/);
});
test('copy reports all modeled employee payroll and applied mixed dependent credits', async page => {
  await seed(page, 60000); await mockCopy(page);
  const r = await page.evaluate(() => {
    toggleSCorp(); toggleW2();
    document.getElementById('w2Input').value = '10000';
    document.getElementById('dependentsInput').value = '2';
    appState.ctcMode = 'mixed'; appState.ctcOtherDependents = 1;
    calculate(); copySummary();
    return {text:window.copiedText, payroll:fmt(window._lastResult.seTotal), credit:fmt(window._lastResult.ctc)};
  });
  assert.ok(r.text.includes('Payroll Tax (employee):  ' + r.payroll));
  assert.ok(r.text.includes('Dependent credits:      −' + r.credit));
  assert.doesNotMatch(r.text, /2 kids ×/);
});
test('PDF payroll rows sum to displayed payroll in S-Corp plus W-2 mode', async page => {
  await seed(page, 300000); await mockPDF(page);
  const r = await page.evaluate(() => {
    toggleSCorp(); toggleW2();
    document.getElementById('sCorpSalaryInput').value = '150000';
    document.getElementById('w2Input').value = '190000'; calculate(); downloadPDF();
    const rows = [...document.querySelectorAll('#pdfRenderRoot .break-row')].map(el => el.innerText);
    return {text:window.pdfText, rows, total:window._lastResult.seTotal, amed:window._lastResult.amedTax};
  });
  assert.ok(r.amed > 0);
  // Compare both rendered rows to the dashboard's numeric payroll total.
  const amounts = r.text.match(/(?:Payroll tax[^\n]*|W-2 \+[^\n]*|Additional Medicare tax)\n[^\n]+/g) || [];
  assert.equal(amounts.length, 2, r.text);
  const sum = amounts.reduce((total, row) => total + Number(row.match(/\$([\d,.]+)/)[1].replace(/,/g,'')), 0);
  near(sum, r.total);
});
test('saved state preserves a state whose rate duplicates another state', async page => {
  await seed(page);
  await page.evaluate(() => {
    toggleState();
    document.getElementById('stateDropdown').selectedIndex = [...document.getElementById('stateDropdown').options].findIndex(el => el.textContent === 'Oregon');
    onStateSelect(); localStorage.setItem('fte_v1_state', JSON.stringify(collectState()));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.evaluate(() => getSelectedStateName()), 'Oregon');
});
test('money blur keeps displayed cents and result synchronized', async page => {
  await seed(page);
  await page.evaluate(() => {
    const el = document.getElementById('incomeInput'); el.value = '10000.999'; calculate(); onMoneyBlur(el);
  });
  await frames(page);
  assert.equal(await page.evaluate(() => window._lastResult.incomeAnnual), 10001);
});
test('existing annual worked example and monthly view reconcile', async page => {
  await seed(page);
  const a = await page.evaluate(() => {
    document.getElementById('expInput').value = '20000'; calculate(); return window._lastResult;
  });
  near(a.seStandard, 11303.64); near(a.federalTax, 5343.82528); near(a.takeHome, 63352.53472);
  const b = await page.evaluate(() => {
    setIncMode('monthly'); document.getElementById('incomeInput').value = String(100000/12); calculate(); return window._lastResult;
  });
  near(a.totalTax, b.totalTax); near(a.takeHome, b.takeHome);
});
async function openFiverrHandoff(page, back = false) {
  if (back) {
    await Promise.all([
      page.waitForURL('**/platform-fee-calculator.html#amountSetupCard'),
      page.getByRole('button', {name:'Back: Platform Fees', exact:true}).click(),
    ]);
  } else {
    await page.goto(new URL('platform-fee-calculator.html', page.url()).href, {waitUntil:'domcontentloaded'});
  }
  await page.locator('#chipGroup [data-name="Fiverr"]').click();
  await page.locator('#amtGross').fill('60000');
  await page.locator('#amtGross').blur();
  await page.waitForFunction(() => window.__pfcResult.clientPays === 60000 && window.__pfcResult.youKeep === 48000);
  assert.equal(await page.locator('#resPlatform').innerText(), '$12,000.00');
}
async function sendPlatformHandoff(page, kind) {
  await page.locator(kind === 'gross' ? '#sntChipClient' : '#sntChipNet').click();
  await Promise.all([
    page.waitForURL('**/tax-estimator.html#incomeSetupCard'),
    page.locator('#sntNextBtn').click(),
  ]);
}
async function assertImportedIncome(page, amount, mode = 'annual', annual = amount) {
  // Import and its 250ms save must agree; an absent key is a pending save.
  await page.waitForFunction(({amount, mode, annual}) => {
    const saved = JSON.parse(localStorage.getItem('fte_v1_state'));
    return Number(document.getElementById('incomeInput').value.replace(/,/g, '')) === amount &&
      appState.incMode === mode && window._lastResult?.incomeAnnual === annual &&
      saved?.incMode === mode && Number(String(saved?.incomeInput).replace(/,/g, '')) === amount;
  }, {amount, mode, annual}, {timeout:5000});
  return page.evaluate(() => ({saved:collectState(), result:window._lastResult,
    banner:document.getElementById('importBannerText').textContent}));
}
async function seedIncomingHandoff(page, {period, kind = 'gross', assumptions = {}, sourceTool = 'platform_fee'}) {
  await page.evaluate(({period, kind, assumptions, sourceTool}) => {
    // Deliberately inconsistent historical normalized fields reproduce saved
    // sessions without relying on a tax-input restore or on legacy migration.
    UFCToolkit.writeSession({version:2, sessionId:'import-regression',
      updatedAt:Math.max(Date.now(), Number(localStorage.getItem('fte_last_imported_at')) + 1),
      sourceTool, currentStep:sourceTool,
      handoff:{amount:kind === 'gross' ? 60000 : 48000, period, kind,
        label:kind === 'gross' ? 'Client Pays' : 'You Receive (pre-tax)'},
      normalized:{annualGross:999999, annualPreTaxAfterFees:888888}, assumptions});
    localStorage.setItem('import-unrelated-setting', 'preserve-me');
  }, {period, kind, assumptions, sourceTool});
  await page.reload({waitUntil:'domcontentloaded'});
}
for (const kind of ['gross', 'pre_tax_after_fees']) {
  test(`platform import: fresh ${kind} agrees with the calculation and saved income`, async page => {
    if (kind !== 'gross') await page.setViewportSize({width:390, height:844});
    await openFiverrHandoff(page);
    await sendPlatformHandoff(page, kind);
    const amount = kind === 'gross' ? 60000 : 48000;
    const state = await assertImportedIncome(page, amount);
    assert.match(state.banner, new RegExp(kind === 'gross' ? '\\$60,000.*Client Pays' : '\\$48,000.*You Receive'));
    assert.match(state.banner, /Review the period/);
    assert.equal(state.result.expenses, 0); // The import must not deduct the fee again.
    near(state.result.totalTax, kind === 'gross' ? 12037.19896 : 9271.039168);
    if (kind !== 'gross') assert.match(state.banner, /fees are already deducted; do not deduct them again/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (kind !== 'gross' && process.env.TAX_ARTIFACT_DIR) await page.screenshot({path:path.join(process.env.TAX_ARTIFACT_DIR,'platform-net-import-mobile.png'),fullPage:true});
  });
}
for (const [expenseMode, first] of [['dollar', 'pre_tax_after_fees'], ['pct', 'gross']]) {
  test(`platform import: switching ${first} preserves saved ${expenseMode} expenses and tax settings`, async page => {
    await page.evaluate(() => {
      setYear(2025); setIncMode('monthly');
      document.getElementById('incomeInput').value = '3000';
      document.getElementById('filingStatus').value = 'mfj';
      toggleAdv(); toggleW2(); document.getElementById('w2Input').value = '25000';
      toggleRetire(); setRetirePlanType('custom'); document.getElementById('retireInput').value = '1000';
      toggleQBI();
    });
    await page.locator(expenseMode === 'pct' ? '#expPctBtn' : '#expDollarBtn').click();
    await page.locator('#expInput').fill(expenseMode === 'pct' ? '10' : '12000');
    await page.locator('#expInput').blur(); await frames(page);
    const settings = await page.evaluate(() => collectState());
    await page.waitForFunction(expected => {
      const saved = JSON.parse(localStorage.getItem('fte_v1_state'));
      return saved && Object.entries(expected).every(([key, value]) => saved[key] === value);
    }, settings);
    const withoutIncome = ({incomeInput, incMode, incomeBasis, ...rest}) => rest;
    for (const [index, kind] of [first, first === 'gross' ? 'pre_tax_after_fees' : 'gross', first].entries()) {
      if (index === 2) { // Reopen a persisted session before switching back.
        await page.reload({waitUntil:'domcontentloaded'});
        await page.waitForFunction(() => !!window._lastResult);
      }
      await openFiverrHandoff(page, index > 0);
      await sendPlatformHandoff(page, kind);
      const amount = kind === 'gross' ? 60000 : 48000;
      const state = await assertImportedIncome(page, amount);
      assert.deepEqual(withoutIncome(state.saved), withoutIncome(settings));
      assert.equal(state.saved.incomeBasis.kind, kind);
      assert.equal(state.saved.incomeBasis.originalPeriod, 'project');
      assert.equal(state.saved.incomeBasis.sourceTool, 'platform_fee');
      const expenses = expenseMode === 'pct' ? amount * .1 : 12000;
      near(state.result.expenses, expenses); near(state.result.netProfit, amount - expenses);
      assert.match(state.banner, new RegExp(kind === 'gross' ? '\\$60,000.*Client Pays' : '\\$48,000.*You Receive'));
      if (kind !== 'gross') assert.match(state.banner, /fees are already deducted/);
    }
    const finalAmount = first === 'gross' ? 60000 : 48000;
    await page.reload({waitUntil:'domcontentloaded'});
    await assertImportedIncome(page, finalAmount);
    assert.equal(await page.locator('#importBanner').isVisible(), true); // Saved amount context is restored; the consumed import is not reapplied.
    assert.match(await page.locator('#importBannerText').innerText(), /Review the period/);
  });
}
test('platform import: stale toolkit state cannot override gross when Tax Estimator storage is missing', async page => {
  await openFiverrHandoff(page); await sendPlatformHandoff(page, 'pre_tax_after_fees');
  await assertImportedIncome(page, 48000);
  await page.evaluate(() => localStorage.removeItem('fte_v1_state'));
  await openFiverrHandoff(page, true); await sendPlatformHandoff(page, 'gross');
  const state = await assertImportedIncome(page, 60000);
  assert.match(state.banner, /\$60,000.*Client Pays/);
  assert.equal(await page.evaluate(() => UFCToolkit.readSession().normalized.annualGross), 48000);
});
test('platform import: every supported period agrees across banner, field, calculation and storage', async page => {
  for (const kind of ['gross', 'pre_tax_after_fees']) for (const period of ['year', 'month', 'week', 'day', 'project', 'custom']) {
    await seedIncomingHandoff(page, {period, kind, assumptions:{weeksPerYear:48, daysPerWeek:5}});
    const selected = kind === 'gross' ? 60000 : 48000;
    const multiplier = period === 'week' ? 48 : period === 'day' ? 240 : 1;
    const amount = selected * multiplier;
    const state = await assertImportedIncome(page, amount, period === 'month' ? 'monthly' : 'annual', period === 'month' ? amount * 12 : amount);
    assert.ok(state.banner.includes('$' + selected.toLocaleString('en-US')));
    if (period === 'week' || period === 'day') assert.ok(state.banner.includes('annualized to $' + amount.toLocaleString('en-US')));
    if (period === 'project' || period === 'custom') assert.match(state.banner, /Review the period/);
    assert.equal(await page.evaluate(() => localStorage.getItem('import-unrelated-setting')), 'preserve-me');
  }
});
test('platform import: invalid calendars retain the current amount with a period warning', async page => {
  for (const [period, assumptions] of [['week', {}], ['day', {}], ['week', {weeksPerYear:'48weeks'}], ['week', {weeksPerYear:54}], ['day', {weeksPerYear:48, daysPerWeek:8}], ['day', {weeksPerYear:0, daysPerWeek:5}]]) {
    await seedIncomingHandoff(page, {period, kind:'pre_tax_after_fees', assumptions});
    const state = await assertImportedIncome(page, 48000);
    assert.match(state.banner, /Review the period/); assert.doesNotMatch(state.banner, /annualized/);
    assert.match(state.banner, /No annual conversion was applied/);
    assert.match(state.banner, /fees are already deducted/);
  }
});
test('toolkit import: non-platform normalized and monthly transfers retain their behavior', async page => {
  await seedIncomingHandoff(page, {sourceTool:'hourly_rate', period:'week', assumptions:{weeksPerYear:48}});
  let state = await assertImportedIncome(page, 999999);
  assert.match(state.banner, /from Hourly Rate ·/); assert.doesNotMatch(state.banner, /fees are already deducted/);
  await seedIncomingHandoff(page, {sourceTool:'income_goal', period:'month'});
  await assertImportedIncome(page, 60000, 'monthly', 720000);
});
test('toolkit import: legacy v1 annual income still imports without a v2 session', async page => {
  await page.evaluate(() => localStorage.setItem('usaFreelanceToolkit_v1', JSON.stringify({
    grossAnnual:70000, source:'hourly', updatedAt:Date.now(), note:'Legacy hourly rate',
  })));
  await page.reload({waitUntil:'domcontentloaded'});
  const state = await assertImportedIncome(page, 70000);
  assert.match(state.banner, /\$70,000\/yr.*Hourly Rate Calculator/);
});

test('toolkit handoff uses fresh income and retains gross semantics', async page => {
  await seed(page);
  await page.evaluate(() => {
    document.getElementById('incomeInput').value = '60000'; scheduleCalc(); goNextTool();
  });
  await page.waitForURL('**/income-goal-planner.html#goalInputCard');
  const s = await page.evaluate(() => window.UFCToolkit.readSession());
  assert.equal(s.normalized.annualGross, 60000); assert.equal(s.handoff.kind, 'gross');
});
test('mobile layout and year selection remain usable', async page => {
  await page.setViewportSize({width:390,height:844}); await seed(page);
  await page.locator('#yr2025').click(); await frames(page);
  assert.equal(await page.evaluate(() => window._lastResult.year), 2025);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.evaluate(()=>toggleAdv());await frames(page);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  if(process.env.TAX_ARTIFACT_DIR) await page.screenshot({path:path.join(process.env.TAX_ARTIFACT_DIR,'mobile-2025.png'),fullPage:true});
});
test('actual calculator observes ordinary SE threshold and conservative high-income QBI limits', async page => {
  await seed(page,300);
  assert.equal(await page.evaluate(() => window._lastResult.seStandard),0);
  await seed(page,400000);
  const r=await page.evaluate(() => window._lastResult);
  assert.equal(r.qbiDeduction,0); assert.equal(r.qbiNeedsMoreData,true);
});
test('six federal baseline fixtures preserve both years and every offered filing status', async page => {
  await seed(page);
  // $100k Schedule C profit, no wages/credits/state/retirement. Independently
  // evaluated ordinary-rate schedules after half-SE, standard deduction, QBI.
  for(const [year,status,federal] of [[2025,'single',8498.5996],[2025,'mfj',5420.7816],[2025,'hoh',6313.7816],[2026,'single',8234.9996],[2026,'mfj',5334.5816],[2026,'hoh',6249.3816]]) {
    const r=await page.evaluate(({year,status})=>{setYear(year);document.getElementById('filingStatus').value=status;calculate();return window._lastResult;},{year,status});
    near(r.seStandard,14129.55);near(r.federalTax,federal);near(r.totalTax,federal+14129.55);
  }
});
test('active QBI minimum is opt-in, persisted, and disabled for 2025', async page => {
  await seed(page,1100);
  const values=await page.evaluate(() => {
    toggleW2(); document.getElementById('w2Input').value='50000'; calculate();
    const ordinary=window._lastResult.qbiDeduction;
    document.getElementById('qbiActiveInput').checked=true; calculate();
    const active=window._lastResult.qbiDeduction;
    localStorage.setItem('fte_v1_state',JSON.stringify(collectState()));
    return {ordinary,active};
  });
  near(values.ordinary,204.457495); assert.equal(values.active,400);
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.evaluate(() => document.getElementById('qbiActiveInput').checked),true);
  await page.evaluate(() => setYear(2025)); await frames(page);
  near(await page.evaluate(() => window._lastResult.qbiDeduction),values.ordinary);
});
test('charitable deductions switch by year and agree with PDF layout', async page => {
  await seed(page); await mockPDF(page);
  const a=await page.evaluate(() => {
    document.getElementById('cashCharityInput').value='1000'; calculate(); downloadPDF();
    return {deduction:window._lastResult.usedDeduction,text:window.pdfText};
  });
  assert.equal(a.deduction,17100);assert.match(a.text,/Standard \+ Qualifying Cash Gifts/);
  await page.evaluate(() => setYear(2025)); await frames(page);
  assert.equal(await page.evaluate(() => window._lastResult.usedDeduction),15750);
});
test('safe-harbor controls distinguish full reserve, zero prior-year tax, and missing AGI', async page => {
  await seed(page);
  const r=await page.evaluate(() => {
    document.getElementById('priorYearTaxInput').value='10000';
    document.getElementById('priorYearAGIInput').value='100000';
    document.getElementById('priorYearEligibleInput').checked=true; calculate();
    const full=window._lastResult.quarterly;
    document.getElementById('quarterlyModeInput').value='safe_harbor'; calculate();
    const safe=window._lastResult.quarterly;
    document.getElementById('priorYearTaxInput').value='0'; calculate();
    const zero=window._lastResult.quarterly;
    document.getElementById('priorYearAGIInput').value=''; calculate();
    return {full,safe,zero,missing:window._lastResult.quarterly,tax:window._lastResult.federalEstimatedTaxLiability};
  });
  near(r.full,r.tax/4);assert.equal(r.safe,2500);assert.equal(r.zero,0);near(r.missing,r.tax*.9/4);
});
test('zero prior-year tax survives blur and persisted settings', async page => {
  await seed(page);
  await page.evaluate(()=>{
    const tax=document.getElementById('priorYearTaxInput');tax.value='0';onMoneyBlur(tax);
    const agi=document.getElementById('priorYearAGIInput');agi.value='0';onMoneyBlur(agi);
    document.getElementById('priorYearEligibleInput').checked=true;
    document.getElementById('quarterlyModeInput').value='safe_harbor';
    calculate();localStorage.setItem('fte_v1_state',JSON.stringify(collectState()));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  assert.deepEqual(await page.evaluate(()=>[document.getElementById('priorYearTaxInput').value,document.getElementById('priorYearAGIInput').value,window._lastResult.quarterly]),['0','0',0]);
});
test('malformed or overflowing income cannot export a plausible numeric prefix', async page => {
  await seed(page);await mockCopy(page);
  const values=await page.evaluate(()=>{
    return ['123abc','-100','1'+'0'.repeat(308)].map(raw=>{
      document.getElementById('incomeInput').value=raw;copySummary();
      return {income:window._lastResult.incomeAnnual,copied:window.copiedText||''};
    });
  });
  for(const r of values)assert.deepEqual(r,{income:0,copied:''});
});
test('2025 installment date is consistent in UI, copied summary, PDF and PNG', async page => {
  await seed(page);await mockPDF(page);await mockCopy(page);
  const r=await page.evaluate(async()=>{
    setYear(2025);copySummary();downloadPDF();
    const original=CanvasRenderingContext2D.prototype.fillText;window.pngText=[];
    CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.pngText.push(text);return original.call(this,text,...args);};
    HTMLAnchorElement.prototype.click=function(){};await downloadImage();
    return {ui:document.getElementById('qtrD2').textContent,copy:window.copiedText,pdf:window.pdfText,png:window.pngText};
  });
  assert.equal(r.ui,'Jun 16, 2025');assert.match(r.copy,/Jun 16, 2025/);assert.match(r.pdf,/Jun 16, 2025/);assert.ok(r.png.includes('Jun 16, 2025'));
});
test('native PNG download produces a nonempty PNG', async page => {
  await seed(page);
  const download = page.waitForEvent('download'); await page.evaluate(() => downloadImage());
  const artifact = await download; const file = await artifact.path();
  assert.equal(fs.readFileSync(file).subarray(0,8).toString('hex'), '89504e470d0a1a0a');
  if(process.env.TAX_ARTIFACT_DIR) await artifact.saveAs(path.join(process.env.TAX_ARTIFACT_DIR, artifact.suggestedFilename()));
});
test('real PDF export renders and downloads', async page => {
  if (!process.env.TAX_EXPORT_LIB_DIR) return false;
  await seed(page);
  await page.addScriptTag({path:path.join(process.env.TAX_EXPORT_LIB_DIR,'jspdf/dist/jspdf.umd.min.js')});
  await page.addScriptTag({path:path.join(process.env.TAX_EXPORT_LIB_DIR,'html2canvas/dist/html2canvas.min.js')});
  const download = page.waitForEvent('download'); await page.evaluate(() => downloadPDF());
  const artifact = await download; const file = await artifact.path();
  assert.equal(fs.readFileSync(file).subarray(0,5).toString(), '%PDF-');
  if(process.env.TAX_ARTIFACT_DIR) await artifact.saveAs(path.join(process.env.TAX_ARTIFACT_DIR, artifact.suggestedFilename()));
});
test('mobile PDF and PNG downloads render', async page => {
  if (!process.env.TAX_EXPORT_LIB_DIR) return false;
  await page.setViewportSize({width:390,height:844}); await seed(page);
  await page.addScriptTag({path:path.join(process.env.TAX_EXPORT_LIB_DIR,'jspdf/dist/jspdf.umd.min.js')});
  await page.addScriptTag({path:path.join(process.env.TAX_EXPORT_LIB_DIR,'html2canvas/dist/html2canvas.min.js')});
  for (const kind of ['PDF','Image']) {
    const download = page.waitForEvent('download');
    await page.evaluate(kind => window['download'+kind](),kind);
    const artifact = await download; const data=fs.readFileSync(await artifact.path());
    assert.ok(data.length > 1000);
    assert.equal(kind==='PDF' ? data.subarray(0,5).toString() : data.subarray(0,8).toString('hex'), kind==='PDF' ? '%PDF-' : '89504e470d0a1a0a');
    if(process.env.TAX_ARTIFACT_DIR) await artifact.saveAs(path.join(process.env.TAX_ARTIFACT_DIR,'mobile-'+artifact.suggestedFilename()));
  }
});
test('review: section 68 limits itemized deductions in the actual calculator and reports', async page => {
  await seed(page,300);await mockPDF(page);await mockCopy(page);
  const r=await page.evaluate(()=>{
    toggleW2();document.getElementById('w2Input').value='800000';
    toggleItemized();document.getElementById('mortgageInterestInput').value='100000';
    toggleQBI();calculate();copySummary();downloadPDF();
    return {r:window._lastResult,copy:window.copiedText,pdf:window.pdfText};
  });
  near(r.r.section68Reduction,5405.405405405405);near(r.r.federalTax,217068.25);
  assert.match(r.copy,/section 68/i);assert.match(r.pdf,/section 68/i);
});
test('review: deduction selection compares the amounts after section 68', async page => {
  await seed(page,300);
  const r=await page.evaluate(()=>{
    toggleW2();document.getElementById('w2Input').value='800000';
    toggleItemized();document.getElementById('mortgageInterestInput').value='17000';
    toggleQBI();calculate();return window._lastResult;
  });
  assert.equal(r.usedDeductionMode,'standard');assert.equal(r.usedDeduction,16100);
});
test('review: malformed primary income with retained W-2 wages blocks every export', async page => {
  await seed(page);await mockPDF(page);await mockCopy(page);
  const r=await page.evaluate(async()=>{
    toggleW2();document.getElementById('w2Input').value='50000';calculate();
    window.clicks=0;HTMLAnchorElement.prototype.click=function(){window.clicks++;};
    document.getElementById('incomeInput').value='123abc';
    copySummary();downloadPDF();await downloadImage();
    return {copy:window.copiedText||'',pdf:window.pdfText||'',clicks:window.clicks};
  });
  assert.deepEqual(r,{copy:'',pdf:'',clicks:0});
});
test('review: decimal grammar remains strict after blur and known zero survives focus', async page => {
  await seed(page);
  const r=await page.evaluate(()=>{
    const el=document.getElementById('incomeInput');el.value='0x100';onMoneyBlur(el);calculate();
    const income=window._lastResult.incomeAnnual;
    const prior=document.getElementById('priorYearTaxInput');prior.value='0';onMoneyFocus(prior);onMoneyBlur(prior);
    return {income,prior:prior.value};
  });
  assert.deepEqual(r,{income:0,prior:'0'});
});
test('review: return scope and NIIT-only input are disclosed in UI and every report', async page => {
  await seed(page,250000);await mockPDF(page);await mockCopy(page);
  const r=await page.evaluate(async()=>{
    document.getElementById('niitInput').value='10000';calculate();copySummary();downloadPDF();
    const original=CanvasRenderingContext2D.prototype.fillText;const png=[];
    CanvasRenderingContext2D.prototype.fillText=function(text,...args){png.push(text);return original.call(this,text,...args);};
    HTMLAnchorElement.prototype.click=function(){};await downloadImage();
    return {ui:document.getElementById('scopeNote')?.textContent||'',copy:window.copiedText,pdf:window.pdfText,png:png.join(' ')};
  });
  for(const output of Object.values(r)) {assert.match(output,/AMT/);assert.match(output,/Investment input affects NIIT only/);}
});
test('review: ODC is labeled as a dependent credit rather than a child credit in reports', async page => {
  await seed(page);await mockPDF(page);
  const r=await page.evaluate(()=>{
    document.getElementById('dependentsInput').value='1';appState.ctcMode='mixed';appState.ctcOtherDependents=1;
    calculate();downloadPDF();return {credit:window._lastResult.ctc,ui:document.getElementById('rowCTC').innerText,pdf:window.pdfText};
  });
  assert.equal(r.credit,500);assert.match(r.ui,/Dependent Credits/);assert.match(r.pdf,/Dependent credits/);
});
test('review: unsupported saved filing status falls back without losing valid inputs', async page => {
  await page.evaluate(()=>localStorage.setItem('fte_v1_state',JSON.stringify({filingStatus:'mfs',incomeInput:'100000',year:2026})));
  await page.reload({waitUntil:'domcontentloaded'});
  const r=await page.evaluate(()=>window._lastResult);
  assert.equal(r.status,'single');assert.equal(r.incomeAnnual,100000);
});
test('review: large supported inputs remain finite across combined income sources', async page => {
  const r=await page.evaluate(()=>{
    document.getElementById('incomeInput').value='1000000000000';setIncMode('monthly');toggleW2();
    document.getElementById('filingStatus').value='mfj';
    document.getElementById('w2Input').value='1000000000000';
    document.getElementById('spouseW2Input').value='1000000000000';calculate();
    return window._lastResult;
  });
  for(const [key,value] of Object.entries(r))if(typeof value==='number')assert.ok(Number.isFinite(value),key);
  assert.equal(r.grossIncome,14000000000000);
});
test('review: new controls have native labels, keyboard operation and year visibility', async page => {
  await page.setViewportSize({width:390,height:844});await seed(page);
  await page.evaluate(()=>toggleAdv());await frames(page);
  const ids=['qbiActiveInput','cashCharityInput','quarterlyModeInput','priorYearEligibleInput'];
  const labels=await page.evaluate(ids=>ids.map(id=>document.getElementById(id).labels.length),ids);
  for(const count of labels)assert.ok(count>0);
  await page.locator('#qbiActiveInput').focus();await page.keyboard.press('Space');
  assert.equal(await page.locator('#qbiActiveInput').isChecked(),true);
  await page.getByLabel('2026 Qualifying Cash Gifts (Non-itemizers)',{exact:true}).fill('1000');
  await page.getByLabel('Quarterly Planning Target',{exact:true}).selectOption('safe_harbor');
  await page.locator('#priorYearEligibleInput').focus();await page.keyboard.press('Space');
  assert.equal(await page.locator('#priorYearEligibleInput').isChecked(),true);
  await page.locator('#yr2025').click();await frames(page);
  assert.equal(await page.locator('#cashCharityField').isHidden(),true);
  await page.locator('#yr2026').click();await frames(page);
  assert.equal(await page.locator('#cashCharityInput').inputValue(),'1,000');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
});
test('review: section 68 desktop and mobile exports remain readable native files', async page => {
  if (!process.env.TAX_EXPORT_LIB_DIR) return false;
  await seed(page,300);
  await page.addScriptTag({path:path.join(process.env.TAX_EXPORT_LIB_DIR,'jspdf/dist/jspdf.umd.min.js')});
  await page.addScriptTag({path:path.join(process.env.TAX_EXPORT_LIB_DIR,'html2canvas/dist/html2canvas.min.js')});
  await page.evaluate(()=>{
    toggleW2();document.getElementById('w2Input').value='800000';toggleItemized();
    document.getElementById('mortgageInterestInput').value='100000';toggleQBI();calculate();
    const render=window.html2canvas;window.html2canvas=(el,options)=>{window.actualPDFText=el.innerText;return render(el,options);};
  });
  for(const [profile,width] of [['desktop',1280],['mobile',390]]) {
    await page.setViewportSize({width,height:900});
    for(const kind of ['PDF','Image']) {
      const download=page.waitForEvent('download');await page.evaluate(kind=>window['download'+kind](),kind);
      const artifact=await download;const data=fs.readFileSync(await artifact.path());
      assert.equal(kind==='PDF'?data.subarray(0,5).toString():data.subarray(0,8).toString('hex'),kind==='PDF'?'%PDF-':'89504e470d0a1a0a');
      if(process.env.TAX_ARTIFACT_DIR)await artifact.saveAs(path.join(process.env.TAX_ARTIFACT_DIR,`section68-${profile}-${artifact.suggestedFilename()}`));
    }
    assert.match(await page.evaluate(()=>window.actualPDFText),/section 68/);
    if(process.env.TAX_ARTIFACT_DIR)await page.screenshot({path:path.join(process.env.TAX_ARTIFACT_DIR,`section68-${profile}.png`),fullPage:true});
  }
});
(async () => {
  const server = http.createServer((req,res) => {
    const file = path.resolve(root, '.' + new URL(req.url,'http://localhost').pathname);
    if(!file.startsWith(root+path.sep)) {res.writeHead(403);res.end();return;}
    fs.readFile(file,(error,body) => {
      if(error){res.writeHead(404);res.end();return;}
      if(process.env.TAX_BASELINE_HTML && file === path.join(root,'tax-estimator.html')) body = fs.readFileSync(process.env.TAX_BASELINE_HTML);
      res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'); res.end(body);
    });
  });
  let browser, passed=0, failed=0, skipped=0;
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  try {
    browser = await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium'});
    const selected=cases.filter(t=>!process.env.TAX_TEST_FILTER || t.name.includes(process.env.TAX_TEST_FILTER));
    assert.ok(selected.length,'test filter must select at least one case');
    for (const t of selected) {
      const context = await browser.newContext({viewport:{width:1280,height:900},timezoneId:'America/New_York'});
      const page = await context.newPage(); const errors=[]; page.on('pageerror',error => errors.push(error.message));
      await page.route('**/*',route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}/tax-estimator.html`,{waitUntil:'domcontentloaded'});
        const result = await t.run(page); assert.deepEqual(errors, []);
        if(result === false){skipped++;console.log('SKIP '+t.name);}else{passed++;console.log('PASS '+t.name);}
      } catch(error) {failed++;console.error('FAIL '+t.name+': '+error.message);}
      finally {await context.close();}
    }
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
  console.log(`RESULT passed=${passed} failed=${failed} skipped=${skipped}`);
  if(failed)process.exitCode=1;
})().catch(error => {console.error(error);process.exitCode=1;});
