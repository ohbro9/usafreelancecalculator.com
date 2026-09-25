#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const rootPages = [
  'index.html',
  'hourly-rate-calculator.html',
  'platform-fee-calculator.html',
  'tax-estimator.html',
  'income-goal-planner.html',
  'budget-planner.html',
  'about.html', 'privacy.html', 'terms.html', 'contact.html'
];
const pages = [...rootPages, 'app/index.html'];

const icon = fs.readFileSync(path.join(root, 'assets/icon.svg'), 'utf8');
assert.match(icon, /#0A1728/i, 'brand icon contains deep navy');
assert.match(icon, /#FF7A00/i, 'brand icon contains focal orange');
assert.match(icon, /#F8FBFF/i, 'brand icon contains near-white');
assert.doesNotMatch(icon, /linearGradient/i, 'brand icon has no linear gradients');
assert.doesNotMatch(icon, /radialGradient/i, 'brand icon has no radial gradients');

for (const file of pages) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  assert.match(html, /rel=["']canonical["']/i, `${file}: canonical preserved`);
  assert.match(html, /<meta[^>]+name=["']description["']/i, `${file}: description preserved`);
  assert.match(html, /data-site-shell/i, `${file}: shared shell markup present`);
  assert.match(html, /site-shell\.css/i, `${file}: shared shell CSS present`);
  assert.match(html, /site-shell\.js/i, `${file}: shared shell JS present`);
}

const updateConfig = fs.readFileSync(path.join(root, 'app/update-config.json'), 'utf8');
assert.match(updateConfig, /"versionCode"\s*:\s*2/, 'release versionCode remains 2');
assert.match(updateConfig, /"versionName"\s*:\s*"1\.0\.1"/, 'release versionName remains 1.0.1');
console.log('site-shell structural tests: PASS');
