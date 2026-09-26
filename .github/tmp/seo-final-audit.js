const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices } = require('playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const SITE = 'https://usafreelancecalculator.com';
const core = [
  ['home','/','index.html','Freelance Calculator for US Freelancers | 5 Connected Tools','5 Connected Freelance Calculators for Rates, Fees, Taxes, Goals & Budgeting',`${SITE}/`],
  ['hourly','/hourly-rate-calculator.html','hourly-rate-calculator.html','Freelance Hourly Rate Calculator | Calculate What to Charge','Freelance Hourly Rate Calculator',`${SITE}/hourly-rate-calculator.html`],
  ['platform','/platform-fee-calculator.html','platform-fee-calculator.html','Freelance Platform Fee Calculator | See What You Keep','Freelance Platform Fee Calculator',`${SITE}/platform-fee-calculator.html`],
  ['tax','/tax-estimator.html','tax-estimator.html','Freelance Tax Calculator 2026 | Estimate Taxes & Take-Home','Freelance Tax Calculator for US Freelancers',`${SITE}/tax-estimator.html`],
  ['income','/income-goal-planner.html','income-goal-planner.html','Freelance Income Goal Calculator | Find Your Required Rate','Freelance Income Goal Calculator',`${SITE}/income-goal-planner.html`],
  ['budget','/budget-planner.html','budget-planner.html','Freelance Budget Calculator for Irregular Income | Free Tool','Freelance Budget Calculator',`${SITE}/budget-planner.html`],
  ['app','/app/','app/index.html','USA Freelance Calculator Android App','USA Freelance Calculator Android App',`${SITE}/app/`],
];

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/g)) out[m[1].toLowerCase()] = m[3];
  return out;
}
function textOf(html, tag) {
  const m = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'));
  return m ? m[1].replace(/<[^>]+>/g,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim() : '';
}
function meta(html, key, prop=false) {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    if ((a[prop?'property':'name']||'').toLowerCase() === key.toLowerCase()) return (a.content||'').replace(/&amp;/gi,'&').trim();
  }
  return '';
}
function canonicals(html) {
  const out=[];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const a=attrs(m[0]);
    if ((a.rel||'').toLowerCase().split(/\s+/).includes('canonical')) out.push(a.href||'');
  }
  return out;
}
function resolveLocal(fromFile, href) {
  if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:|https?:\/\/)/i.test(href)) return null;
  const clean=href.split('#')[0].split('?')[0];
  if (!clean) return null;
  if (clean === '/') return 'index.html';
  if (clean === '/app/' || clean === 'app/') return 'app/index.html';
  if (clean.startsWith('/')) return clean.slice(1);
  const baseDir=path.posix.dirname(fromFile);
  return path.posix.normalize(path.posix.join(baseDir === '.' ? '' : baseDir, clean));
}

function staticAudit() {
  const warnings=[];
  const descriptions=[];
  for (const [key,,file,title,h1,canonical] of core) {
    const html=fs.readFileSync(file,'utf8');
    assert.equal((html.match(/<title\b/gi)||[]).length,1,`${key}: exactly one title`);
    assert.equal(textOf(html,'title'),title,`${key}: title`);
    assert.equal((html.match(/<h1\b/gi)||[]).length,1,`${key}: exactly one source H1`);
    assert.equal(textOf(html,'h1'),h1,`${key}: H1`);
    assert.deepEqual(canonicals(html),[canonical],`${key}: self canonical`);
    const desc=meta(html,'description');
    assert.ok(desc.length >= 70 && desc.length <= 210,`${key}: useful meta description length (${desc.length})`);
    descriptions.push(desc);
    assert.ok(!/noindex/i.test(meta(html,'robots')),`${key}: not noindex`);
    assert.equal(meta(html,'og:url',true),canonical,`${key}: og:url canonical`);
    assert.equal(meta(html,'og:title',true),title,`${key}: og:title aligns`);
    assert.equal(meta(html,'twitter:title'),title,`${key}: twitter:title aligns`);
    for (const sm of html.matchAll(/<script\b([^>]*)type=["']application\/ld\+json["']([^>]*)>([\s\S]*?)<\/script>/gi)) {
      JSON.parse(sm[3]);
    }
    for (const aTag of html.matchAll(/<a\b[^>]*>/gi)) {
      const a=attrs(aTag[0]);
      const local=resolveLocal(file,a.href);
      if (!local) continue;
      assert.ok(fs.existsSync(local),`${key}: internal link exists: ${a.href} -> ${local}`);
    }
    assert.ok(!html.includes('http://usafreelancecalculator.com'),`${key}: no insecure internal absolute URL`);
    const lower=html.toLowerCase();
    for (const phrase of ['above the fold','keep this section compact','homepage now stays tighter','without turning the page into a cluttered social block','without adding a messy social strip','so the main tool keeps its premium flow']) {
      if (lower.includes(phrase.toLowerCase())) warnings.push(`${key}: internal-sounding copy remains: ${phrase}`);
    }
    if (key === 'hourly' && /from this point onward, the page shifts/i.test(html)) warnings.push('hourly: hidden source still contains implementation-style transition copy');
  }
  assert.equal(new Set(descriptions).size,descriptions.length,'core meta descriptions unique');

  const sitemap=fs.readFileSync('sitemap.xml','utf8');
  for (const [, , , , , canonical] of core) assert.ok(sitemap.includes(`<loc>${canonical}</loc>`),`sitemap contains ${canonical}`);
  const robots=fs.readFileSync('robots.txt','utf8');
  assert.match(robots,/User-agent:\s*\*/i);
  assert.match(robots,/Allow:\s*\//i);
  assert.ok(robots.includes('Sitemap: https://usafreelancecalculator.com/sitemap.xml'),'robots sitemap');

  console.log('STATIC AUDIT PASS');
  if (warnings.length) warnings.forEach(w=>console.log(`AUDIT WARNING: ${w}`));
  else console.log('AUDIT WARNING: none');
}

async function noDuplicateIds(page,label) {
  const dups=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);return [...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];});
  assert.deepEqual(dups,[],`${label}: no duplicate ids`);
}
async function noOverflow(page,label) {
  const m=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
  assert.ok(m.sw <= m.cw + 2,`${label}: horizontal overflow ${m.sw}>${m.cw}`);
}
async function setValue(page,id,value) {
  await page.locator(`#${id}`).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},String(value));
}
async function genericPage(page,key,url,title,h1,canonical) {
  const errors=[];
  const onErr=e=>errors.push(String(e));
  page.on('pageerror',onErr);
  const resp=await page.goto(`${BASE}${url}`,{waitUntil:'domcontentloaded'});
  assert.ok(resp && resp.status() < 400,`${key}: HTTP ${resp && resp.status()}`);
  await page.waitForTimeout(350);
  assert.equal(await page.title(),title,`${key}: browser title`);
  assert.equal(await page.locator('h1:visible').count(),1,`${key}: one visible h1`);
  assert.equal((await page.locator('h1:visible').innerText()).replace(/\s+/g,' ').trim(),h1,`${key}: visible h1`);
  assert.equal(await page.locator('link[rel="canonical"]').count(),1,`${key}: one canonical`);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),canonical,`${key}: browser canonical`);
  await noDuplicateIds(page,key);
  await noOverflow(page,key);
  assert.deepEqual(errors,[],`${key}: no page JS exceptions`);
  page.off('pageerror',onErr);
}

async function hourlyFunctional(page) {
  await page.goto(`${BASE}/hourly-rate-calculator.html`,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(300);
  await setValue(page,'rate','50.01'); await setValue(page,'hpd','8'); await setValue(page,'dpw','5'); await setValue(page,'wpy','48'); await setValue(page,'billable','70');
  await page.waitForTimeout(150);
  const gross=await page.evaluate(()=>window.__gross ? {year:window.__gross.year,month:window.__gross.month}:null);
  assert.ok(gross,'hourly: __gross exposed');
  assert.equal(gross.year,67213.44,'hourly forward yearly cents');
  assert.equal(gross.month,5601.12,'hourly forward monthly cents');
  await page.locator('#tab2').click();
  await setValue(page,'target','80000'); await setValue(page,'hpdR','8'); await setValue(page,'dpwR','5'); await setValue(page,'wpyR','48'); await setValue(page,'billableRTxt','70');
  await page.waitForTimeout(180);
  assert.equal((await page.locator('#revBlueRate').innerText()).trim(),'$59.53/hr','hourly reverse rounded-up rate');
  assert.match((await page.locator('#rrYearly').innerText()).replace(/,/g,''),/\$?80008(?:\.32)?/,'hourly reverse yearly reflects quoted rate');
  console.log('FUNCTION PASS hourly forward+reverse');
}

async function platformFunctional(page) {
  await page.goto(`${BASE}/platform-fee-calculator.html`,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(250);
  const gross=page.locator('#amtGross');
  await gross.click(); await gross.press('ControlOrMeta+A'); await gross.pressSequentially('1000.55'); await page.waitForTimeout(120);
  let body=(await page.locator('body').innerText()).replace(/\s+/g,' ');
  assert.ok(body.includes('$900.49'),'platform forward $1,000.55 -> $900.49 visible');
  await page.locator('#tabNet').click();
  const net=page.locator('#amtNet'); await net.click(); await net.press('ControlOrMeta+A'); await net.pressSequentially('1000.55'); await page.waitForTimeout(120);
  body=(await page.locator('body').innerText()).replace(/\s+/g,' ');
  assert.ok(body.includes('$1,111.72'),'platform reverse $1,000.55 -> $1,111.72 visible');
  console.log('FUNCTION PASS platform forward+reverse');
}

async function exportPresence(page,url,key) {
  await page.goto(`${BASE}${url}`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(220);
  const body=(await page.locator('body').innerText()).toLowerCase();
  assert.ok(body.includes('pdf'),`${key}: PDF action/content present`);
  assert.ok(body.includes('png') || body.includes('image'),`${key}: PNG/image action/content present`);
  assert.ok(body.includes('share') || body.includes('copy link'),`${key}: share/copy capability present`);
}

async function browserAudit() {
  const browser=await chromium.launch({headless:true});
  const profiles=[['desktop',{viewport:{width:1280,height:900}}],['Pixel 7',{...devices['Pixel 7']}]];
  try {
    for (const [profile,options] of profiles) {
      const ctx=await browser.newContext(options);
      const page=await ctx.newPage();
      for (const [key,url,,title,h1,canonical] of core) await genericPage(page,`${profile}/${key}`,url,title,h1,canonical);
      for (const [key,url] of [['hourly','/hourly-rate-calculator.html'],['platform','/platform-fee-calculator.html'],['tax','/tax-estimator.html'],['income','/income-goal-planner.html'],['budget','/budget-planner.html']]) await exportPresence(page,url,`${profile}/${key}`);
      await hourlyFunctional(page);
      await platformFunctional(page);
      await ctx.close();
      console.log(`BROWSER AUDIT PASS ${profile}`);
    }
  } finally { await browser.close(); }
}

(async()=>{staticAudit();await browserAudit();console.log('FINAL SEO AUDIT SCRIPT PASS');})().catch(e=>{console.error(e);process.exit(1);});
