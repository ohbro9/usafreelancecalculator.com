'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'assets/js/site-analytics.js');

// Only the external script insertion is simulated; the loader runs unchanged.
function browser(url, referrer = '') {
  const scripts = [];
  const window = { location: new URL(url) };
  const document = {
    referrer,
    createElement(tag) {
      assert.equal(tag, 'script');
      return {};
    },
    head: { appendChild(script) { scripts.push(script); } }
  };
  const context = vm.createContext({ window, document, URL });
  function run() { vm.runInContext(fs.readFileSync(sourcePath, 'utf8'), context); }
  return { window, scripts, run };
}

test('production visits initialize the website stream once and exclude URL input values', () => {
  const page = browser(
    'https://usafreelancecalculator.com/budget-planner.html?income=12345#expenses=6789',
    'https://example.org/resources?email=private@example.org#private'
  );
  page.run();
  page.run();
  assert.equal(page.scripts.length, 1);
  assert.equal(page.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-K1B2H6ENHK');
  assert.equal(page.scripts[0].async, true);
  const commands = page.window.dataLayer.map(command => Array.from(command));
  assert.equal(commands.length, 2);
  assert.equal(commands[0][0], 'js');
  const [command, stream, config] = commands[1];
  assert.equal(command, 'config');
  assert.equal(stream, 'G-K1B2H6ENHK');
  assert.equal(config.page_location, 'https://usafreelancecalculator.com/budget-planner.html');
  assert.equal(config.page_referrer, 'https://example.org/resources');
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
  assert.equal(config.send_page_view, true);
  assert.doesNotMatch(JSON.stringify(commands), /12345|6789|private/);
});

test('local previews, bundled app pages and unrelated hosts send no website visits', () => {
  for (const url of [
    'http://localhost:4173/',
    'file:///android_asset/index.html',
    'https://preview.example.org/',
    'https://usafreelancecalculator.com.example.org/',
    'http://usafreelancecalculator.com/'
  ]) {
    const page = browser(url);
    page.run();
    assert.equal(page.scripts.length, 0, url);
    assert.equal(page.window.dataLayer, undefined, url);
  }
});

test('direct visits and invalid referrers do not break analytics initialization', () => {
  for (const referrer of ['', 'not a URL', 'file:///private/local.html']) {
    const page = browser('https://www.usafreelancecalculator.com/', referrer);
    page.run();
    assert.equal(page.scripts.length, 1);
    assert.equal(page.window.dataLayer[1][2].page_referrer, '');
  }
});

test('every published HTML page can load the shared analytics script', () => {
  const pages = fs.readdirSync(root).filter(name => name.endsWith('.html'));
  pages.push('app/index.html');
  for (const relative of pages) {
    const html = fs.readFileSync(path.join(root, relative), 'utf8');
    const head = html.split(/<\/head>/i)[0];
    const scripts = [...head.matchAll(/<script\b[^>]*src=["']([^"']*site-analytics\.js)["'][^>]*>/gi)];
    assert.equal(scripts.length, 1, `${relative}: missing or duplicated loader`);
    assert.match(scripts[0][0], /\bdefer\b/, relative);
    const scriptPath = scripts[0][1].startsWith('/')
      ? path.join(root, scripts[0][1])
      : path.resolve(path.dirname(path.join(root, relative)), scripts[0][1]);
    assert.ok(fs.existsSync(scriptPath), relative);
  }
});
