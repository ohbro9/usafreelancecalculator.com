#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourcePath = path.resolve(__dirname, '../assets/js/site-shell.js');
const source = fs.readFileSync(sourcePath, 'utf8');

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type, event = {}) {
    event.type = type;
    event.target ||= this;
    event.preventDefault ||= () => { event.defaultPrevented = true; };
    for (const listener of this.listeners.get(type) || []) listener.call(this, event);
    return event;
  }
}

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  contains(value) { return this.values.has(value); }
}

class FakeElement extends FakeEventTarget {
  constructor(attributes = {}) {
    super();
    this.attributes = new Map(Object.entries(attributes));
    this.focusCount = 0;
  }

  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  focus() { this.focusCount += 1; }
  querySelector() { return null; }
}

function createEnvironment(options = {}) {
  const windowTarget = new FakeEventTarget();
  const documentTarget = new FakeEventTarget();
  const trigger = new FakeElement({ 'aria-expanded': 'false' });
  const menu = new FakeElement();
  const backdrop = new FakeElement();
  const closeButton = new FakeElement();
  const shareButton = new FakeElement();
  const focusTarget = new FakeElement();
  const links = (options.pages || ['/', '/about.html']).map((page) => (
    new FakeElement({ 'data-shell-page': page, 'aria-current': 'page' })
  ));
  menu.querySelector = () => focusTarget;

  const elements = options.withShell === false ? {} : {
    '[data-site-shell]': new FakeElement(),
    '[data-shell-menu-trigger]': trigger,
    '[data-shell-menu]': menu,
    '[data-shell-backdrop]': backdrop,
    '[data-shell-menu-close]': closeButton,
    '[data-shell-share]': shareButton
  };
  const body = { classList: new FakeClassList(), appendChild() {} };
  const document = Object.assign(documentTarget, {
    readyState: 'complete',
    title: 'USA Freelance Calculator',
    body,
    querySelector: (selector) => elements[selector] || null,
    querySelectorAll: (selector) => selector === '[data-shell-page]' ? links : [],
    createElement: () => new FakeElement(),
    execCommand: () => true
  });

  const history = {
    pushes: 0,
    backs: 0,
    pushState() { this.pushes += 1; },
    back() { this.backs += 1; }
  };
  const navigator = {};
  if (options.share) navigator.share = options.share;
  if (options.clipboard) navigator.clipboard = options.clipboard;

  const window = Object.assign(windowTarget, {
    document,
    navigator,
    history,
    location: {
      pathname: options.pathname || '/',
      href: `https://usafreelancecalculator.com${options.pathname || '/'}`
    }
  });
  Object.defineProperty(window, 'localStorage', {
    get() { throw new Error('site shell must not access localStorage'); }
  });
  window.UFCToolkit = Object.freeze({ protected: true });

  vm.runInNewContext(source, { window, document, navigator, URL, Promise });
  return { window, document, trigger, menu, backdrop, closeButton, shareButton, focusTarget, links, history };
}

async function run() {
  const absent = createEnvironment({ withShell: false });
  assert.doesNotThrow(() => absent.window.UFCSiteShell.init());
  assert.doesNotThrow(() => absent.window.UFCSiteShell.openMenu());
  assert.doesNotThrow(() => absent.window.UFCSiteShell.closeMenu());

  const env = createEnvironment({ pathname: '/about.html' });
  env.window.UFCSiteShell.init();
  env.window.UFCSiteShell.init();
  assert.equal(env.trigger.listeners.get('click').length, 1, 'init does not duplicate listeners');

  env.window.UFCSiteShell.openMenu();
  assert.equal(env.trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(env.menu.getAttribute('data-shell-open'), 'true');
  assert.equal(env.backdrop.getAttribute('data-shell-open'), 'true');
  assert.equal(env.menu.getAttribute('aria-hidden'), 'false');
  assert.equal(env.document.body.classList.contains('ufc-shell-menu-open'), true);
  assert.equal(env.focusTarget.focusCount, 1, 'focus moves into menu');

  env.window.UFCSiteShell.closeMenu({ restoreFocus: true });
  assert.equal(env.trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(env.menu.getAttribute('data-shell-open'), 'false');
  assert.equal(env.backdrop.getAttribute('data-shell-open'), 'false');
  assert.equal(env.menu.getAttribute('aria-hidden'), 'true');
  assert.equal(env.document.body.classList.contains('ufc-shell-menu-open'), false);
  assert.equal(env.trigger.focusCount, 1, 'focus returns to trigger');

  env.document.dispatch('keydown', { key: 'Escape' });
  assert.equal(env.trigger.focusCount, 1, 'Escape is ignored while closed');
  env.window.UFCSiteShell.openMenu();
  env.document.dispatch('keydown', { key: 'Escape' });
  assert.equal(env.trigger.getAttribute('aria-expanded'), 'false', 'Escape closes open menu');

  env.window.UFCSiteShell.openMenu();
  env.backdrop.dispatch('click');
  assert.equal(env.trigger.getAttribute('aria-expanded'), 'false', 'backdrop closes menu');
  env.window.UFCSiteShell.openMenu();
  env.closeButton.dispatch('click');
  assert.equal(env.trigger.getAttribute('aria-expanded'), 'false', 'close button closes menu');

  env.window.UFCSiteShell.syncActiveState();
  assert.equal(env.links[0].getAttribute('aria-current'), null, 'stale current state removed');
  assert.equal(env.links[1].getAttribute('aria-current'), 'page', 'current path is marked');

  const supportedPaths = [
    ['/', '/'],
    ['/index.html', '/'],
    ['/hourly-rate-calculator.html', '/hourly-rate-calculator.html'],
    ['/platform-fee-calculator.html', '/platform-fee-calculator.html'],
    ['/tax-estimator.html', '/tax-estimator.html'],
    ['/income-goal-planner.html', '/income-goal-planner.html'],
    ['/budget-planner.html', '/budget-planner.html'],
    ['/about.html', '/about.html'],
    ['/privacy.html', '/privacy.html'],
    ['/terms.html', '/terms.html'],
    ['/contact.html', '/contact.html'],
    ['/app/', '/app/'],
    ['/app/index.html', '/app/']
  ];
  const destinations = [...new Set(supportedPaths.map((entry) => entry[1]))];
  for (const [pathname, expected] of supportedPaths) {
    const activeEnv = createEnvironment({ pathname, pages: destinations });
    activeEnv.window.UFCSiteShell.syncActiveState();
    const active = activeEnv.links.find((link) => link.getAttribute('aria-current') === 'page');
    assert.equal(active.getAttribute('data-shell-page'), expected, `${pathname} is normalized`);
  }

  let shared;
  const webShare = createEnvironment({
    share: async (data) => { shared = data; }
  });
  webShare.shareButton.dispatch('click');
  await Promise.resolve();
  assert.equal(shared.title, webShare.document.title);
  assert.equal(shared.url, webShare.window.location.href);

  let copied;
  const clipboard = createEnvironment({
    clipboard: { writeText: async (value) => { copied = value; } }
  });
  clipboard.shareButton.dispatch('click');
  await Promise.resolve();
  assert.equal(copied, clipboard.window.location.href);

  const back = createEnvironment();
  back.window.UFCSiteShell.openMenu();
  assert.equal(back.history.pushes, 1, 'opening creates one overlay history entry');
  back.window.dispatch('popstate');
  assert.equal(back.trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(back.menu.getAttribute('data-shell-open'), 'false');
  assert.equal(back.backdrop.getAttribute('data-shell-open'), 'false');
  assert.equal(back.document.body.classList.contains('ufc-shell-menu-open'), false);
  assert.equal(back.history.backs, 0, 'popstate close does not traverse history again');

  assert.deepEqual(env.window.UFCToolkit, { protected: true });
  console.log('site-shell JS tests: PASS');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
