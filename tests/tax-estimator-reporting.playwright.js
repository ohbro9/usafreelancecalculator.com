'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'..'),cases=[];const test=(name,run)=>cases.push({name,run});
const frames=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function money(p,id,value){await p.locator('#'+id).focus();await p.locator('#'+id).fill(value);await frames(p);}
async function advanced(p){if(await p.locator('#advToggleBtn').getAttribute('aria-expanded')!=='true')await p.locator('#advToggleBtn').click();}
async function setup(p){await money(p,'incomeInput','100000');await advanced(p);}

test('TAX02 fixed and zero state modes cannot apply conflicting presets',async p=>{await setup(p);await p.locator('#stateSw').click();for(const state of ['Illinois','Massachusetts','Michigan','Pennsylvania','Texas']){await p.locator('#stateDropdown').selectOption({label:state});await frames(p);assert.equal(await p.locator('#statePct').isDisabled(),true);assert.equal(await p.locator('#statePresetChips button:not([disabled])').count(),0);const r=await p.evaluate(()=>window._lastResult);assert(Math.abs(r.stateTax-r.stateBaseEstimate*r.statePctVal/100)<.005);assert.equal(await p.evaluate(()=>formatStateRate(window._lastResult.statePctVal)),String(r.statePctVal));} });
test('TAX03 every conditional financial input has an accessible name',async p=>{await setup(p);await money(p,'incomeInput','500000');await p.locator('#filingStatus').selectOption('mfj');for(const id of ['w2Sw','retireSw','itemizedSw','sCorpSw'])await p.locator('#'+id).click();const missing=await p.locator('input,select').evaluateAll(es=>es.filter(e=>e.type!=='checkbox'&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')&&!(e.labels?.length)).map(e=>e.id));assert.deepEqual(missing,[]);});
test('TAX04 retirement tax-net and spending cash are distinguished',async p=>{await setup(p);await p.locator('#retireSw').click();await money(p,'retireInput','10000');const r=await p.evaluate(()=>({r:window._lastResult,notes:getTaxScopeNotes(window._lastResult).join(' '),hero:document.getElementById('heroLabel').textContent}));assert(Math.abs(r.r.takeHome-79395.4504)<.005);assert.match(r.notes,/69,395.45/);assert.match(r.hero,/before retirement/i);});
test('TAX05 all permitted Other Dependent counts and persistence are representable',async p=>{await setup(p);await money(p,'dependentsInput','4');await p.locator('#ctcQualifyChips').getByRole('button',{name:'Some lower-credit dependents',exact:true}).click();for(const n of [4,6,10]){await money(p,'dependentsInput',String(n));await p.locator('#ctcOtherDepChips').getByRole('button',{name:n+' other dependents',exact:true}).click();await frames(p);const r=await p.evaluate(()=>window._lastResult);assert.equal(r.otherDependents,n);assert.equal(r.qualifyingChildren,0);assert.equal(r.actcEstimate,0);assert.equal(r.ctc,Math.min(500*n,r.federalBeforeCTC));}await p.locator('#yr2025').click();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('fte_v1_state'))?.ctcOtherDependents===10);await p.reload({waitUntil:'domcontentloaded'});assert.equal(await p.evaluate(()=>window._lastResult.otherDependents),10);await money(p,'incomeInput','1000');assert.equal(await p.evaluate(()=>window._lastResult.ctc),0);assert.equal(await p.evaluate(()=>window._lastResult.actcEstimate),0);});
test('TAX06 monthly receipts retain clearly annual expense dollars',async p=>{await setup(p);await p.locator('#incMonthlyBtn').click();await money(p,'incomeInput','5000');await money(p,'expInput','1000');assert.match(await p.locator('#expInput').getAttribute('aria-label'),/annual/i);assert.equal(await p.evaluate(()=>window._lastResult.expenses),1000);await p.locator('#incAnnualBtn').click();await frames(p);assert.match(await p.locator('#expInput').getAttribute('aria-label'),/annual/i);assert.equal(await p.evaluate(()=>window._lastResult.expenses),1000);});
test('TAX07 actual Fiverr net import preserves fee basis through Tax and Goal',async p=>{
  await p.goto(new URL('platform-fee-calculator.html',p.url()).href,{waitUntil:'domcontentloaded'});
  await p.locator('#chipGroup [data-name="Fiverr"]').click();
  await money(p,'amtGross','60000');await p.locator('#amtGross').blur();
  await p.waitForFunction(()=>window.__pfcResult?.youKeep===48000);
  const platform=await p.evaluate(()=>window.__pfcResult);
  assert.equal(platform.clientPays,60000);
  assert.equal(await p.locator('#resPlatform').innerText(),'$12,000.00');
  if(await p.locator('#sntChipNet').getAttribute('aria-pressed')!=='true')await p.locator('#sntChipNet').click();
  await Promise.all([p.waitForURL('**/tax-estimator.html#incomeSetupCard'),p.locator('#sntNextBtn').click()]);
  await p.waitForFunction(()=>window._lastResult?.incomeAnnual===48000);
  await p.waitForFunction(()=>JSON.parse(localStorage.getItem('fte_v1_state'))?.incomeBasis?.kind==='pre_tax_after_fees');
  await p.reload({waitUntil:'domcontentloaded'});
  const tax=await p.evaluate(()=>({result:window._lastResult,basis:appState.incomeBasis}));
  assert.equal(tax.result.incomeAnnual,48000);
  assert.equal(tax.result.expenses,0,'platform fees must not be deducted again');
  assert.equal(tax.result.netProfit,48000);
  assert.ok(Math.abs(tax.result.totalTax-9271.039168)<.005);
  assert.equal(tax.basis.kind,'pre_tax_after_fees');
  assert.equal(tax.basis.originalPeriod,'project');
  assert.match(await p.locator('#sntHint').innerText(),/fees already deducted/i);
  await Promise.all([p.waitForURL('**/income-goal-planner.html#goalInputCard'),p.locator('#sntNextBtn').click()]);
  const r=await p.evaluate(()=>({session:UFCToolkit.readSession(),text:document.getElementById('toolkitImportCard').innerText}));
  assert.equal(r.session.handoff.amount,48000);
  assert.equal(r.session.handoff.kind,'pre_tax_after_fees');
  assert.equal(r.session.handoff.period,'year','outgoing period is the selected planning view');
  assert.equal(r.session.assumptions.incomeOriginalPeriod,'project','original payout period must remain explicit');
  assert.equal(r.session.normalized.annualPreTaxAfterFees,48000);
  assert.equal(r.session.normalized.annualGross,0,'original client gross is not inferred');
  assert.equal(r.session.normalized.monthlyGross,0);
  assert.match(r.text,/fees.*already deducted/i);
  assert.match(r.text,/Original source period: project/);
  assert.equal(await p.locator('#toolkitGoalBtn').isDisabled(),true);
  const goal=await p.locator('#incomeGoal').inputValue();
  await p.locator('#toolkitBaselineBtn').click();
  // requestRecalc renders on the next frame: inspect the baseline, not pending-import copy.
  await p.waitForFunction(()=>document.getElementById('toolkitImportCard').classList.contains('is-baseline'));
  const baseline=await p.locator('#toolkitImportCard').innerText();
  assert.match(baseline,/fees.*already deducted/i);
  assert.match(baseline,/Original source period: project/);
  assert.match(baseline,/Original client gross is not inferred/i);
  assert.equal(await p.locator('#incomeGoal').inputValue(),goal,'context must not change the goal or apply fees again');
  assert.equal(await p.locator('#toolkitBaselineBtn').isDisabled(),true);
  if(process.env.TAX_ARTIFACT_DIR){
    fs.writeFileSync(path.join(process.env.TAX_ARTIFACT_DIR,'reporting-fee-provenance.json'),JSON.stringify({platform,tax,goalImport:r,baseline,goal},null,2));
    await p.screenshot({path:path.join(process.env.TAX_ARTIFACT_DIR,'reporting-fee-baseline.png'),fullPage:true});
  }
});
test('TAX08 genuine trillion PDF layout stays inside the page',async p=>{await setup(p);await money(p,'incomeInput','1000000000000');await p.addScriptTag({path:path.join(process.env.TAX_EXPORT_LIB_DIR,'jspdf/dist/jspdf.umd.min.js')});await p.addScriptTag({path:path.join(process.env.TAX_EXPORT_LIB_DIR,'html2canvas/dist/html2canvas.min.js')});await p.evaluate(()=>{const render=window.html2canvas;window.html2canvas=(el,options)=>{const box=el.getBoundingClientRect();window.layoutOverflow=[...el.querySelectorAll('.keep-value,.value,.due-amt,.t-value,.footer-chip')].filter(e=>{const r=e.getBoundingClientRect();const parent=e.parentElement.getBoundingClientRect();return r.left<box.left-1||r.right>box.right+1||e.scrollWidth>e.clientWidth+1||(e.classList.contains('value')&&(r.left<parent.left-1||r.right>parent.right+1))}).map(e=>e.className);return render(el,options)}});const event=p.waitForEvent('download');await p.locator('#pdfBtn').click();const d=await event;if(process.env.TAX_ARTIFACT_DIR)await d.saveAs(path.join(process.env.TAX_ARTIFACT_DIR,'reporting-trillion.pdf'));assert.deepEqual(await p.evaluate(()=>window.layoutOverflow),[]);});
test('TAX09 effective-rate explanation names its total-tax denominator',async p=>{const text=await p.locator('.out-meta').innerText();const source=await p.locator('.out-meta .tooltip-box').allTextContents();assert.doesNotMatch(source.join(' '),/Always lower/);assert.match(source.join(' '),/modeled annual taxes/i);});
test('TAX10 genuine PNG includes annual input basis',async p=>{await setup(p);await money(p,'expInput','20000');await p.evaluate(()=>{const draw=CanvasRenderingContext2D.prototype.fillText;window.reportText=[];CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.reportText.push(text);return draw.call(this,text,...args)}});const event=p.waitForEvent('download');await p.locator('#dlBtn').click();const d=await event;if(process.env.TAX_ARTIFACT_DIR)await d.saveAs(path.join(process.env.TAX_ARTIFACT_DIR,'reporting-inputs.png'));const text=await p.evaluate(()=>window.reportText.join(' '));assert.match(text,/Annual business expenses/);assert.match(text,/100,000.00/);assert.match(text,/20,000.00/);assert.match(text,/80,000.00/);});
test('TAX11 real PDF separates annual taxes withholding and federal reserve',async p=>{await setup(p);await p.locator('#w2Sw').click();await money(p,'w2Input','190000');await money(p,'withholdingInput','10000');await p.addScriptTag({path:path.join(process.env.TAX_EXPORT_LIB_DIR,'jspdf/dist/jspdf.umd.min.js')});await p.addScriptTag({path:path.join(process.env.TAX_EXPORT_LIB_DIR,'html2canvas/dist/html2canvas.min.js')});await p.evaluate(()=>{const render=window.html2canvas;window.html2canvas=(el,o)=>{window.reportText=el.innerText;return render(el,o)}});const event=p.waitForEvent('download');await p.locator('#pdfBtn').click();const d=await event;if(process.env.TAX_ARTIFACT_DIR)await d.saveAs(path.join(process.env.TAX_ARTIFACT_DIR,'reporting-mixed-withholding.pdf'));const text=await p.evaluate(()=>window.reportText);assert.doesNotMatch(text,/TOTAL TAX OWED/);assert.match(text,/TOTAL MODELED ANNUAL TAXES/);assert.match(text,/10,000.00/);assert.match(text,/14,194.00/);assert.match(text,/57,199.13/);});
(async()=>{const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}fs.readFile(file,(err,body)=>{if(err){res.writeHead(404);res.end();return;}if(process.env.TAX_BASELINE_HTML&&file===path.join(root,'tax-estimator.html'))body=fs.readFileSync(process.env.TAX_BASELINE_HTML);res.setHeader('content-type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));let b,passed=0,failed=0;try{b=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',timeout:15000});for(const t of cases.filter(x=>!process.env.TAX_TEST_FILTER||x.name.includes(process.env.TAX_TEST_FILTER))){const c=await b.newContext({viewport:{width:1366,height:768}}),p=await c.newPage();p.setDefaultTimeout(7000);const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());try{await p.goto(`http://127.0.0.1:${server.address().port}/tax-estimator.html`,{waitUntil:'domcontentloaded'});await t.run(p,c);assert.deepEqual(errors,[]);console.log('PASS '+t.name);passed++;}catch(e){failed++;console.log('FAIL '+t.name+': '+e.message);}finally{await c.close();}}}finally{if(b)await b.close();await new Promise(r=>server.close(r));}console.log(`RESULT passed=${passed} failed=${failed} skipped=0`);if(failed)process.exitCode=1;})().catch(e=>{console.error(e);process.exitCode=1});
