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
    if ((attrs.name || '').toLowerCase() === name.toLowerCase()) return (attrs.content || '').trim();
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
