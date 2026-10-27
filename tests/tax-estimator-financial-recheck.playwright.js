'use strict';
// Independent ordinary-method fixtures: IRS Schedule 8812 earned-income
// worksheet; W-2 Box 1 excludes employee pretax elective deferrals. The
// 401(k) input models employee deferrals only, not employer contributions.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.TAX_ARTIFACT_DIR,cases=[],records=[];
const test=(name,run)=>cases.push({name,run});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
async function fixture(p,x={}){
  return p.evaluate(x=>{
    resetAll(true); appState.year=x.year||2026; appState.sCorpOn=x.scorp!==false;
    appState.retireOn=(x.retire||0)>0; appState.retirePlanType=x.plan||'401k';
    appState.w2On=(x.w2||0)>0||(x.spouse||0)>0;appState.advOpen=true;
    const values={incomeInput:x.income??20000,expInput:0,filingStatus:x.status||'single',sCorpSalaryInput:x.salary??10000,sCorpAdminInput:0,retireInput:x.retire||0,w2Input:x.w2||0,spouseW2Input:x.spouse||0,dependentsInput:x.children??1,withholdingInput:x.withholding||0};
    for(const[id,v]of Object.entries(values))document.getElementById(id).value=String(v);
    calculate();return window._lastResult;
  },x);
}
// Literal expected amounts are hand-derived, never obtained from app helpers.
const variants=[
 ['no deferral',{},10000,1125],
 ['one cent above earned threshold',{retire:7499.99},2500.01,.0015],
 ['exact earned threshold',{retire:7500},2500,0],
 ['one cent below earned threshold',{retire:7500.01},2499.99,0],
 ['original flag A',{retire:8000},2000,0],
 ['entire salary deferred',{retire:10000},0,0],
 ['deferral capped to salary',{retire:12000},0,0],
 ['SEP employer contribution is not salary deferral',{plan:'sep',retire:2500},10000,1125],
 ['custom split is not inferred',{plan:'custom',retire:8000},10000,1125],
 ['external W2 not deducted again',{retire:8000,w2:10000},12000,1425],
 ['already net external W2',{scorp:false,income:300,w2:2000},2300,0],
 ['mixed refundable only',{scorp:false,income:300,w2:10000},10300,1170],
 ['sole proprietor employee style',{scorp:false,retire:8000},18587.045,1700],
 ['sole proprietor SEP',{scorp:false,plan:'sep',retire:1000},18587.045,1700],
 ['zero earnings',{income:0,salary:0},0,0],
 ['nonrefundable CTC exhausted pool',{income:200000,salary:100000},100000,0],
];
for(const year of[2025,2026])for(const status of['single','mfj','hoh'])for(const[name,input,earned,actc]of variants){
 test(`ACTC ${year} ${status} ${name}`,async p=>{
  const x={...input,year,status},r=await fixture(p,x);
  records.push({name,inputs:x,expected:{earned,actc},actual:r});
  near(r.actcEarnedIncomeBase,earned);near(r.actcEstimate,actc);
  if(input.retire&&input.plan!=='sep'&&input.plan!=='custom'&&input.scorp!==false){near(r.employeePayrollTax,765);near(r.employerPayrollTax,765);}
  if(name==='original flag A'){near(r.totalTax,765);near(r.takeHome,18470);near(r.retireContrib,8000);near(r.sCorpDistribution,9235);}
  if(name==='nonrefundable CTC exhausted pool'){near(r.ctc,2200);}
 });
}
test('ACTC MFJ spouse Box1 wages stay in earned income',async p=>{const r=await fixture(p,{status:'mfj',retire:8000,w2:10000,spouse:3000});near(r.actcEarnedIncomeBase,15000);near(r.actcEstimate,1700);});
for(const width of[1366,390,360])test(`ACTC actual controls recalculate after retirement toggles ${width}px`,async p=>{
 await p.setViewportSize({width,height:width===1366?768:844});
 const money=async(id,value)=>{const field=p.locator('#'+id);await field.focus();await field.fill(value);assert.equal(await field.inputValue(),value);};
 await p.locator('#incomeInput').fill('20000');await p.locator('#advToggleBtn').press('Enter');
 for(const id of['sCorpSw','retireSw']){await p.locator('#'+id).press('Space');await p.waitForFunction(id=>document.getElementById(id).getAttribute('aria-checked')==='true',id);}
 await money('sCorpSalaryInput','10000');await money('sCorpAdminInput','0');await money('retireInput','8000');await money('dependentsInput','1');
 await p.waitForFunction(()=>window._lastResult?.actcEarnedIncomeBase===2000);
 await p.locator('#retireSw').press('Space');await p.waitForFunction(()=>window._lastResult?.actcEstimate===1125);
 await p.locator('#retireSw').press('Space');await p.waitForFunction(()=>window._lastResult?.actcEstimate===0&&window._lastResult.retireContrib===8000);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);
 if(out)await p.screenshot({path:path.join(out,`actc-controls-${width}px.png`),fullPage:true});
});
for(const year of[2025,2026])for(const mode of['negative','zero','positive','scorp','cash'])test(`SIGNED genuine ${year} ${mode}`,async p=>{
 const input=mode==='negative'?{income:300,w2:10000,scorp:false}:mode==='zero'?{income:300,w2:0,children:0,scorp:false}:mode==='scorp'?{income:20000,salary:10000,retire:8000}:{income:100000,w2:10000,scorp:false};
 if(mode==='cash')Object.assign(input,{income:20000,salary:18000,retire:18000,scorp:true,w2:0});
 const r=await fixture(p,{...input,year,withholding:mode==='positive'?1000:0});
 if(mode==='negative'){near(r.totalTax,-405);near(r.actcEstimate,1170);}else if(mode==='zero')near(r.totalTax,0);else if(mode==='scorp'){near(r.totalTax,765);near(r.actcEstimate,0);near(r.actcEarnedIncomeBase,2000);}else if(mode==='cash'){near(r.totalTax,1377);near(r.takeHome-r.retireContrib,-754);}else{assert.ok(r.totalTax>0);near(r.ctc,2200);near(r.actcEstimate,0);}
 await p.waitForFunction(()=>document.getElementById('totalTaxOut').textContent===fmt(window._lastResult.totalTax));
 const ui=await p.locator('#totalTaxOut').innerText();
 // Capture clipboard boundary without replacing financial calculations.
 await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.recheckCopy=text;}}}));
 await p.locator('#copyBtn').click();
 const copy=await p.evaluate(()=>window.recheckCopy);assert.ok(copy.includes(ui));
 await p.addScriptTag({path:path.join(process.env.TAX_EXPORT_LIB_DIR,'jspdf/dist/jspdf.umd.min.js')});
 await p.addScriptTag({path:path.join(process.env.TAX_EXPORT_LIB_DIR,'html2canvas/dist/html2canvas.min.js')});
 // Observe real render input and native canvas text; do not mock either export.
 await p.evaluate(()=>{const render=window.html2canvas;window.html2canvas=(el,options)=>{window.recheckPDF=el.innerText;window.recheckPDFTotals=[...el.querySelectorAll('.stat-card.red .value,.t-value')].map(e=>e.innerText);return render(el,options);};const draw=CanvasRenderingContext2D.prototype.fillText;window.recheckPNG=[];CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.recheckPNG.push(String(text));return draw.call(this,text,...args);};});
 for(const[id,ext]of[['pdfBtn','pdf'],['dlBtn','png']]){if(ext==='png')await p.evaluate(()=>{window.recheckPNG=[];});const pending=p.waitForEvent('download',{timeout:30000});await p.locator('#'+id).click();const d=await pending;if(out)await d.saveAs(path.join(out,`signed-${year}-${mode}.${ext}`));}
 const report=await p.evaluate(()=>({pdf:window.recheckPDF,totals:window.recheckPDFTotals,png:window.recheckPNG}));
 records.push({name:`signed-${year}-${mode}`,inputs:input,actual:r,ui,copy,...report});
 if(out){fs.writeFileSync(path.join(out,`signed-${year}-${mode}.json`),JSON.stringify(records.at(-1),null,2));await p.screenshot({path:path.join(out,`signed-${year}-${mode}-ui.png`),fullPage:true});}
 assert.deepEqual(report.totals,[ui,ui]);assert.ok(report.png.includes(ui));
 assert.doesNotMatch(report.pdf,/-\$0\.00/,'zero offsets must not acquire a negative sign');
 if(mode==='cash'){assert.match(report.pdf,/-\$754\.00/);assert.match(copy,/-\$754\.00/);assert.ok(report.png.some(text=>text.includes('-$754.00')));}
 if(mode==='negative'){assert.match(report.pdf,/not a guaranteed refund/i);assert.match(copy,/not a guaranteed refund/i);}
});
(async()=>{
 if(out)fs.mkdirSync(out,{recursive:true});const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}fs.readFile(file,(err,body)=>{if(err){res.writeHead(404);res.end();return;}if(process.env.TAX_BASELINE_HTML&&file===path.join(root,'tax-estimator.html'))body=fs.readFileSync(process.env.TAX_BASELINE_HTML);res.setHeader('content-type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let b,passed=0,failed=0;
 try{b=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium'});for(const t of cases.filter(x=>!process.env.TAX_TEST_FILTER||x.name.includes(process.env.TAX_TEST_FILTER))){const c=await b.newContext({viewport:{width:1366,height:768}}),p=await c.newPage();p.setDefaultTimeout(7000);await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());try{await p.goto(`http://127.0.0.1:${server.address().port}/tax-estimator.html`,{waitUntil:'domcontentloaded'});await t.run(p);console.log('PASS '+t.name);passed++;}catch(e){console.log('FAIL '+t.name+': '+e.stack);console.log('DIAGNOSTIC '+JSON.stringify(await p.evaluate(()=>({earned:window._lastResult?.actcEarnedIncomeBase,actc:window._lastResult?.actcEstimate,salary:window._lastResult?.sCorpSalary,admin:window._lastResult?.sCorpAdminCost,retire:appState.retireOn,field:document.getElementById('retireInput').value}))));failed++;}finally{await c.close();}}}
 finally{if(out)fs.writeFileSync(path.join(out,'financial-recheck-results.json'),JSON.stringify(records,null,2));if(b)await b.close();await new Promise(r=>server.close(r));}
 console.log(`RESULT passed=${passed} failed=${failed} skipped=0`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
