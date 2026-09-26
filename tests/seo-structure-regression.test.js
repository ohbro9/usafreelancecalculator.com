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
