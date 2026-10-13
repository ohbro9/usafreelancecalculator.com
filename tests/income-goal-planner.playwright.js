'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
let baseURL = process.env.IGP_BASE_URL;
const html = fs.readFileSync(path.join(__dirname,'../income-goal-planner.html'),'utf8');
const instrumented = html.replace("if (document.readyState === 'loading') {", "window.__igp={state,ui,calculate,recalcAll,calculatePipeline,buildPdfData,buildShareCardData,downloadPDF,downloadShareCard,copyPlan,collectPersistedState,buildBudgetToolkitPayload,goNextToBudget};\nif (document.readyState === 'loading') {");
const tests = [];
const test = (name, run) => tests.push({name,run});
const near=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
async function scenario(page) {
  await page.evaluate(()=>{
    const a=window.__igp;
    Object.assign(a.state,{advancedEnabled:true,goalMode:'monthly',calcMode:'average',stateTaxRate:3,otherIncomeAnnual:0,w2IncomeAnnual:0,feesEnabled:true,platformFeePreset:'none',processorFeePreset:'stripe',withdrawalEnabled:false,bufferMode:'percent',bufferPct:15,seTaxEnabled:true,seTaxMode:'smart',taxMode:'smart',benchEnabled:true,benchTier:'intermediate',pipeEnabled:true,targetSource:'planner',revenueMode:'projects',confidence:'realistic'});
    for(const [k,v] of Object.entries({incomeInput:5000,hoursInput:8,daysInput:5,weeksInput:48,utilInput:70,expenseInput:600,stateTaxInput:3,feePercentInput:0,processorFeeInput:2.9,fixedFeeInput:.3,txInput:4,feeModeSelect:'Freelancer absorbs',pipeModelInput:3500,pipeLeadInput:25,pipeCallInput:70,pipeCloseInput:40,pipeWorkingDaysInput:22,benchRole:'webdev',bufferInput:15,bufferAmountInput:750}))a.ui[k].value=String(v);
    a.recalcAll();
  });
}
test('dashboard and PDF/PNG agree on reference hourly take-home',async p=>{
 const data=await p.evaluate(()=>{const a=window.__igp;return {r:a.state.lastResult,pdf:a.buildPdfData(),png:a.buildShareCardData(),chip:a.ui.netChip.textContent};});
 assert.ok(data.chip.includes('$44.64/hr'));assert.ok(data.pdf.hero.netChip.includes('$44.64/hr'));assert.ok(data.png.netAfterTax.includes('$44.64/hr'));
 assert.equal(data.pdf.hero.rate,'$79.39/hr');assert.equal(data.pdf.hero.grossMonth,'$8,891');assert.equal(data.pdf.hero.grossYear,'$106,697');
 assert.ok(data.pdf.pipeline.bigMetric.includes('36.3'));assert.equal(data.pdf.pipeline.metrics[0].value,'9.1');
});
test('PDF builder refreshes after same-frame goal input',async p=>{
 const data=await p.evaluate(()=>{const a=window.__igp;a.ui.incomeInput.value='6000';a.ui.incomeInput.dispatchEvent(new Event('input',{bubbles:true}));return a.buildPdfData();});assert.equal(data.hero.goal,'$6,000/mo');
});
test('PNG builder refreshes after same-frame goal input',async p=>{
 const data=await p.evaluate(()=>{const a=window.__igp;a.ui.incomeInput.value='6000';a.ui.incomeInput.dispatchEvent(new Event('input',{bubbles:true}));return a.buildShareCardData();});assert.equal(data.goalMonthly,'$6,000');
});
test('selecting current buffer mode is idempotent',async p=>{
 const data=await p.evaluate(()=>{const a=window.__igp;a.ui.bufferModeButtons[0].click();a.recalcAll();return a.state.lastResult;});near(data.bufferAmount,750);
});
test('switching buffer modes retains cents',async p=>{
 const data=await p.evaluate(()=>{const a=window.__igp;Object.assign(a.state,{bufferMode:'amount',bufferAmount:750.55});a.ui.bufferAmountInput.value='750.55';a.ui.bufferModeButtons[0].click();a.ui.bufferModeButtons[1].click();a.ui.bufferAmountInput.dispatchEvent(new Event('change',{bubbles:true}));a.recalcAll();return {r:a.state.lastResult,input:a.ui.bufferAmountInput.value};});near(data.r.bufferAmount,750.55);near(Number(data.input.replace(/,/g,'')),750.55);
});

test('zero conversions clear forecasts and exports omit pipeline',async p=>{
 const data=await p.evaluate(()=>{const a=window.__igp;a.ui.pipeLeadInput.value='0';a.ui.pipeLeadInput.dispatchEvent(new Event('input',{bubbles:true}));const pdf=a.buildPdfData();return {pdf,text:a.ui.pipeBigMetric.textContent};});assert.equal(data.pdf.pipeline,null);assert.equal(data.text,'Pipeline needs input');
});
test('custom buffer survives persistence and refresh',async p=>{
 await p.evaluate(()=>{const a=window.__igp;a.ui.bufferModeButtons[1].click();a.ui.bufferAmountInput.value='750.55';a.ui.bufferAmountInput.dispatchEvent(new Event('input',{bubbles:true}));a.recalcAll();localStorage.setItem('income-goal-planner-state-v1',JSON.stringify(a.collectPersistedState()));});
 await p.reload();await p.waitForFunction(()=>!!window.__igp?.state.lastResult);const r=await p.evaluate(()=>window.__igp.state.lastResult);near(r.bufferAmount,750.55);near(r.goalMonthly,5000);
});
test('750 percent remains distinct from $750 through mode conversion',async p=>{
 const data=await p.evaluate(()=>{const a=window.__igp;a.ui.bufferInput.value='750';a.ui.bufferInput.dispatchEvent(new Event('input',{bubbles:true}));a.recalcAll();const percent=a.state.lastResult.bufferAmount;a.ui.bufferModeButtons[1].click();const converted=Number(a.ui.bufferAmountInput.value);a.ui.bufferAmountInput.value='750';a.ui.bufferAmountInput.dispatchEvent(new Event('input',{bubbles:true}));a.recalcAll();return {percent,converted,amount:a.state.lastResult.bufferAmount};});assert.deepEqual(data,{percent:37500,converted:37500,amount:750});
});
test('monthly/yearly switch retains numeric input and reports its selected unit',async p=>{
 const data=await p.evaluate(()=>{const a=window.__igp;a.ui.goalSegments[1].click();a.ui.incomeInput.value='60000';a.ui.incomeInput.dispatchEvent(new Event('input',{bubbles:true}));const yearly=a.buildPdfData();a.ui.goalSegments[0].click();const monthly=a.buildPdfData();return {yearly,monthly,value:a.ui.incomeInput.value};});assert.equal(data.yearly.hero.goal,'$5,000/mo');assert.equal(data.monthly.hero.goal,'$60,000/mo');assert.equal(data.value,'60,000');
});
test('cross-tool Budget payload preserves gross and separates goal from buffer',async p=>{
 const d=await p.evaluate(()=>{const a=window.__igp;return a.buildBudgetToolkitPayload(a.state.lastResult);});assert.equal(d.handoff.kind,'gross');near(d.normalized.monthlyGross,8891.39);near(d.normalized.goalTakeHomeMonthly,5000);near(d.normalized.bufferAmountMonthly,750);
});
test('Budget handoff refreshes after same-frame goal input',async p=>{
 const d=await p.evaluate(()=>{const a=window.__igp;const setHandoff=window.UFCToolkit.setHandoff;let sent;window.UFCToolkit.setHandoff=(tool,payload)=>{sent=payload;return setHandoff(tool,payload);};window.UFCToolkit.goNext=()=>true;a.ui.incomeInput.value='6000';a.ui.incomeInput.dispatchEvent(new Event('input',{bubbles:true}));a.goNextToBudget();return sent;});near(d.normalized.goalTakeHomeMonthly,6000);
});
test('same-frame invalid goal prevents PDF and PNG snapshots',async p=>{
 const d=await p.evaluate(()=>{const a=window.__igp;a.ui.incomeInput.value='0';a.ui.incomeInput.dispatchEvent(new Event('input',{bubbles:true}));return [a.buildPdfData(),a.buildShareCardData()];});assert.deepEqual(d,[null,null]);
});
test('real premium PDF and PNG downloads render on a mobile viewport',async p=>{
 if(!process.env.IGP_ARTIFACT_DIR)return false;
 const out=process.env.IGP_ARTIFACT_DIR;fs.mkdirSync(out,{recursive:true});
 if(process.env.IGP_EXPORT_LIB_DIR){await p.addScriptTag({path:path.join(process.env.IGP_EXPORT_LIB_DIR,'html2canvas.js')});await p.addScriptTag({path:path.join(process.env.IGP_EXPORT_LIB_DIR,'jspdf.js')});}
 await p.waitForFunction(()=>typeof window.html2canvas==='function'&&!!window.jspdf?.jsPDF);
 const pdfWait=p.waitForEvent('download');await p.evaluate(()=>window.__igp.downloadPDF());await (await pdfWait).saveAs(path.join(out,'Income-Goal-Planner-verified-premium.pdf'));
 const pngWait=p.waitForEvent('download');await p.evaluate(()=>window.__igp.downloadShareCard());await (await pngWait).saveAs(path.join(out,'Income-Goal-Planner-verified-share.png'));
 await p.evaluate(()=>{window.__igp.state.advancedEnabled=false;window.__igp.recalcAll();});
 const count=await p.evaluate(()=>window.__igp.buildPdfData().advancedPage);assert.equal(count,null);
 const simpleWait=p.waitForEvent('download');await p.evaluate(()=>window.__igp.downloadPDF());await (await simpleWait).saveAs(path.join(out,'Income-Goal-Planner-verified-basic.pdf'));
});
(async()=>{
 let server;
 if (!baseURL) {
   const root=path.resolve(__dirname,'..');
   server=require('node:http').createServer((req,res)=>{
     const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
     if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
     fs.readFile(file,(err,body)=>{if(err){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);});
   });
   await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
   baseURL='http://127.0.0.1:'+server.address().port;
 }
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 let failures=0;
 for(const t of tests){const p=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Asia/Kolkata'});await p.route('**/income-goal-planner.html',r=>r.fulfill({body:instrumented,contentType:'text/html'}));if(process.env.IGP_EXPORT_LIB_DIR)await p.route('https://cdnjs.cloudflare.com/**',r=>r.abort());await p.goto(baseURL+'/income-goal-planner.html');await p.waitForFunction(()=>!!window.__igp?.state.lastResult);await scenario(p);try{const result=await t.run(p);console.log((result===false?'SKIP ':'PASS ')+t.name);}catch(e){failures++;console.log('FAIL '+t.name+': '+e.message);}await p.close();}
 await browser.close();if(server)await new Promise(resolve=>server.close(resolve));if(failures)process.exitCode=1;
})();
