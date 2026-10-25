'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),cases=[];
const test=(name,run)=>cases.push({name,run});
const near=(a,b)=>assert.ok(Math.abs(a-b)<.005,`${a} != ${b}`);
const frames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function reverse(page){await page.locator('#tab2').click();await page.locator('#target').fill('80000');await frames(page);}
async function exportsReady(page){
  assert.ok(process.env.HRC_EXPORT_LIB_DIR,'HRC_EXPORT_LIB_DIR is required for actual exports');
  await page.addScriptTag({path:path.join(process.env.HRC_EXPORT_LIB_DIR,'html2pdf.js/dist/html2pdf.bundle.min.js')});
  await page.addScriptTag({path:path.join(process.env.HRC_EXPORT_LIB_DIR,'html2canvas/dist/html2canvas.min.js')});
}
async function assertInvalid(page){
  await frames(page);
  const s=await page.evaluate(()=>({gross:window.__gross,fwd:window.__fwdData,rev:window.__revData,payload:__hourlyTest.buildHourlyToolkitPayload()}));
  assert.equal(s.gross.year,0);assert.equal(s.fwd,null);assert.equal(s.rev,null);assert.equal(s.payload,null);
}
test('normal money: grouped rates, cents, pasted expenses and saved values agree',async p=>{
  for(const [raw,n] of [['1500',1500],['1,500',1500],['1500.50',1500.5],['1,500.50',1500.5]]){
    await p.locator('#rate').fill(raw);await frames(p);const s=await p.evaluate(()=>({d:window.__fwdData,g:window.__gross,payload:__hourlyTest.buildHourlyToolkitPayload()}));
    near(s.d.rate,n);near(s.g.year,n*1344);near(s.payload.normalized.annualGross,n*1344);
  }
  await p.evaluate(()=>__hourlyTest.setAdv(true));await p.locator('#expenses').fill('1,500.50');await frames(p);
  near(await p.evaluate(()=>window.__fwdData.exp),1500.5);
  await p.reload();await frames(p);near(await p.evaluate(()=>window.__fwdData.rate),1500.5);near(await p.evaluate(()=>window.__fwdData.exp),1500.5);
});
test('reverse money: decimal typing, intermediate dot, cursor editing and blur preserve cents',async p=>{
  await reverse(p);await p.locator('#target').fill('');await p.locator('#target').pressSequentially('1000.');
  assert.equal(await p.locator('#target').inputValue(),'1000.');await p.locator('#target').pressSequentially('50');await frames(p);
  assert.equal(await p.locator('#target').inputValue(),'1000.50');near(await p.evaluate(()=>window.__revData.tgtY),1000.5);
  await p.locator('#target').blur();assert.equal(await p.locator('#target').inputValue(),'1,000.50');
  await p.locator('#target').focus();await p.evaluate(()=>document.getElementById('target').setSelectionRange(0,8));await p.keyboard.type('1250.75');
  assert.equal(await p.locator('#target').inputValue(),'1250.75');
  await p.keyboard.press('ArrowLeft');await p.keyboard.press('Backspace');await p.keyboard.type('5');assert.equal(await p.locator('#target').inputValue(),'1250.55');
  await p.keyboard.press('Home');await p.keyboard.press('Delete');assert.equal(await p.locator('#target').inputValue(),'250.55');await frames(p);near(await p.evaluate(()=>window.__revData.tgtY),250.55);
});
test('390px touch profile preserves normal and reverse decimal editing without overflow',async p=>{
  await p.locator('#rate').fill('');await p.locator('#rate').pressSequentially('1500.50');await frames(p);
  assert.equal(await p.locator('#rate').inputValue(),'1500.50');near(await p.evaluate(()=>window.__fwdData.rate),1500.5);
  await p.keyboard.press('ArrowLeft');await p.keyboard.press('Backspace');await p.keyboard.type('7');
  assert.equal(await p.locator('#rate').inputValue(),'1500.70');await p.locator('#rate').blur();
  assert.equal(await p.locator('#rate').inputValue(),'1,500.70');
  await reverse(p);await p.locator('#target').fill('');await p.locator('#target').pressSequentially('0.50');await frames(p);
  assert.equal(await p.locator('#target').inputValue(),'0.50');near(await p.evaluate(()=>window.__revData.tgtY),.5);
  await p.locator('#target').fill('1,000.50');await frames(p);near(await p.evaluate(()=>window.__revData.tgtY),1000.5);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
});
test('money grammar: bad rate/expense/target text stays visible and cannot become a numeric prefix',async p=>{
  for(const id of ['rate','expenses','target']){
    if(id==='target')await reverse(p);else await p.locator('#tab1').click();
    if(id==='expenses')await p.evaluate(()=>{document.getElementById('rate').value='50';__hourlyTest.setAdv(true)});
    for(const raw of ['1,50','1..50','1,000.5.0','-1','NaN','1e3','1000000000000000000000','text']){
      await p.locator('#'+id).fill(raw);await frames(p);assert.equal(await p.locator('#'+id).inputValue(),raw);await assertInvalid(p);
    }
    await p.locator('#'+id).fill(id==='expenses'?'0':'1000');await frames(p);
  }
});
for(const mode of ['fwd','rev'])test(`${mode} invalid state: schedules, zero billable and clearing money invalidate snapshots and every output action`,async p=>{
  if(mode==='rev')await reverse(p);
  const inputs=mode==='rev'?['hpdR','dpwR','wpyR','billableRTxt','target']:['hpd','dpw','wpy','billable','rate'];
  await p.evaluate(()=>{window.__renderCalls=0;window.__copyCalls=0;window.html2canvas=()=>{window.__renderCalls++;return new Promise(()=>{});};window.html2pdf=()=>{window.__renderCalls++;};Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>{window.__copyCalls++;return Promise.resolve();}}});});
  let downloads=0;p.on('download',()=>downloads++);
  for(const id of inputs){
    await p.evaluate(({id})=>{document.getElementById(id).value=id==='target'||id==='rate'?'':'0';__hourlyTest.calc();},{id});await assertInvalid(p);
    await p.locator('#btnCopy').click();await p.locator('#btnBreakdown').click();await p.locator('#btnPDF').click();
    const url=p.url();await p.locator('#ctaBtn').click();await p.waitForTimeout(450);assert.equal(p.url(),url);
    assert.equal(await p.evaluate(()=>__hourlyTest.buildFwdPDF('test')),'');assert.equal(await p.evaluate(()=>__hourlyTest.buildRevPDF('test')),'');
    assert.deepEqual(await p.evaluate(()=>[window.__renderCalls,window.__copyCalls]),[0,0]);assert.equal(downloads,0);
    await p.evaluate(({id})=>{const defaults={hpd:8,dpw:5,wpy:48,billable:70,rate:50,hpdR:8,dpwR:5,wpyR:48,billableRTxt:70,target:80000};document.getElementById(id).value=defaults[id];__hourlyTest.calc();},{id});
    assert.ok(await p.evaluate(()=>window.__gross.year)>0);
  }
});
test('same-frame actions recompute current inputs even without an input event',async p=>{
  await reverse(p);await p.evaluate(()=>{document.getElementById('target').value='1000.50';window.__copied='';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:t=>{window.__copied=t;return Promise.resolve();}}});});
  await p.locator('#btnCopy').click();near(await p.evaluate(()=>window.__revData.tgtY),1000.5);assert.match(await p.evaluate(()=>window.__copied),/1,?000\.50/);
  await p.evaluate(()=>document.getElementById('hpdR').value='0');await p.locator('#btnCopy').click();await assertInvalid(p);
});
test('unsafe derived rates from an extremely small billable percentage cannot export or transfer',async p=>{
  await reverse(p);await p.locator('#billableRTxt').fill('0.000000000001');await frames(p);await assertInvalid(p);
});
test('same-frame custom percentage changes use the visible percentage, not a previous state value',async p=>{
  await p.evaluate(()=>__hourlyTest.setAdv(true));await p.locator('#taxToggleRow').click();
  await p.evaluate(()=>{__hourlyTest.setForwardTaxMode('custom',25);__hourlyTest.calc();document.getElementById('fwdCustomTaxPct').value='33.33';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.resolve()}});});
  await p.locator('#btnCopy').click();near(await p.evaluate(()=>window.__fwdData.taxR),33.33);near(await p.evaluate(()=>window.__fwdData.annualTaxExact),22397.76);
});
test('reverse billable autofill uses the visible field even when no input event fires',async p=>{
  await reverse(p);await p.evaluate(()=>{document.getElementById('billableRTxt').value='50';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.resolve()}});});
  await p.locator('#btnCopy').click();near(await p.evaluate(()=>window.__revData.n2),83.34);
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('hrcSched')).billableR),'50');
  const payload=await p.evaluate(()=>__hourlyTest.buildHourlyToolkitPayload());
  assert.equal(payload.assumptions.utilizationPct,50);near(payload.normalized.annualGross,80006.4);
});
test('reverse periods and gross/manual/smart after-tax solvers preserve their financial contracts',async p=>{
  await reverse(p);
  for(const period of ['year','month','week'])for(const after of [false,true]){
    await p.evaluate(({period,after})=>{document.querySelector(`input[name="period"][value="${period}"]`).checked=true;document.querySelector(`input[name="goalType"][value="${after?'after':'before'}"]`).checked=true;__hourlyTest.setReverseTaxMode('manual',25);}, {period,after});
    await p.locator('#target').fill('1,000.50');await frames(p);const d=await p.evaluate(()=>window.__revData);const goal=1000.5*(period==='month'?12:period==='week'?48:1);near(d.tgtY,goal);near(d.n2,Math.ceil(goal/(after?.75:1)/1344*100-1e-9)/100);
  }
  await p.evaluate(()=>{document.querySelector('input[name="period"][value="year"]').checked=true;__hourlyTest.setReverseTaxMode('smart');});await p.locator('#target').fill('80000.50');await frames(p);
  const s=await p.evaluate(()=>({d:window.__revData,model:__hourlyTest.getHourlySmartTaxModel({annualGross:window.__gross.year,monthlyBusinessExpenses:0,filingStatus:'single',taxRegion:'federal_only'})}));
  assert.ok(s.model.annualNetAfterTax>=80000.5-.01); // The unrounded solver output must meet the target.
  near(s.d.annualTaxExact,s.model.annualTax);assert.equal(s.d.ny,Math.round(s.model.annualNetAfterTax));
});
test('baseline smart-tax fixtures, monthly views and reverse expense boundary remain unchanged',async p=>{
  const fixtures=[
    [{annualGross:67200,monthlyBusinessExpenses:0,filingStatus:'single',taxRegion:'federal_only'},14809.36,52390.64],
    [{annualGross:150000,monthlyBusinessExpenses:1000,filingStatus:'mfj',taxRegion:'state_higher'},40188.85,109811.15],
    [{annualGross:120000,monthlyBusinessExpenses:500,filingStatus:'hoh',taxRegion:'state_balanced'},32703.85,87296.15],
  ];
  for(const [inputs,tax,net] of fixtures){const m=await p.evaluate(o=>window.__hrcSmartTaxEngine.getHourlySmartTaxModel(o),inputs);near(m.annualTax,tax);near(m.annualNetAfterTax,net);}
  await p.evaluate(()=>{document.getElementById('expenses').value='1000';__hourlyTest.calc();});
  near(await p.evaluate(()=>window.__gross.month),5600);near(await p.evaluate(()=>window.__fwdData.netYr),55200);
  await p.evaluate(()=>{document.querySelector('input[name="fwdM"][value="real"]').checked=true;__hourlyTest.calc();});
  near(await p.evaluate(()=>window.__gross.month),1400*52/12);near(await p.evaluate(()=>window.__fwdData.netYr),55200);
  await reverse(p);const first=await p.evaluate(()=>window.__revData.n2);
  await p.evaluate(()=>{document.getElementById('expenses').value='5000';__hourlyTest.calc();});near(await p.evaluate(()=>window.__revData.n2),first);
});
test('saved numeric values, cents, invalid state, reset and independent mode settings remain compatible',async p=>{
  await p.evaluate(()=>{localStorage.setItem('hrcSched',JSON.stringify({version:3,activeMode:'rev',rate:1500.5,expenses:1500.5,hpd:8,dpw:5,wpy:48,billable:70,target:1000.5,hpdR:8,dpwR:5,wpyR:48,billableR:70,period:'month',goalType:'before',fwdM:'real',revM:'avg',fwdTax:{mode:'manual',manualTaxPct:25,filingStatus:'mfj',taxRegion:'state_balanced'},revTax:{mode:'manual',manualTaxPct:20,filingStatus:'single',taxRegion:'federal_only'}}));});
  await p.reload();await frames(p);near(await p.evaluate(()=>window.__revData.tgtY),12006);
  await p.locator('#tab1').click();await frames(p);near(await p.evaluate(()=>window.__fwdData.rate),1500.5);near(await p.evaluate(()=>window.__fwdData.exp),1500.5);
  assert.deepEqual(await p.evaluate(()=>[window.__fwdData.taxMode,window.__fwdData.filingStatus,window.__fwdData.taxRegion,window.__fwdData.methL]),['manual','mfj','state_balanced','Realistic (Weekly × 4.33)']);
  await reverse(p);await p.locator('#target').fill('1,50');await frames(p);await p.reload();await frames(p);assert.equal(await p.locator('#target').inputValue(),'1,50');await assertInvalid(p);
  await p.locator('#btnReset').click();await frames(p);assert.ok(await p.evaluate(()=>window.__gross.year)>0);assert.equal(await p.locator('#target').inputValue(),'80,000');
});
test('custom percentages reject malformed and out-of-range text without rewriting it',async p=>{
  for(const mode of ['fwd','rev']){
    if(mode==='rev')await reverse(p);else {await p.evaluate(()=>__hourlyTest.setAdv(true));await p.locator('#taxToggleRow').click();}
    await p.evaluate(mode=>{if(mode==='fwd'){__hourlyTest.setForwardTaxMode('custom',25);}else{document.querySelector('input[name="goalType"][value="after"]').checked=true;__hourlyTest.setReverseTaxMode('custom',25);}__hourlyTest.calc();},mode);
    const id=mode==='fwd'?'fwdCustomTaxPct':'revCustomTaxPct';
    for(const raw of ['25x','100','-1','']){await p.locator('#'+id).fill(raw);await frames(p);assert.equal(await p.locator('#'+id).inputValue(),raw);await assertInvalid(p);
      if(raw==='25x'){await p.reload();await frames(p);if(mode==='fwd')await p.evaluate(()=>__hourlyTest.setAdv(true));assert.equal(await p.locator('#'+id).inputValue(),raw);assert.equal(await p.locator('#'+id).isVisible(),true);await assertInvalid(p);}
    }
    await p.locator('#'+id).fill('25.5');await frames(p);assert.ok(await p.evaluate(()=>window.__gross.year)>0);
  }
});
for(const kind of ['PNG','PDF'])test(`in-flight ${kind} export cancels if inputs become invalid during capture`,async p=>{
  await reverse(p);await exportsReady(p);let downloads=0;p.on('download',()=>downloads++);
  await p.evaluate(()=>{window.__renderPending=false;window.html2canvas=()=>new Promise(resolve=>{window.__renderPending=true;window.__releaseRender=()=>{const c=document.createElement('canvas');c.width=10;c.height=10;resolve(c);};});});
  await p.locator(kind==='PNG'?'#btnBreakdown':'#btnPDF').click();await p.waitForFunction(()=>window.__renderPending);
  if(kind==='PNG')await p.evaluate(()=>document.getElementById('billableRTxt').value='0');else await p.locator('#hpdR').fill('0');
  await frames(p);await p.evaluate(()=>window.__releaseRender());await p.waitForTimeout(700);assert.equal(downloads,0);await assertInvalid(p);
});
for(const [width,mode,taxOn] of [[390,'fwd',false],[390,'rev',false],[1280,'fwd',false],[1280,'rev',false],[1280,'fwd',true],[1280,'rev',true]])test(`actual ${mode} ${taxOn?'after-tax':'gross'} PDF/PNG exports use recovered current inputs at ${width}px`,async p=>{
  assert.ok(process.env.HRC_ARTIFACT_DIR,'HRC_ARTIFACT_DIR is required for export evidence');await p.setViewportSize({width,height:900});if(mode==='rev')await reverse(p);
  if(taxOn){if(mode==='fwd'){await p.evaluate(()=>__hourlyTest.setAdv(true));await p.locator('#taxToggleRow').click();}await p.evaluate(mode=>{if(mode==='fwd')__hourlyTest.setForwardTaxMode('manual',25);else{document.querySelector('input[name="goalType"][value="after"]').checked=true;__hourlyTest.setReverseTaxMode('manual',25);}},mode);}
  await p.locator(mode==='fwd'?'#rate':'#target').fill('bad');await frames(p);await assertInvalid(p);
  await p.locator(mode==='fwd'?'#rate':'#target').fill(mode==='fwd'?'1,500.50':'80,000.50');await frames(p);await exportsReady(p);
  await p.evaluate(()=>{const render=window.html2canvas;window.__exportTexts=[];window.html2canvas=(el,options)=>{window.__exportTexts.push(el.innerText);return render(el,options);};});
  for(const kind of ['PNG','PDF']){const wait=p.waitForEvent('download',{timeout:60000});await p.locator(kind==='PNG'?'#btnBreakdown':'#btnPDF').click();const d=await wait;const file=path.join(process.env.HRC_ARTIFACT_DIR,`${mode}-${taxOn?'tax':'gross'}-${width}-${d.suggestedFilename()}`);await d.saveAs(file);const bytes=fs.readFileSync(file);assert.equal(kind==='PDF'?bytes.subarray(0,5).toString():bytes.subarray(0,8).toString('hex'),kind==='PDF'?'%PDF-':'89504e470d0a1a0a');assert.ok(bytes.length>5000);const text=await p.evaluate(()=>window.__exportTexts.at(-1));assert.match(text,mode==='fwd'?/1,?500\.50/:taxOn?/79\.37/:/59\.53/);assert.match(text,mode==='fwd'?/2,016,672/:taxOn?/106,673/:/80,008/);fs.writeFileSync(file+'.txt',text);}
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:path.join(process.env.HRC_ARTIFACT_DIR,`${mode}-${taxOn?'tax':'gross'}-${width}-page.png`),fullPage:true});
});

(async()=>{
  const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404);res.end();return;}if(file===path.join(root,'hourly-rate-calculator.html')){if(process.env.HRC_BASELINE_HTML)b=fs.readFileSync(process.env.HRC_BASELINE_HTML);b=b.toString().replace('/* INIT */','window.__hourlyTest={calc,calcFwd,calcRev,buildFwdPDF,buildRevPDF,buildHourlyToolkitPayload,setAdv,setForwardTaxMode,setReverseTaxMode,getHourlySmartTaxModel};\n/* INIT */');}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(b);});});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium'});let passed=0,failed=0;
  if(process.env.HRC_ARTIFACT_DIR)fs.mkdirSync(process.env.HRC_ARTIFACT_DIR,{recursive:true});
  try{const selected=cases.filter(t=>!process.env.HRC_TEST_FILTER||t.name.includes(process.env.HRC_TEST_FILTER));assert.ok(selected.length);for(const t of selected){const mobile=t.name.includes('390px');const context=await browser.newContext({viewport:{width:mobile?390:1280,height:900},isMobile:mobile,hasTouch:mobile});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));try{await page.goto(`http://127.0.0.1:${server.address().port}/hourly-rate-calculator.html`,{waitUntil:'domcontentloaded'});await t.run(page);assert.deepEqual(errors,[]);passed++;console.log('PASS '+t.name);}catch(e){failed++;console.error('FAIL '+t.name+': '+e.message);}finally{await context.close();}}}finally{await browser.close();await new Promise(r=>server.close(r));}
  console.log(`RESULT passed=${passed} failed=${failed} skipped=0`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
