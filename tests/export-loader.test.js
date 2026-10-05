'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const loaderPath = path.join(root, 'assets/js/export-loader.js');

function browser() {
  assert.ok(fs.existsSync(loaderPath), 'export loader file must exist');
  const scripts = [];
  const window = {};
  const document = {
    createElement(tag) {
      assert.equal(tag, 'script');
      return { remove() {} };
    },
    head: { appendChild(script) { scripts.push(script); } }
  };
  vm.runInNewContext(fs.readFileSync(loaderPath, 'utf8'), { window, document, Promise });
  return { window, scripts };
}

test('export libraries load only on demand, in dependency order, and just once', async () => {
  const page = browser();
  assert.equal(page.scripts.length, 0);
  const first = page.window.ensureUsafcExportLibraries();
  const second = page.window.ensureUsafcExportLibraries();
  assert.equal(first, second);
  assert.equal(page.scripts.length, 1);
  assert.match(page.scripts[0].src, /html2pdf\.bundle\.min\.js$/);
  page.window.html2pdf = () => {};
  page.scripts[0].onload();
  await Promise.resolve();
  assert.equal(page.scripts.length, 2);
  assert.match(page.scripts[1].src, /html2canvas\.min\.js$/);
  page.window.html2canvas = () => {};
  page.scripts[1].onload();
  await Promise.all([first, second]);
  await page.window.ensureUsafcExportLibraries();
  assert.equal(page.scripts.length, 2);
});

test('failed library request can be retried on the next export', async () => {
  const page = browser();
  const failed = page.window.ensureUsafcExportLibraries();
  page.scripts[0].onerror();
  await assert.rejects(failed);
  const retry = page.window.ensureUsafcExportLibraries();
  assert.equal(page.scripts.length, 2);
  page.window.html2pdf = () => {};
  page.scripts[1].onload();
  await Promise.resolve();
  page.window.html2canvas = () => {};
  page.scripts[2].onload();
  await retry;
});

test('homepage does not request export dependencies before an export action', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const head = html.split(/<\/head>/i)[0];
  assert.doesNotMatch(head, /<script\b[^>]+src=["'][^"']*html2(?:pdf|canvas)/i);
  assert.match(head, /<script\b[^>]+src=["']assets\/js\/export-loader\.js["'][^>]+defer/i);
  assert.match(html, /ensureUsafcExportLibraries\(\)/);
});
