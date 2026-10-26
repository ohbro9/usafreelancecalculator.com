'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.PFC_ARTIFACT_DIR||'/tmp/usafc-platform-evidence';fs.mkdirSync(out,{recursive:true});
const cases=[],test=(name,run)=>cases.push({name,run});
const html=fs.readFileSync(path.join(root,'platform-fee-calculator.html'),'utf8').replace('initializePlatformAccessibility();\nbindPlatformIntegerMoneyInputs();',`window.__pfcTest={calc,buildPremiumPdfData,buildPlatformToolkitPayload,applyPlatformToolkitAutofill,goNextPlatform,copyBreakdown,resetAll,populateTemplate,renderPremiumPdfHtml,setForwardTaxMode,setReverseTaxMode,setPlatformAnnualTaxProfile};initializePlatformAccessibility();\nbindPlatformIntegerMoneyInputs();`);
const val=(p,id,v)=>p.locator('#'+id).fill(String(v));
const result=p=>p.evaluate(()=>window.__pfcResult);
const custom=async(p,n)=>{await p.locator('[data-name="Custom"]').click();await val(p,'customFeeInput',n)};
const data=p=>p.evaluate(()=>__pfcTest.buildPremiumPdfData());
const importState=(period='month')=>({sourceTool:'hourly_rate',updatedAt:Date.now(),handoff:{amount:5000,period,kind:'gross',label:period+' Gross'},assumptions:{weeksPerYear:48,daysPerWeek:5}});
test('S1/X3 invalid fee boundary clears results and blocks all downstream actions',async p=>{
 await custom(p,98.9);assert.equal((await result(p)).youKeep,11);
 await val(p,'customFeeInput',99);assert.equal(await result(p),null);
 const before=p.url();await p.evaluate(()=>{__pfcTest.copyBreakdown();__pfcTest.goNextPlatform()});assert.equal(p.url(),before);
 assert.equal(await p.evaluate(()=>__pfcTest.buildPlatformToolkitPayload()),null);
 for(const id of ['downloadBtn','compDlBtn','pdfBtn']){if(await p.locator('#'+id).count())await p.locator('#'+id).click();}
 await custom(p,97.5);await p.locator('#intlToggle').check();assert.equal(await result(p),null,'Aggregate exactly 99% must be rejected');await p.locator('#intlToggle').uncheck();
 await custom(p,12);assert.equal((await result(p)).youKeep,880);
});
test('S4 real Custom baseline in both modes including ties, taxes and add-ons',async p=>{
 for(const n of [0,10,12,20]){
  await custom(p,n);const d=await data(p),up=d.compRows.find(r=>r.name==='Upwork');
  assert.equal(d.currentRow.keep,1000*(1-n/100));assert.equal(up.diff,Math.round((900-d.currentRow.keep)*100)/100);
 }
 await p.locator('#procToggle').check();await p.locator('details').first().evaluate(e=>e.open=true);await val(p,'prPct',2.9);await val(p,'prFix',.3);await val(p,'withdrawalFee',3);
 await custom(p,12);const withFees=await data(p);assert.equal(withFees.currentRow.keep,847.7);assert.equal(withFees.compRows.find(r=>r.name==='Upwork').diff,20);
 await p.locator('#tabNet').click();await custom(p,12);let d=await data(p);assert.equal(d.currentRow.charge,d.chargeClient);
 await p.locator('#revGoalTypeChips [data-goal="after_tax"]').click();await p.locator('#revTaxChips [data-pct="25"]').click();
 d=await data(p);assert.equal(d.currentRow.charge,d.chargeClient);assert.equal(d.currentRow.diff,0);
});
test('S3 saved zero processing fees and zero payment survive reload',async p=>{
 await p.locator('#procToggle').check({force:true});await p.locator('details').first().evaluate(e=>e.open=true);
 await val(p,'prPct',0);await val(p,'prFix',0);assert.equal((await result(p)).youKeep,900);
 await p.reload();assert.equal((await result(p)).youKeep,900);assert.equal(await p.locator('#prPct').inputValue(),'0');
 await val(p,'amtGross',0);await p.reload();assert.equal((await result(p)).clientPays,0);
});
test('S6/S11 malformed input stays visible; blank blur becomes zero consistently',async p=>{
 for(const raw of ['-100','1e3','1..50','1,50','1000.555','100000000.01']){
  await val(p,'amtGross',raw);assert.equal(await result(p),null,raw);assert.equal(await p.locator('#amtGross').inputValue(),raw);
  await p.locator('#amtGross').blur();assert.equal(await result(p),null,raw);
 }
 await val(p,'amtGross','');await p.locator('#amtGross').blur();assert.equal((await result(p)).youKeep,0);assert.equal(await p.locator('#amtGross').inputValue(),'0');
 await val(p,'amtGross','$1,000.55');assert.equal((await result(p)).youKeep,900.49);
 await p.locator('#tabNet').click();await val(p,'amtNet','');await p.locator('#amtNet').blur();assert.equal((await result(p)).clientPays,0);
});
test('S8 zero payout feedback has no navigation or undefined helper error',async p=>{
 await val(p,'amtGross',0);const url=p.url();await p.evaluate(()=>__pfcTest.goNextPlatform());assert.equal(p.url(),url);
});
test('F4 Smart missing profile blocks result and recovers with valid setup',async p=>{
 await p.locator('#tabNet').click();await p.locator('#revGoalTypeChips [data-goal="after_tax"]').click();
 await p.locator('#revTaxChips [data-mode="smart"]').click();assert.equal(await result(p),null);
 await p.evaluate(()=>{__pfcTest.setPlatformAnnualTaxProfile({annualIncome:96000,annualExpenses:16000});__pfcTest.calc()});
 assert.ok((await result(p)).finalTakeHome>=1000);
});
test('F5 fees above gross invalidate report and recover',async p=>{
 await val(p,'amtGross',.01);await p.locator('#procToggle').check({force:true});assert.equal(await result(p),null);
 await val(p,'amtGross',1000);assert.equal((await result(p)).youKeep,870.7);
});
test('F6 large unsolved reverse target never fabricates achievement',async p=>{
 await p.locator('#tabNet').click();await val(p,'amtNet',100000000);assert.equal(await result(p),null);
 await val(p,'amtNet',1000000);assert.ok((await result(p)).retainedBeforeTax>=1000000);
});
test('S2 own-source and wrong-kind imports rejected, including legacy reload',async p=>{
 for(const kind of ['gross','pre_tax_after_fees','take_home'])assert.equal(await p.evaluate(s=>__pfcTest.applyPlatformToolkitAutofill(s),{...importState(),sourceTool:'platform_fee',handoff:{amount:900,kind,period:'year'}}),false);
 assert.equal((await result(p)).clientPays,1000);
 await p.evaluate(()=>{localStorage.setItem('UFC_SHARED',JSON.stringify({source_tool:'platform',selected_value:900,updated_at:Date.now()}));localStorage.removeItem('usaFreelanceToolkit_v2')});
 await p.reload();assert.equal((await result(p)).clientPays,1000);
});
test('S5 incoming period/calendar persists without reimport, edits/reset/clean clear context',async p=>{
 for(const period of ['project','week','month','year']){
  assert.equal(await p.evaluate(s=>__pfcTest.applyPlatformToolkitAutofill(s),importState(period)),true);
  await p.reload();let payload=await p.evaluate(()=>__pfcTest.buildPlatformToolkitPayload());assert.equal(payload.handoff.period,period);assert.equal(payload.handoff.amount,4500);assert.equal(payload.assumptions.weeksPerYear,48);
 }
 await val(p,'amtGross',5100);assert.equal((await p.evaluate(()=>__pfcTest.buildPlatformToolkitPayload())).handoff.period,'project');
 await p.evaluate(s=>__pfcTest.applyPlatformToolkitAutofill(s),importState());await p.locator('#presetClean').click();assert.equal((await p.evaluate(()=>__pfcTest.buildPlatformToolkitPayload())).handoff.period,'project');
 await p.evaluate(s=>__pfcTest.applyPlatformToolkitAutofill(s),importState());await p.evaluate(()=>__pfcTest.resetAll());assert.equal((await p.evaluate(()=>__pfcTest.buildPlatformToolkitPayload())).handoff.period,'project');
});
test('S2/S5 actual Platform → Tax → Back reload preserves payout basis and existing expenses',async p=>{
 await p.evaluate(s=>{localStorage.setItem('taxState',JSON.stringify({}));__pfcTest.applyPlatformToolkitAutofill(s)},importState());
 await p.reload();await p.evaluate(()=>__pfcTest.goNextPlatform());await p.waitForURL('**/tax-estimator.html*');
 const session=await p.evaluate(()=>UFCToolkit.readSession());assert.equal(session.handoff.amount,4500);assert.equal(session.handoff.period,'month');assert.equal(session.handoff.kind,'pre_tax_after_fees');
 await p.goBack();await p.reload();assert.equal((await result(p)).clientPays,5000);assert.equal((await result(p)).youKeep,4500);
});
test('actual Hourly monthly gross reaches Platform, then Tax preserves saved expenses',async p=>{
 await p.goto(p.url().replace('platform-fee-calculator.html','hourly-rate-calculator.html'));
 await val(p,'rate',75);await p.locator('.send-card[data-gfc="month"]').click();
 await p.locator('#ctaBtn').click();await p.waitForURL('**/platform-fee-calculator.html*');
 const r=await result(p);assert.ok(r.clientPays>0);
 const payload=await p.evaluate(()=>__pfcTest.buildPlatformToolkitPayload());assert.equal(payload.handoff.period,'month');assert.equal(payload.handoff.kind,'pre_tax_after_fees');
 // Seed expenses through the actual destination UI, then return and send the current payout.
 const platformURL=p.url();await p.goto(platformURL.replace('platform-fee-calculator.html','tax-estimator.html'));
 await val(p,'expInput',1200);await p.locator('#expInput').blur();await p.waitForFunction(()=>{const keys=Object.keys(localStorage);return keys.some(k=>{try{return JSON.parse(localStorage.getItem(k))?.expInput==='1,200'||JSON.parse(localStorage.getItem(k))?.expInput==='1200'}catch{return false}})});
 await p.goto(platformURL);await p.evaluate(()=>__pfcTest.goNextPlatform());await p.waitForURL('**/tax-estimator.html*');
 assert.equal(Number((await p.locator('#expInput').inputValue()).replace(/,/g,'')),1200);
 assert.equal(Number((await p.locator('#incomeInput').inputValue()).replace(/,/g,'')),payload.handoff.amount);
});
test('raw invalid annual and custom tax inputs cannot be silently clamped into success',async p=>{
 await p.locator('#fwdTaxChips [data-mode="custom"]').click();
 await val(p,'fwdCustomTaxPct',-5);assert.equal(await result(p),null);await p.reload();assert.equal(await result(p),null);
 await val(p,'fwdCustomTaxPct',25);assert.equal((await result(p)).youKeep,900);
 await p.locator('#fwdTaxChips [data-mode="smart"]').click();await p.locator('#fwdTaxAssumptionsBtn').click();
 await val(p,'fwdAnnualIncome','-100');assert.equal(await result(p),null);
 await val(p,'fwdAnnualIncome','96000');assert.equal((await result(p)).clientPays,1000);
});
test('S7 native keyboard modes/platform/tax/send selections have accessible states',async p=>{
 for(const [selector,key] of [['#tabNet','Enter'],['[data-name="Fiverr"]','Space'],['#revTaxChips [data-pct="25"]','Enter'],['#sntChipClient','Space']]){
  const e=p.locator(selector);assert.equal(await e.evaluate(e=>e.tagName),'BUTTON');await e.focus();await e.press(key);assert.equal(await e.getAttribute('aria-pressed'),'true');
 }
 assert.equal(await p.locator('#amtNet').getAttribute('aria-label'),'I want to keep in USD');
});
for(const width of [1366,390,360])test(`mobile/layout/theme ${width}px has no horizontal overflow`,async p=>{
 await p.setViewportSize({width,height:width===1366?768:width===390?844:800});
 for(const mode of ['#tabClient','#tabNet']){
  await p.locator(mode).click();await custom(p,12);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
 await p.evaluate(()=>document.body.classList.add('dark'));await p.screenshot({path:path.join(out,`layout-${width}.png`),fullPage:true});
});
async function libs(p){
 const dir=process.env.PFC_EXPORT_LIB_DIR||process.env.NODE_PATH;
 assert.ok(dir,'PFC_EXPORT_LIB_DIR or NODE_PATH is required');
 await p.addScriptTag({path:path.join(dir,'html2canvas/dist/html2canvas.min.js')});
 await p.addScriptTag({path:path.join(dir,'jspdf/dist/jspdf.umd.min.js')});
 await p.evaluate(()=>{window.__exportCapture=[];const capture=window.html2canvas;window.html2canvas=async function(el,opts){__exportCapture.push({text:el.innerText,legend:[...el.querySelectorAll('.legend span')].map(e=>e.innerText)});return capture(el,opts)}});
}
for(const state of ['forward-custom','reverse-preview','reverse-manual','reverse-smart'])test(`X1/X2/X3 genuine PNG, comparison PNG and paginated PDF: ${state}`,async p=>{
 await custom(p,12);
 if(state!=='forward-custom'){
  await p.locator('#tabNet').click();await p.locator('#revTaxChips [data-pct="25"]').click();
  if(state!=='reverse-preview')await p.locator('#revGoalTypeChips [data-goal="after_tax"]').click();
  if(state==='reverse-smart')await p.evaluate(()=>{__pfcTest.setPlatformAnnualTaxProfile({annualIncome:96000,annualExpenses:16000});__pfcTest.setReverseTaxMode('smart')});
 }
 await libs(p);const d=await data(p);assert.equal(d.currentRow.name,'Custom');assert.ok(Math.abs(d.keepPct+d.platformPct+d.taxPct+d.otherPct-100)<1e-6);
 for(const [id,ext] of [['downloadImage','png'],['downloadCompImage','png'],['downloadPDF','pdf']]){
  const selector=id==='downloadImage'?'#downloadBtn':id==='downloadCompImage'?'#compDlBtn':'#pdfBtn';
  const found=await p.locator(selector).count();
  const download=p.waitForEvent('download',{timeout:90000});
  if(found)await p.locator(selector).click();else await p.evaluate(name=>{const b=[...document.querySelectorAll('button')].find(e=>e.getAttribute('onclick')?.includes(name));if(!b)throw Error('Missing download '+name);b.click()},id);
  const artifact=await download,file=path.join(out,`${state}-${id}.${ext}`);await artifact.saveAs(file);const bytes=fs.readFileSync(file);
  if(ext==='pdf'){
   const {PDFDocument}=require('pdf-lib');const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>=2);
   for(const page of pdf.getPages()){assert.ok(Math.abs(page.getWidth()-595.28)<1);assert.ok(Math.abs(page.getHeight()-841.89)<1);}
  }else{assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.ok(bytes.length>5000);}
 }
 const captures=await p.evaluate(()=>__exportCapture);assert.ok(captures[0].text.includes(d.mode==='client'?'$880.00':d.chargeClient.toLocaleString('en-US',{style:'currency',currency:'USD'})));assert.ok(captures[0].text.includes('Custom'));fs.writeFileSync(path.join(out,state+'-capture.json'),JSON.stringify(captures,null,2));
 const chart=captures.find(c=>c.legend.length===4);assert.ok(chart);const sum=chart.legend.reduce((n,s)=>n+parseFloat(s),0);assert.ok(Math.abs(sum-100)<=.2,JSON.stringify(chart.legend));
});
(async()=>{
 const server=require('node:http').createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(bytes)});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium'});let passed=0,failed=0;
 try{for(const t of cases){if(process.env.PFC_TEST_FILTER&&!t.name.includes(process.env.PFC_TEST_FILTER))continue;
  const context=await browser.newContext({viewport:{width:1366,height:768}});await context.route('https://**',r=>r.abort());await context.route('**/platform-fee-calculator.html*',r=>r.fulfill({body:html,contentType:'text/html'}));const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  try{await p.goto(base+'/platform-fee-calculator.html',{waitUntil:'domcontentloaded'});await t.run(p);assert.deepEqual(errors,[]);passed++;console.log('PASS '+t.name)}catch(e){failed++;console.error('FAIL '+t.name+'\n'+e.stack)}finally{await context.close()}
 }}finally{await browser.close();await new Promise(r=>server.close(r))}
 console.log(`RESULT passed=${passed} failed=${failed} skipped=0`);if(!passed||failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
