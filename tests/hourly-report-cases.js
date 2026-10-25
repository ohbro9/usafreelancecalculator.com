'use strict';
// Registered by the existing Hourly browser runner; no production test hooks.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=({test,near,frames,reverse,exportsReady})=>{
const percentages=[60,69,69.5,70,70.25,70.75,80,99.5,100];
const money=n=>'$'+Math.round(n).toLocaleString('en-US');
async function setup(p,{mode='fwd',tax='smart',expenses=1820,pct=69.5}={}){
  if(mode==='rev')await reverse(p);
  await p.evaluate(o=>{
    const el=id=>document.getElementById(id);
    if(o.mode==='fwd'){
      el('rate').value='1,500.00';el('billable').value=o.pct;el('expenses').value=o.expenses;
      el('taxChk').checked=o.tax!=='off';
      __hourlyTest.setForwardTaxMode(o.tax==='smart'?'smart':'manual',25.5);
      document.querySelector('input[name="fwdM"][value="real"]').checked=true;
    }else{
      el('target').value='80,000.50';el('billableRTxt').value=o.pct;
      document.querySelector(`input[name="goalType"][value="${o.tax==='off'?'before':'after'}"]`).checked=true;
      __hourlyTest.setReverseTaxMode(o.tax==='smart'?'smart':'manual',25.5);
      document.querySelector('input[name="revM"][value="real"]').checked=true;
    }
    // Dispatch the existing typing path so evidence screenshots also show current chips.
    for(const id of o.mode==='fwd'?['rate','billable']:['billableRTxt'])el(id).dispatchEvent(new Event('input',{bubbles:true}));
    __hourlyTest.calc();__hourlyTest.buildHourlyToolkitPayload();
  },{mode,tax,expenses,pct});await frames(p);
}
async function snapshot(p,mode){return p.evaluate(mode=>{
  const d=mode==='fwd'?window.__fwdData:window.__revData;
  const pdf=new DOMParser().parseFromString(mode==='fwd'?__hourlyTest.buildFwdPDF('October 25, 2026'):__hourlyTest.buildRevPDF('October 25, 2026'),'text/html').body.textContent.replace(/\s+/g,' ');
  return {d,g:window.__gross,pdf,payload:__hourlyTest.buildHourlyToolkitPayload(),saved:JSON.parse(localStorage.getItem('hrcSched')),hourly:document.getElementById('netHrEff').textContent};
},mode);}
async function captureSetup(p){
  await exportsReady(p);
  await p.evaluate(()=>{
    window.__reportCaptures=[];window.__pdfMetrics=[];
    const render=window.html2canvas;
    window.html2canvas=async(el,options)=>{
      const r=el.getBoundingClientRect();
      const ranges=[];const walk=el.ownerDocument.createTreeWalker(el,NodeFilter.SHOW_TEXT);
      while(walk.nextNode())if(walk.currentNode.textContent.trim()){
        const range=el.ownerDocument.createRange();range.selectNodeContents(walk.currentNode);
        const b=range.getBoundingClientRect();if(b.width&&b.height)ranges.push({text:walk.currentNode.textContent.trim(),x:b.left-r.left,y:b.top-r.top,right:b.right-r.left,bottom:b.bottom-r.top});
      }
      const canvas=await render(el,options);
      window.__reportCaptures.push({text:el.innerText,width:r.width,height:r.height,scrollHeight:el.scrollHeight,canvasWidth:canvas.width,canvasHeight:canvas.height,ranges});
      return canvas;
    };
    const proto=window.html2pdf.Worker.prototype,get=proto.get;
    proto.get=function(key,cb){const worker=this;return get.call(this,key,cb).then(value=>{
      if(key==='pdf')window.__pdfMetrics.push({pages:value.internal.getNumberOfPages(),width:value.internal.pageSize.getWidth(),height:value.internal.pageSize.getHeight(),ratio:worker.prop.pageSize.inner.ratio,pixelPageHeight:Math.floor(worker.prop.canvas.width*worker.prop.pageSize.inner.ratio)});
      return value;
    });};
  });
}
async function download(p,kind,name,{single=true}={}){
  const dir=process.env.HRC_ARTIFACT_DIR;assert.ok(dir);
  const event=p.waitForEvent('download',{timeout:60000});await p.locator(kind==='PDF'?'#btnPDF':'#btnBreakdown').click();
  const d=await event,file=path.join(dir,name+'.'+kind.toLowerCase());await d.saveAs(file);
  const capture=await p.evaluate(()=>window.__reportCaptures.at(-1));
  fs.writeFileSync(file+'.json',JSON.stringify(capture,null,2));
  assert.ok(capture.ranges.some(r=>/report is an estimate|reverse calculation report|Monthly calc method/.test(r.text)),'complete footer in renderer');
  for(const r of capture.ranges){assert.ok(r.y>=-1&&r.bottom<=capture.height+1,`vertical clipping: ${r.text}`);assert.ok(r.x>=-1&&r.right<=capture.width+1,`horizontal clipping: ${r.text}`);}
  if(kind==='PDF'){
    const {PDFDocument}=require(path.join(process.env.HRC_EXPORT_LIB_DIR,'pdf-lib'));
    const pdf=await PDFDocument.load(fs.readFileSync(file));
    const metrics=await p.evaluate(()=>window.__pdfMetrics.at(-1));
    fs.writeFileSync(file+'.pages.json',JSON.stringify({pages:pdf.getPageCount(),sizes:pdf.getPages().map(p=>p.getSize()),metrics,captureSize:[capture.canvasWidth,capture.canvasHeight]},null,2));
    if(single)assert.equal(pdf.getPageCount(),1,'one-page report must not acquire a blank tail page');
    assert.equal(pdf.getPageCount(),metrics.pages);
    // The complete captured raster must fit the PDF slice without scaling distortion or clipping.
    if(single)assert.ok(metrics.pixelPageHeight>=capture.canvasHeight,'PDF page covers entire raster');
    near(pdf.getPage(0).getWidth()/metrics.width,.75);
  }else{
    const bytes=fs.readFileSync(file);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16),capture.canvasWidth);assert.equal(bytes.readUInt32BE(20),capture.canvasHeight);
    assert.ok(capture.canvasWidth>=2000&&capture.canvasHeight>=2000,'high resolution PNG');
  }
  return capture;
}
for(const mode of ['fwd','rev'])for(const tax of ['off','manual','smart'])test(`Stage B ${mode} ${tax} fractional snapshots and report mathematics`,async p=>{
  const rows=[];
  for(const pct of percentages){
    await setup(p,{mode,tax,pct});const s=await snapshot(p,mode),d=s.d,hrs=8*5*48*pct/100;
    rows.push({pct,hrs,...s});
    near(d.billPct,pct);assert.ok(s.pdf.includes(pct+'%'),'PDF must state exact percentage');
    near(s.payload.assumptions.utilizationPct,pct);near(s.payload.normalized.annualGross,s.g.year);
    near(Number(mode==='fwd'?s.saved.billable:s.saved.billableR),pct);
    if(mode==='fwd'){
      near(s.g.day,1500*8*pct/100);near(s.g.week,1500*8*5*pct/100);near(s.g.year,1500*hrs);
      near(s.g.month,s.g.week*52/12);
      const taxModel=await p.evaluate(({gross,tax})=>tax==='smart'?__hourlyTest.getHourlySmartTaxModel({annualGross:gross,monthlyBusinessExpenses:1820,filingStatus:'single',taxRegion:'federal_only'}).annualTax:tax==='manual'?Math.round(gross*.255*100)/100:0,{gross:s.g.year,tax});
      near(d.annualTaxExact,taxModel);
      const usable=s.g.year-taxModel-1820*12,hr=(usable/hrs).toFixed(2);
      assert.equal(s.hourly,(usable<0?'-$':'$')+Math.abs(usable/hrs).toFixed(2)+'/hr');
      assert.ok(s.pdf.includes('$'+hr),'PDF usable hourly uses actual billable hours');
      if(pct===69.5&&tax==='smart'){assert.equal(Math.round(d.annualTaxExact),759024);near(d.netYr,1220736);assert.equal(hr,'914.82');}
    }else{
      near(s.g.year,d.n2*hrs);if(tax==='off')assert.ok(s.pdf.includes(Math.round(hrs).toLocaleString('en-US')),'Reverse PDF correct billable hours');
    }
  }
  fs.writeFileSync(path.join(process.env.HRC_ARTIFACT_DIR,`stage-b-${mode}-${tax}-matrix.json`),JSON.stringify(rows,null,2));
});
test('Stage B restored Quick Rate selection matches numeric saved values and preserves unrelated settings',async p=>{
  const selected=()=>p.locator('#rateChips .active-orange').evaluateAll(els=>els.map(e=>e.dataset.r));
  assert.deepEqual(await selected(),['50']);
  for(const rate of [25,50,75,100,150,200]){
    await p.locator(`#rateChips [data-r="${rate}"]`).click();await frames(p);assert.deepEqual(await selected(),[String(rate)]);
    await p.reload();await frames(p);assert.deepEqual(await selected(),[String(rate)]);near(await p.evaluate(()=>window.__fwdData.rate),rate);
  }
  for(const raw of ['1500','1,500','1,500.50','75.00','75.50','1,50']){
    await p.locator('#rate').fill(raw);await frames(p);const expected=raw==='75.00'?['75']:[];assert.deepEqual(await selected(),expected);
    await p.reload();await frames(p);assert.deepEqual(await selected(),expected);
    assert.equal(await p.locator('#rate').inputValue(),raw);
  }
  await p.locator('#rate').fill('1,500.50');await p.locator('#billable').fill('69.5');await frames(p);
  await reverse(p);await p.reload();await frames(p);await p.locator('#tab1').click();await frames(p);assert.deepEqual(await selected(),[]);
  near(await p.evaluate(()=>window.__fwdData.rate),1500.5);assert.equal(await p.locator('#billable').inputValue(),'69.5');
  // A new tab in the same persistent browser context emulates closing/reopening the calculator.
  const q=await p.context().newPage();try{await q.goto(p.url());await frames(q);assert.equal(await q.locator('#rate').inputValue(),'1,500.50');assert.equal(await q.locator('#rateChips .active-orange').count(),0);}finally{await q.close();}
  await p.locator('#btnReset').click();await frames(p);assert.deepEqual(await selected(),['50']);near(await p.evaluate(()=>window.__fwdData.rate),50);
});
for(const width of [390,1280])test(`Stage B monthly card method follows clicks, saved state, tabs and reset at ${width}px`,async p=>{
  await p.setViewportSize({width,height:900});await setup(p,{tax:'off',expenses:0});
  const check=async(real)=>{await frames(p);assert.equal(await p.locator('#rMonthly').textContent(),real?'$180,700':'$166,800');assert.equal(await p.locator('#rMonthly').locator('..').locator('.t').textContent(),real?'Realistic: Weekly × 4.33':'Average: Yearly ÷ 12');};
  await check(true);await p.reload();await check(true);
  await p.evaluate(()=>__hourlyTest.setAdv(true));await p.locator('#fwdMRadios [data-val="avg"]').click();await check(false);
  await p.locator('#fwdMRadios [data-val="real"]').click();await check(true);
  await p.locator('#rate').fill('1500');await check(true);await reverse(p);await p.locator('#tab1').click();await check(true);
  await p.locator('#btnReset').click();await frames(p);assert.equal(await p.locator('#rMonthly').locator('..').locator('.t').textContent(),'Average: Yearly ÷ 12');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
});
for(const mode of ['fwd','rev'])test(`Stage B fractional ${mode} copied summary and actual toolkit handoff agree`,async p=>{
  await setup(p,{mode});const s=await snapshot(p,mode);
  await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:text=>{window.__stageBCopy=text;return Promise.resolve()}}}));
  await p.locator('#btnCopy').click();const text=await p.evaluate(()=>window.__stageBCopy);
  for(const [name,amount]of [['Daily',s.d.gd],['Weekly',s.d.gw],['Monthly',s.d.gm],['Yearly',s.d.gy]])assert.ok(text.includes(`Gross ${name}: ${money(amount)}`));
  assert.ok(text.includes('Net Yearly: '+money(s.d.ny)));
  if(mode==='fwd')assert.ok(text.includes('Actual Yearly Income: '+money(s.d.netYr)));
  await Promise.all([p.waitForURL(u=>u.pathname.endsWith('/platform-fee-calculator.html')),p.locator('#ctaBtn').click()]);
  await p.waitForFunction(()=>window.__pfcResult?.clientPays>0);
  const d=await p.evaluate(()=>({session:window.UFCToolkit.readSession(),input:Number(document.getElementById('amtGross').value.replace(/,/g,''))}));
  near(d.input,Math.round(s.g.year*100)/100);near(d.session.normalized.annualGross,Math.round(s.g.year*100)/100);
  near(d.session.assumptions.utilizationPct,69.5);
});
const configurations=[
 ['fwd-off-no-exp','fwd','off',0,70],['fwd-smart-no-exp','fwd','smart',0,70],
 ['fwd-off-exp','fwd','off',1820,70],['fwd-smart-exp','fwd','smart',1820,70],
 ['fwd-manual-exp','fwd','manual',1820,70],['fwd-fraction-smart-exp','fwd','smart',1820,69.5],
 ['rev-gross','rev','off',0,70],['rev-manual','rev','manual',0,70],['rev-smart','rev','smart',0,70],['rev-fraction','rev','smart',0,69.5],
];
for(const width of [390,1280])for(const [name,mode,tax,expenses,pct] of configurations)test(`Stage B native ${name} complete single-page PDF and PNG at ${width}px`,async p=>{
  await p.setViewportSize({width,height:900});await setup(p,{mode,tax,expenses,pct});await captureSetup(p);
  const s=await snapshot(p,mode);
  for(const kind of ['PDF','PNG']){
    const c=await download(p,kind,`stage-b-${name}-${width}`);
    assert.ok(c.text.includes(pct+'%'));assert.ok(c.text.includes(money(s.g.year)),'native report annual gross');
    if(name==='fwd-fraction-smart-exp'){if(kind==='PDF')assert.ok(c.text.includes('$914.82'),'reference effective usable hourly');else assert.ok(c.text.includes('$931.19'),'existing PNG after-tax hourly');assert.ok(c.text.includes('$1,220,736'));}
  }
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await p.screenshot({path:path.join(process.env.HRC_ARTIFACT_DIR,`stage-b-${name}-${width}-browser.png`),fullPage:true});
});
for(const mode of ['fwd','rev'])for(const tax of ['off','manual','smart'])test(`Stage B native percentage matrix ${mode} ${tax} PDF/PNG values`,async p=>{
  await captureSetup(p);
  for(const pct of percentages){
    await setup(p,{mode,tax,pct});const s=await snapshot(p,mode);
    for(const kind of ['PDF','PNG']){
      const c=await download(p,kind,`stage-b-matrix-${mode}-${tax}-${pct}`);
      assert.ok(c.text.includes(pct+'%'),'native exact billable percentage');
      for(const value of [s.d.gd,s.d.gw,s.d.gm,s.d.gy])assert.ok(c.text.includes(money(value)),`native gross ${money(value)}`);
      if(tax!=='off'){
        assert.ok(c.text.includes(money(s.d.ny)),'native after-tax yearly');
        if(mode==='fwd'||kind==='PDF')assert.ok(c.text.includes('$'+s.d.netHr.toFixed(2)),'native after-tax hourly');
      }
      if(mode==='fwd'){
        assert.ok(c.text.includes(money(s.d.netYr)),'native expenses-adjusted yearly');
        if(kind==='PDF')assert.ok(c.text.includes('$'+s.d.netHrEff),'native usable hourly');
      }
    }
  }
});

};
