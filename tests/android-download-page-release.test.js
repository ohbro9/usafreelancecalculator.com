#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');

const appPage = fs.readFileSync(new URL('../app/index.html', `file://${__filename}`), 'utf8');
const updateConfig = JSON.parse(fs.readFileSync(new URL('../app/update-config.json', `file://${__filename}`), 'utf8'));
const apk = fs.readFileSync(new URL('../downloads/usafreelancecalculator-installable.apk', `file://${__filename}`));
const expectedSha256 = '6a78d56301fde94f253f93fd4b695a6c19935c3ecde4b79ed397ad2a94ef0408';

assert.equal(updateConfig.latestVersionName, '1.0.1');
assert.equal(updateConfig.latestVersionCode, 2);
assert.equal(updateConfig.publishedAt, '2026-09-24');
assert.equal(apk.byteLength, 5_516_089);
assert.equal(crypto.createHash('sha256').update(apk).digest('hex'), expectedSha256);

for (const currentValue of [
  '1.0.1 (Build 2)',
  '5.52 MB',
  'September 24, 2026',
  expectedSha256,
  'href="/downloads/usafreelancecalculator-installable.apk"',
]) {
  assert.ok(appPage.includes(currentValue), `app page displays ${currentValue}`);
}

for (const staleValue of [
  '1.0 (Build 1)',
  '4.90 MB',
  'April 3, 2026',
  '4df6412d',
]) {
  assert.ok(!appPage.includes(staleValue), `app page omits stale value ${staleValue}`);
}

console.log('Android download page release details: PASS');
