#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const SITE = 'https://usafreelancecalculator.com';

function read(relPath) {
  return fs.readFileSync(new URL(`../${relPath}`, `file://${__filename}`), 'utf8');
}

function normalizeText(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#38;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function tagText(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? normalizeText(match[1]) : '';
}

function parseAttrs(tag) {
  const attrs = Object.create(null);
  const attrRe = /([:\w-]+)\s*=\s*(["'])(.*?)\2/g;
  let match;
  while ((match = attrRe.exec(tag))) attrs[match[1].toLowerCase()] = match[3];
  return attrs;
}

function metaContent(html, name) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = parseAttrs(match[0]);
    if ((attrs.name || '').toLowerCase() === name.toLowerCase()) return normalizeText(attrs.content || '');
  }
  return '';
}

function canonicalHrefs(html) {
  const hrefs = [];
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = parseAttrs(match[0]);
    const relTokens = (attrs.rel || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (relTokens.includes('canonical')) hrefs.push((attrs.href || '').trim());
  }
  return hrefs;
}

const pageSpecs = [
  {
    key: 'home',
    path: 'index.html',
    canonical: `${SITE}/`,
    title: 'Freelance Calculator for US Freelancers | 5 Connected Tools',
    h1: '5 Connected Freelance Calculators for Rates, Fees, Taxes, Goals & Budgeting',
  },
  {
    key: 'budget',
    path: 'budget-planner.html',
    canonical: `${SITE}/budget-planner.html`,
    title: 'Freelance Budget Calculator for Irregular Income | Free Tool',
    h1: 'Freelance Budget Calculator',
  },
  {
    key: 'hourly',
    path: 'hourly-rate-calculator.html',
    canonical: `${SITE}/hourly-rate-calculator.html`,
    title: 'Freelance Hourly Rate Calculator | Calculate What to Charge',
    h1: 'Freelance Hourly Rate Calculator',
  },
  {
    key: 'platform',
    path: 'platform-fee-calculator.html',
    canonical: `${SITE}/platform-fee-calculator.html`,
    title: 'Freelance Platform Fee Calculator | See What You Keep',
    h1: 'Freelance Platform Fee Calculator',
  },
  {
    key: 'tax',
    path: 'tax-estimator.html',
    canonical: `${SITE}/tax-estimator.html`,
    title: 'Freelance Tax Calculator 2026 | Estimate Taxes & Take-Home',
    h1: 'Freelance Tax Calculator for US Freelancers',
  },
  {
    key: 'income',
    path: 'income-goal-planner.html',
    canonical: `${SITE}/income-goal-planner.html`,
    title: 'Freelance Income Goal Calculator | Find Your Required Rate',
    h1: 'Freelance Income Goal Calculator',
  },
];

const pages = new Map(pageSpecs.map(spec => [spec.key, { spec, html: read(spec.path) }]));
const failures = [];
function check(label, fn) {
  try {
    fn();
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
  }
}

const descriptions = [];
for (const { spec, html } of pages.values()) {
  check(`${spec.key} title`, () => assert.equal(tagText(html, 'title'), spec.title));
  check(`${spec.key} h1`, () => assert.equal(tagText(html, 'h1'), spec.h1));
  check(`${spec.key} canonical`, () => assert.deepEqual(canonicalHrefs(html), [spec.canonical]));
  check(`${spec.key} description`, () => {
    const description = metaContent(html, 'description');
    assert.ok(description.length > 0, `${spec.path} has a non-empty meta description`);
    descriptions.push(description);
  });
}

check('core descriptions are page-specific', () => {
  assert.equal(descriptions.length, pageSpecs.length);
  assert.equal(new Set(descriptions).size, descriptions.length);
});

check('home and hourly H1 are distinct', () => {
  assert.notEqual(tagText(pages.get('home').html, 'h1'), tagText(pages.get('hourly').html, 'h1'));
});


const homeHtml = pages.get('home').html;
check('home description owns five-tool hub intent', () => {
  const description = metaContent(homeHtml, 'description');
  assert.match(description, /5\s+connected/i);
  assert.match(description, /US\s+freelancers/i);
});
check('home includes all five calculator links', () => {
  for (const href of [
    'hourly-rate-calculator.html',
    'platform-fee-calculator.html',
    'tax-estimator.html',
    'income-goal-planner.html',
    'budget-planner.html',
  ]) {
    assert.match(homeHtml, new RegExp(`href=["']${href.replace('.', '\\.')}(?:[?#][^"']*)?["']`, 'i'));
  }
});
check('home supporting heading: choose calculator', () => {
  assert.match(homeHtml, /<h2\b[^>]*>[^<]*Choose the Right Calculator[^<]*<\/h2>/i);
});
check('home supporting heading: connected workflow', () => {
  assert.match(homeHtml, /<h2\b[^>]*>[^<]*How the 5 Tools Work Together[^<]*<\/h2>/i);
});
check('home supporting heading: goal entry points', () => {
  assert.match(homeHtml, /<h2\b[^>]*>[^<]*Start With Your Goal[^<]*<\/h2>/i);
});
check('home does not duplicate hourly SEO guide', () => {
  assert.ok(!/How to Calculate Your Freelance Hourly Rate/i.test(homeHtml));
});

const hourlyHtml = pages.get('hourly').html;
check('hourly description owns rate intent', () => {
  const description = metaContent(hourlyHtml, 'description');
  assert.match(description, /freelance\s+hourly\s+rate/i);
  assert.match(description, /billable|charge|rate/i);
});
check('hourly supporting heading: how to calculate', () => {
  assert.match(hourlyHtml, /<h2\b[^>]*>[^<]*How to Calculate Your Freelance Hourly Rate[^<]*<\/h2>/i);
});
check('hourly supporting heading: formula or methodology', () => {
  assert.match(hourlyHtml, /<h2\b[^>]*>[^<]*(?:Formula|Methodology)[^<]*<\/h2>/i);
});
check('hourly supporting heading: billable hours', () => {
  assert.match(hourlyHtml, /<h2\b[^>]*>[^<]*Billable(?:\s+vs\.?\s+Non-Billable)? Hours[^<]*<\/h2>/i);
});
check('hourly supporting heading: time off expenses taxes', () => {
  assert.match(hourlyHtml, /<h2\b[^>]*>[^<]*(?:Time Off|Expenses|Taxes)[^<]*<\/h2>/i);
});
check('hourly supporting heading: worked example', () => {
  assert.match(hourlyHtml, /<h2\b[^>]*>[^<]*Worked Example[^<]*<\/h2>/i);
});
check('hourly supporting heading: FAQ', () => {
  assert.match(hourlyHtml, /<h2\b[^>]*>[^<]*FAQ[^<]*<\/h2>/i);
});
check('hourly supporting heading: related tools', () => {
  assert.match(hourlyHtml, /<h2\b[^>]*>[^<]*Related (?:Freelance )?(?:Tools|Calculators)[^<]*<\/h2>/i);
});
check('hourly contextual link to Platform Fee Calculator', () => {
  assert.match(hourlyHtml, /href=["']platform-fee-calculator\.html["'][^>]*>[^<]*(?:Platform|Fee)[^<]*<\/a>/i);
});
check('hourly contextual link to Tax Estimator', () => {
  assert.match(hourlyHtml, /href=["']tax-estimator\.html["'][^>]*>[^<]*Tax[^<]*<\/a>/i);
});


check('hourly source excludes hidden legacy home shell', () => {
  assert.ok(!/<section\s+class=["']site-home["']/i.test(hourlyHtml), 'hidden legacy Home section must not remain in Hourly source');
  assert.ok(!/<div\s+class=["']home-calc-lead["']/i.test(hourlyHtml), 'hidden legacy Home-to-Hourly transition block must not remain');
  assert.ok(!/From this point onward, the page shifts from toolkit hub/i.test(hourlyHtml), 'implementation-style transition copy must not remain in semantic source');
});

const budgetHtml = pages.get('budget').html;
check('budget description owns irregular-income budgeting intent', () => {
  const description = metaContent(budgetHtml, 'description');
  assert.match(description, /irregular\s+(?:freelance\s+)?income/i);
  assert.match(description, /budget/i);
});
check('budget supporting heading: how it works', () => {
  assert.match(budgetHtml, /<h2\b[^>]*>[^<]*How (?:the )?Freelance Budget Calculator Works[^<]*<\/h2>/i);
});
check('budget supporting heading: irregular-income example', () => {
  assert.match(budgetHtml, /<h2\b[^>]*>[^<]*Irregular-Income (?:Worked )?Example[^<]*<\/h2>/i);
});
check('budget supporting heading: tax reserve', () => {
  assert.match(budgetHtml, /<h2\b[^>]*>[^<]*Tax Reserve[^<]*<\/h2>/i);
});
check('budget supporting heading: runway or savings', () => {
  assert.match(budgetHtml, /<h2\b[^>]*>[^<]*(?:Runway|Savings)[^<]*<\/h2>/i);
});
check('budget supporting heading: FAQ', () => {
  assert.match(budgetHtml, /<h2\b[^>]*>[^<]*FAQ[^<]*<\/h2>/i);
});
check('budget supporting heading: related tools', () => {
  assert.match(budgetHtml, /<h2\b[^>]*>[^<]*Related (?:Freelance )?(?:Tools|Calculators|Guides)[^<]*<\/h2>/i);
});
check('budget contextual link to Hourly Rate Calculator', () => {
  assert.match(budgetHtml, /href=["']hourly-rate-calculator\.html["'][^>]*>[^<]*(?:Hourly|Rate)[^<]*<\/a>/i);
});
check('budget contextual link to Tax Estimator', () => {
  assert.match(budgetHtml, /href=["']tax-estimator\.html["'][^>]*>[^<]*(?:Tax|Estimated)[^<]*<\/a>/i);
});

const platformHtml = pages.get('platform').html;
check('platform removes stale universal Upwork claim', () => {
  assert.ok(
    !platformHtml.toLowerCase().includes('upwork now charges a flat 10% fee on all marketplace contracts'),
    'platform page must not present Upwork as a universal flat 10% fee'
  );
});
check('platform labels quick rates as illustrative presets', () => {
  assert.match(platformHtml, /preset rates are illustrative starting points/i);
});
check('platform directs users to their actual account or contract fee', () => {
  assert.match(platformHtml, /actual account or contract fee may differ/i);
  assert.match(platformHtml, /use the fee shown in your account/i);
  assert.match(platformHtml, /Custom/i);
});
check('platform shows review date', () => {
  assert.match(platformHtml, /Last reviewed:\s*(?:<[^>]+>\s*)*September 26, 2026/i);
});
check('platform links official Upwork source', () => {
  assert.ok(platformHtml.includes('https://support.upwork.com/hc/en-us/articles/211062538-Learn-about-the-Freelancer-Service-Fee'));
});
check('platform links official Fiverr source', () => {
  assert.ok(platformHtml.includes('https://help.fiverr.com/hc/en-us/articles/9234443621137-Your-earnings-page'));
});
check('platform links official Freelancer.com source', () => {
  assert.ok(platformHtml.includes('https://www.freelancer.com/feesandcharges'));
});
check('platform links official Toptal source', () => {
  assert.ok(platformHtml.includes('https://www.toptal.com/freelance-jobs/faq'));
});
check('platform links official Guru source', () => {
  assert.ok(platformHtml.includes('https://www.guru.com/help/freelancer/about-guru-freelancer/fees/job-fee'));
});
check('platform links official PeoplePerHour source', () => {
  assert.ok(platformHtml.includes('https://support.peopleperhour.com/hc/en-us/articles/205218337-Freelancer-commission-fees'));
});

check('platform description owns fee take-home intent', () => {
  const description = metaContent(platformHtml, 'description');
  assert.match(description, /platform\s+fee/i);
  assert.match(description, /keep|take-home|client/i);
});
check('platform supporting heading: how it works', () => {
  assert.match(platformHtml, /<h2\b[^>]*>[^<]*How (?:the )?Freelance Platform Fee Calculator Works[^<]*<\/h2>/i);
});
check('platform supporting heading: worked example', () => {
  assert.match(platformHtml, /<h2\b[^>]*>[^<]*Platform Fee Worked Example[^<]*<\/h2>/i);
});
check('platform supporting heading: fee differences', () => {
  assert.match(platformHtml, /<h2\b[^>]*>[^<]*(?:Why Fees Differ|Actual Fees May Differ)[^<]*<\/h2>/i);
});
check('platform supporting heading: assumptions and sources', () => {
  assert.match(platformHtml, /<h2\b[^>]*>[^<]*Assumptions (?:&|and) Official Sources[^<]*<\/h2>/i);
});
check('platform supporting heading: FAQ', () => {
  assert.match(platformHtml, /<h2\b[^>]*>[^<]*Platform Fee FAQ[^<]*<\/h2>/i);
});
check('platform supports both forward and reverse planning intents', () => {
  assert.match(platformHtml, /Client Pays/i);
  assert.match(platformHtml, /I Want to Keep/i);
});

const taxHtml = pages.get('tax').html;
check('tax description owns 2026 freelancer tax intent', () => {
  const description = metaContent(taxHtml, 'description');
  assert.match(description, /2026/);
  assert.match(description, /self-employment/i);
  assert.match(description, /quarterly/i);
  assert.match(description, /take-home/i);
});
check('tax supporting heading: how it works', () => {
  assert.match(taxHtml, /<h2\b[^>]*>[^<]*How (?:the )?Freelance Tax Calculator Works[^<]*<\/h2>/i);
});
check('tax supporting heading: self-employment tax', () => {
  assert.match(taxHtml, /<h2\b[^>]*>[^<]*Self-Employment Tax[^<]*<\/h2>/i);
});
check('tax supporting heading: quarterly estimates', () => {
  assert.match(taxHtml, /<h2\b[^>]*>[^<]*Quarterly Estimated Taxes[^<]*<\/h2>/i);
});
check('tax supporting heading: worked example', () => {
  assert.match(taxHtml, /<h2\b[^>]*>[^<]*Freelance Tax Worked Example[^<]*<\/h2>/i);
});
check('tax supporting heading: methodology and IRS sources', () => {
  assert.match(taxHtml, /<h2\b[^>]*>[^<]*Methodology (?:&|and) IRS Sources[^<]*<\/h2>/i);
});
check('tax shows reviewed date and estimate disclaimer', () => {
  assert.match(taxHtml, /Last reviewed:\s*(?:<[^>]+>\s*)*September 26, 2026/i);
  assert.match(taxHtml, /estimate[^.]{0,120}not tax advice|not tax advice[^.]{0,120}estimate/i);
});
check('tax links current IRS sources', () => {
  assert.ok(taxHtml.includes('https://www.irs.gov/publications/p505'));
  assert.ok(taxHtml.includes('https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center'));
  assert.ok(taxHtml.includes('https://www.irs.gov/taxtopics/tc554'));
});
check('tax supporting heading: FAQ', () => {
  assert.match(taxHtml, /<h2\b[^>]*>[^<]*Freelance Tax FAQ[^<]*<\/h2>/i);
});

const appHtml = read('app/index.html');
check('app canonical', () => assert.deepEqual(canonicalHrefs(appHtml), [`${SITE}/app/`]));
check('app title', () => {
  const title = tagText(appHtml, 'title');
  assert.ok(title.length > 0, 'app page has a title');
  assert.match(title, /USA Freelance Calculator/i);
  assert.match(title, /Android|APK/i);
});
check('app h1', () => {
  const h1 = tagText(appHtml, 'h1');
  assert.ok(h1.length > 0, 'app page has an H1');
  assert.match(h1, /USA Freelance Calculator/i);
  assert.match(h1, /Android|APK/i);
});
check('app description', () => assert.ok(metaContent(appHtml, 'description').length > 0));

const sitemap = read('sitemap.xml');
check('sitemap includes app page', () => {
  assert.match(sitemap, /<loc>\s*https:\/\/usafreelancecalculator\.com\/app\/\s*<\/loc>/i);
});

const notFound = read('404.html');
check('404 has root-safe home link', () => assert.match(notFound, /href\s*=\s*["']\/["']/i));
check('404 has root-safe platform link', () => assert.match(notFound, /href\s*=\s*["']\/platform-fee-calculator\.html["']/i));



const incomeHtml = pages.get('income').html;
check('income description owns take-home goal intent', () => {
  const description = metaContent(incomeHtml, 'description');
  assert.match(description, /take-home|income goal/i);
  assert.match(description, /gross|revenue|required/i);
});
check('income supporting heading: take-home vs gross', () => {
  assert.match(incomeHtml, /<h2\b[^>]*>[^<]*Take-Home (?:vs\.?|and) Gross Revenue[^<]*<\/h2>/i);
});
check('income supporting heading: taxes fees expenses', () => {
  assert.match(incomeHtml, /<h2\b[^>]*>[^<]*(?:Taxes|Fees|Expenses)[^<]*<\/h2>/i);
});
check('income supporting heading: worked example', () => {
  assert.match(incomeHtml, /<h2\b[^>]*>[^<]*Income Goal Worked Example[^<]*<\/h2>/i);
});
check('income supporting heading: methodology', () => {
  assert.match(incomeHtml, /<h2\b[^>]*>[^<]*Income Goal Methodology[^<]*<\/h2>/i);
});
check('income supporting heading: FAQ', () => {
  assert.match(incomeHtml, /<h2\b[^>]*>[^<]*Income Goal FAQ[^<]*<\/h2>/i);
});
check('income links to related calculators', () => {
  for (const href of ['hourly-rate-calculator.html','platform-fee-calculator.html','tax-estimator.html','budget-planner.html']) {
    assert.match(incomeHtml, new RegExp(`href=["']${href.replace('.', '\\.')}(?:[?#][^"']*)?["']`, 'i'));
  }
});

function propertyMetaContent(html, property) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = parseAttrs(match[0]);
    if ((attrs.property || '').toLowerCase() === property.toLowerCase()) return normalizeText(attrs.content || '');
  }
  return '';
}

const socialSpecs = [
  ...pageSpecs.map(spec => ({ key: spec.key, html: pages.get(spec.key).html, canonical: spec.canonical, title: spec.title })),
  { key: 'app', html: appHtml, canonical: `${SITE}/app/`, title: tagText(appHtml, 'title') },
];
for (const item of socialSpecs) {
  check(`${item.key} social metadata`, () => {
    assert.equal(propertyMetaContent(item.html, 'og:title'), item.title);
    assert.ok(propertyMetaContent(item.html, 'og:description').length > 0, 'og:description is present');
    assert.equal(propertyMetaContent(item.html, 'og:url'), item.canonical);
    assert.ok(metaContent(item.html, 'twitter:card').length > 0, 'twitter:card is present');
    assert.equal(metaContent(item.html, 'twitter:title'), item.title);
    assert.ok(metaContent(item.html, 'twitter:description').length > 0, 'twitter:description is present');
  });
}

check('app description is Android download-specific', () => {
  const description = metaContent(appHtml, 'description');
  assert.match(description, /Android/i);
  assert.match(description, /download|APK/i);
});
check('app has supportable Android software schema', () => {
  assert.match(appHtml, /"@type"\s*:\s*"SoftwareApplication"/i);
  assert.match(appHtml, /"operatingSystem"\s*:\s*"Android"/i);
  assert.match(appHtml, /"softwareVersion"\s*:\s*"1\.0\.1"/i);
});

check('sitemap contains every canonical core URL', () => {
  const expected = [...pageSpecs.map(spec => spec.canonical), `${SITE}/app/`];
  for (const url of expected) {
    assert.ok(sitemap.includes(`<loc>${url}</loc>`), `sitemap contains ${url}`);
  }
});

const forbiddenVisitorCopy = [
  'homepage now stays tighter',
  'without turning the page into a cluttered social block',
  'without adding a messy social strip',
  'so the main tool keeps its premium flow',
  'Keep the end-of-page UI premium and compact',
];
for (const { spec, html } of pages.values()) {
  for (const phrase of forbiddenVisitorCopy) {
    check(`${spec.key} omits internal copy: ${phrase}`, () => {
      assert.ok(!html.toLowerCase().includes(phrase.toLowerCase()), `${spec.path} must not expose internal implementation commentary`);
    });
  }
}

if (failures.length) {
  console.error('SEO structure regression tests: FAIL');
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  process.exitCode = 1;
} else {
  console.log('SEO structure regression tests: PASS');
}
