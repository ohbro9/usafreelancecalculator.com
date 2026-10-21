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
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('fte_v1_state')).retirePlanType === 'sep');
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
  if(process.env.TAX_ARTIFACT_DIR) await page.screenshot({path:path.join(process.env.TAX_ARTIFACT_DIR,'mobile-2025.png'),fullPage:true});
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
    for (const t of cases) {
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
