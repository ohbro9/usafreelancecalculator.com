const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { chromium, devices } = require('playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const SITE = 'https://usafreelancecalculator.com';
const pages = [
  ['home','/','index.html','Freelance Calculator for US Freelancers | 5 Connected Tools','5 Connected Freelance Calculators for Rates, Fees, Taxes, Goals & Budgeting',`${SITE}/`],
  ['hourly','/hourly-rate-calculator.html','hourly-rate-calculator.html','Freelance Hourly Rate Calculator | Calculate What to Charge','Freelance Hourly Rate Calculator',`${SITE}/hourly-rate-calculator.html`],
  ['platform','/platform-fee-calculator.html','platform-fee-calculator.html','Freelance Platform Fee Calculator | See What You Keep','Freelance Platform Fee Calculator',`${SITE}/platform-fee-calculator.html`],
  ['tax','/tax-estimator.html','tax-estimator.html','Freelance Tax Calculator 2026 | Estimate Taxes & Take-Home','Freelance Tax Calculator for US Freelancers',`${SITE}/tax-estimator.html`],
  ['income','/income-goal-planner.html','income-goal-planner.html','Freelance Income Goal Calculator | Find Your Required Rate','Freelance Income Goal Calculator',`${SITE}/income-goal-planner.html`],
  ['budget','/budget-planner.html','budget-planner.html','Freelance Budget Calculator for Irregular Income | Free Tool','Freelance Budget Calculator',`${SITE}/budget-planner.html`],
  ['app','/app/','app/index.html','USA Freelance Calculator Android App','USA Freelance Calculator Android App',`${SITE}/app/`],
];
const calculatorFiles = ['index.html','hourly-rate-calculator.html','platform-fee-calculator.html','tax-estimator.html','income-goal-planner.html','budget-planner.html'];

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/g)) out[m[1].toLowerCase()] = m[3];
  return out;
}
function semanticSource(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
}
function textOf(html, tag) {
  const m = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'));
  return m ? m[1].replace(/<[^>]+>/g,' ').replace(/&amp;/gi,'&').replace(/&#38;/g,'&').replace(/\s+/g,' ').trim() : '';
}
function meta(html, key, property=false) {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    if ((a[property ? 'property' : 'name'] || '').toLowerCase() === key.toLowerCase()) return (a.content || '').replace(/&amp;/gi,'&').trim();
  }
  return '';
}
function canonicals(html) {
  const out=[];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const a=attrs(m[0]);
    if ((a.rel||'').toLowerCase().split(/\s+/).includes('canonical')) out.push((a.href||'').trim());
  }
  return out;
}
function localFile(fromFile, href) {
  if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:|data:)/i.test(href)) return null;
  let clean = href;
  if (/^https?:\/\//i.test(clean)) {
    const u = new URL(clean);
    if (u.hostname !== 'usafreelancecalculator.com') return null;
    clean = u.pathname + u.search + u.hash;
  }
  clean = clean.split('#')[0].split('?')[0];
  if (!clean) return null;
  if (clean === '/') return 'index.html';
  if (clean === '/app/' || clean === 'app/') return 'app/index.html';
  if (clean.startsWith('/')) return clean.slice(1);
  const dir = path.posix.dirname(fromFile);
  return path.posix.normalize(path.posix.join(dir === '.' ? '' : dir, clean));
}
function sponsorLines(text) {
  return text.split(/\r?\n/).map(x=>x.trim()).filter(x=>/sponsor/i.test(x));
}
function staticAudit() {
  const descriptions=[];
  for (const [key,,file,title,h1,canonical] of pages) {
    const raw=fs.readFileSync(file,'utf8');
    const html=semanticSource(raw);
    assert.equal((html.match(/<title\b/gi)||[]).length,1,`${key}: one title`);
    assert.equal(textOf(html,'title'),title,`${key}: title`);
    assert.equal((html.match(/<h1\b/gi)||[]).length,1,`${key}: one semantic H1`);
    assert.equal(textOf(html,'h1'),h1,`${key}: H1`);
    assert.deepEqual(canonicals(html),[canonical],`${key}: self canonical`);
    const desc=meta(html,'description');
    assert.ok(desc.length >= 70 && desc.length <= 210,`${key}: useful meta description (${desc.length})`);
    descriptions.push(desc);
    assert.ok(!/noindex/i.test(meta(html,'robots')),`${key}: indexable`);
    assert.equal(meta(html,'og:url',true),canonical,`${key}: og:url`);
    assert.equal(meta(html,'og:title',true),title,`${key}: og:title`);
    assert.equal(meta(html,'twitter:title'),title,`${key}: twitter:title`);
    for (const sm of raw.matchAll(/<script\b([^>]*)type=["']application\/ld\+json["']([^>]*)>([\s\S]*?)<\/script>/gi)) JSON.parse(sm[3]);
    for (const tag of html.matchAll(/<a\b[^>]*>/gi)) {
      const a=attrs(tag[0]);
      const local=localFile(file,a.href);
      if (local) assert.ok(fs.existsSync(local),`${key}: internal target exists ${a.href} -> ${local}`);
    }
    assert.ok(!html.includes('http://usafreelancecalculator.com'),`${key}: no insecure internal absolute URL`);
  }
  assert.equal(new Set(descriptions).size,descriptions.length,'core descriptions unique');

  const sitemap=fs.readFileSync('sitemap.xml','utf8');
  for (const [,,,,,canonical] of pages) assert.ok(sitemap.includes(`<loc>${canonical}</loc>`),`sitemap includes ${canonical}`);
  const robots=fs.readFileSync('robots.txt','utf8');
  assert.match(robots,/User-agent:\s*\*/i);
  assert.match(robots,/Allow:\s*\//i);
  assert.ok(robots.includes('Sitemap: https://usafreelancecalculator.com/sitemap.xml'),'robots points to sitemap');
  assert.ok(fs.existsSync('downloads/usafreelancecalculator-installable.apk'),'APK path exists');

  for (const file of calculatorFiles) {
    const before=cp.execFileSync('git',['show',`origin/main:${file}`],{encoding:'utf8'});
    const after=fs.readFileSync(file,'utf8');
    assert.deepEqual(sponsorLines(after),sponsorLines(before),`${file}: sponsor-related source lines unchanged from main`);
  }
  console.log('STATIC PR-READINESS AUDIT PASS');
}

async function setValue(page,id,value) {
  await page.locator(`#${id}`).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},String(value));
}
async function genericPage(page,label,url,title,h1,canonical) {
  const errors=[]; const onErr=e=>errors.push(String(e)); page.on('pageerror',onErr);
  const r=await page.goto(`${BASE}${url}`,{waitUntil:'domcontentloaded'});
  assert.ok(r && r.status() < 400,`${label}: HTTP ${r && r.status()}`);
  await page.waitForTimeout(300);
  assert.equal(await page.title(),title,`${label}: title`);
  assert.equal(await page.locator('h1:visible').count(),1,`${label}: one visible H1`);
  assert.equal((await page.locator('h1:visible').innerText()).replace(/\s+/g,' ').trim(),h1,`${label}: H1`);
  assert.equal(await page.locator('link[rel="canonical"]').count(),1,`${label}: one canonical`);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),canonical,`${label}: canonical`);
  const robots=await page.locator('meta[name="robots"]').count() ? (await page.locator('meta[name="robots"]').getAttribute('content')||'') : '';
  assert.ok(!/noindex/i.test(robots),`${label}: no noindex`);
  const dups=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);return [...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];});
  assert.deepEqual(dups,[],`${label}: no duplicate IDs`);
  const ov=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
  assert.ok(ov.sw <= ov.cw + 2,`${label}: no horizontal overflow (${ov.sw}>${ov.cw})`);
  const jsonLd=await page.locator('script[type="application/ld+json"]').allTextContents();
  jsonLd.forEach(x=>JSON.parse(x));
  assert.deepEqual(errors,[],`${label}: no page JS exceptions`);
  page.off('pageerror',onErr);
}
async function verifyTheme(page,label) {
  if (!await page.locator('#dmBtn').count()) return;
  const before=await page.locator('body').evaluate(el=>el.classList.contains('dark'));
  await page.locator('#dmBtn').click(); await page.waitForTimeout(80);
  const after=await page.locator('body').evaluate(el=>el.classList.contains('dark'));
  assert.notEqual(after,before,`${label}: theme toggle works`);
}
async function exportPresence(page,url,label) {
  await page.goto(`${BASE}${url}`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(220);
  const body=(await page.locator('body').innerText()).toLowerCase();
  assert.ok(body.includes('pdf'),`${label}: PDF present`);
  assert.ok(body.includes('png') || body.includes('image'),`${label}: PNG/image present`);
  assert.ok(body.includes('share') || body.includes('copy link'),`${label}: share/copy present`);
  await verifyTheme(page,label);
}
async function hourlyAndHandoff(page) {
  await page.goto(`${BASE}/hourly-rate-calculator.html`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(250);
  await setValue(page,'rate','50.01'); await setValue(page,'hpd','8'); await setValue(page,'dpw','5'); await setValue(page,'wpy','48'); await setValue(page,'billable','70');
  await page.waitForTimeout(160);
  const gross=await page.evaluate(()=>window.__gross?{year:window.__gross.year,month:window.__gross.month}:null);
  assert.deepEqual(gross,{year:67213.44,month:5601.12},'Hourly forward cents');
  await page.locator('#ctaBtn').click();
  await page.waitForURL(/platform-fee-calculator\.html/,{timeout:5000}); await page.waitForTimeout(180);
  const imported=await page.locator('#amtGross').inputValue();
  assert.equal(Number(imported.replace(/,/g,'')),67213.44,'Hourly -> Platform handoff preserves cents');

  await page.goto(`${BASE}/hourly-rate-calculator.html`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(220);
  await page.locator('#tab2').click();
  await setValue(page,'target','80000'); await setValue(page,'hpdR','8'); await setValue(page,'dpwR','5'); await setValue(page,'wpyR','48'); await setValue(page,'billableRTxt','70');
  await page.waitForTimeout(180);
  assert.equal((await page.locator('#revBlueRate').innerText()).trim(),'$59.53/hr','Hourly reverse quote');
  console.log('FUNCTION PASS Hourly forward/reverse + handoff');
}
async function platformFunctional(page) {
  await page.goto(`${BASE}/platform-fee-calculator.html`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(220);
  const g=page.locator('#amtGross'); await g.click(); await g.press('ControlOrMeta+A'); await g.pressSequentially('1000.55'); await page.waitForTimeout(160);
  let result=await page.evaluate(()=>window.__pfcResult);
  assert.equal(result.clientPays,1000.55,'Platform forward client pays');
  assert.equal(result.youKeep,900.49,'Platform forward keep');
  await page.locator('#tabNet').click();
  const n=page.locator('#amtNet'); await n.click(); await n.press('ControlOrMeta+A'); await n.pressSequentially('1000.55'); await page.waitForTimeout(160);
  result=await page.evaluate(()=>window.__pfcResult);
  assert.equal(result.clientPays,1111.72,'Platform reverse charge');
  assert.equal(result.youKeep,1000.55,'Platform reverse keep');
  console.log('FUNCTION PASS Platform forward/reverse');
}
async function browserAudit() {
  const browser=await chromium.launch({headless:true});
  try {
    for (const [profile,options] of [['desktop',{viewport:{width:1280,height:900}}],['Pixel 7',{...devices['Pixel 7']}]] ) {
      const ctx=await browser.newContext(options); const page=await ctx.newPage();
      for (const [key,url,,title,h1,canonical] of pages) await genericPage(page,`${profile}/${key}`,url,title,h1,canonical);
      const r404=await page.goto(`${BASE}/404.html`,{waitUntil:'domcontentloaded'}); assert.ok(r404 && r404.status()<400,`${profile}/404 loads`);
      assert.equal(await page.locator('a[href="/"]').count()>0,true,`${profile}/404 root-safe Home link`);
      assert.equal(await page.locator('a[href="/platform-fee-calculator.html"]').count()>0,true,`${profile}/404 root-safe Platform link`);
      for (const [key,url] of [['hourly','/hourly-rate-calculator.html'],['platform','/platform-fee-calculator.html'],['tax','/tax-estimator.html'],['income','/income-goal-planner.html'],['budget','/budget-planner.html']]) await exportPresence(page,url,`${profile}/${key}`);
      await hourlyAndHandoff(page);
      await platformFunctional(page);
      await ctx.close(); console.log(`BROWSER PR-READINESS PASS ${profile}`);
    }
  } finally { await browser.close(); }
}

(async()=>{staticAudit();await browserAudit();console.log('SEO PR-READINESS SCRIPT PASS');})().catch(e=>{console.error(e);process.exit(1);});
