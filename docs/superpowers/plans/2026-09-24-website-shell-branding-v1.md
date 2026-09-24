# Website Shell + Branding V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-quality shared website shell and final brand identity across the public site without changing calculator math, sponsorship behavior, APK/update files, or doing the final SEO pass.

**Architecture:** Keep calculator engines inside their existing pages. Add a small shared shell layer (`assets/site-shell.css` + `assets/js/site-shell.js`) for header/nav/overflow/footer behavior, update the production SVG mark, and integrate semantic shell markup into each target page. Existing `toolkit-core.js` remains dedicated to connected-tool state/handoff.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js assertion tests, existing Playwright/Chromium smoke-test pattern.

**Spec:** `docs/superpowers/specs/2026-09-24-website-shell-branding-design.md`

## Global Constraints

- Work only on `feat/website-shell-branding-v1`.
- Do not modify `main` directly and do not merge during implementation.
- Preserve calculator formulas, cent precision, toolkit handoff, export calculations, reset semantics, APK binary, and `app/update-config.json`.
- No sponsorship implementation in this phase.
- No final SEO/content rewrite in this phase; preserve canonical URLs, robots/indexability, titles/descriptions, and existing structured data.
- Approved brand colors are `#0A1728`, `#FF7A00`, and `#F8FBFF`.
- Production mark is exactly five rounded stepped modules: four near-white and one orange; no gradient inside the mark and no letters/dollar/calculator/chart/network motif.
- Desktop keeps all five tools directly discoverable; mobile gets a compact `⋮` secondary menu.

## Review Focus

1. **Small mobile widths (320–390 px):** shell must not cause horizontal overflow or clipped brand/menu controls. Covered by Task 5 Playwright tests.
2. **Existing dark/light pages with different local theme implementations:** shell must remain readable without resetting tool state. Covered by Tasks 3 and 5.
3. **Overlay lifecycle:** trigger, close button, backdrop, Escape, focus return, and browser history/back must not leave a stuck menu. Covered by Tasks 3 and 5.
4. **Calculator regression:** shell edits must not change deterministic tax/budget behavior or Platform Fee input behavior. Covered by Task 6.
5. **Metadata/navigation regression:** canonical/meta basics and all public/legal/app destinations must remain reachable. Covered by Tasks 1, 4, and 6.

---

### Task 1: Lock Structural Regression Tests Before UI Changes

**Files:**
- Create: `tests/site-shell-structure.test.js`
- Read only for baseline: `index.html`, five calculator pages, four legal/info pages, `app/index.html`

**Interfaces:**
- Consumes: current static HTML pages.
- Produces: deterministic assertions for required shell asset references, metadata preservation, and protected release files.

- [ ] **Step 1: Write the failing structural test**

Create a Node test that defines the exact target page sets and asserts the future contract:

```js
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
```

- [ ] **Step 2: Run the new test and confirm it fails before implementation**

Run:
```bash
node tests/site-shell-structure.test.js
```
Expected: FAIL because `data-site-shell`, `site-shell.css`, and `site-shell.js` do not yet exist on all pages.

- [ ] **Step 3: Commit only the failing test**

```bash
git add tests/site-shell-structure.test.js
git commit -m "test: define website shell contract"
```

---

### Task 2: Replace Legacy Mark and Add Shared Shell CSS

**Files:**
- Modify: `assets/icon.svg`
- Create: `assets/site-shell.css`
- Test: `tests/site-shell-structure.test.js`

**Interfaces:**
- Produces CSS classes prefixed `ufc-shell-` so calculator-local CSS cannot accidentally collide.
- Produces a flat SVG mark used by favicon/header markup.

- [ ] **Step 1: Extend the structural test for the brand asset**

Add assertions that `assets/icon.svg` contains the locked colors and no gradient:

```js
const icon = fs.readFileSync(path.join(root, 'assets/icon.svg'), 'utf8');
assert.match(icon, /#0A1728/i);
assert.match(icon, /#FF7A00/i);
assert.match(icon, /#F8FBFF/i);
assert.doesNotMatch(icon, /linearGradient|radialGradient/i);
```

- [ ] **Step 2: Replace `assets/icon.svg` with the final flat five-module mark**

Use a 64×64 deep-navy canvas and exactly five same-family rounded module shapes with four `#F8FBFF` fills and one `#FF7A00` fill. Keep the composition compact and stepped; do not add text or gradients.

- [ ] **Step 3: Create `assets/site-shell.css`**

Implement only shell-owned styles with these stable selectors:

```css
.ufc-shell-header {}
.ufc-shell-inner {}
.ufc-shell-brand {}
.ufc-shell-brand-mark {}
.ufc-shell-primary-nav {}
.ufc-shell-tool-link {}
.ufc-shell-actions {}
.ufc-shell-menu-trigger {}
.ufc-shell-backdrop {}
.ufc-shell-menu {}
.ufc-shell-menu-close {}
.ufc-shell-menu-link {}
.ufc-shell-footer {}
.ufc-shell-footer-grid {}
.ufc-shell-footer-links {}
body.ufc-shell-menu-open { overflow: hidden; }
```

CSS requirements:
- namespace every new shell selector with `ufc-shell-`;
- mobile breakpoint hides the desktop primary nav and shows the `⋮` trigger;
- desktop keeps five tool destinations visible;
- controls are ~44px minimum touch height where practical;
- menu/backdrop use a high but bounded z-index and do not override calculator modals globally;
- support both light pages and dark pages through shell variables plus `body.dark`/dark-background-safe defaults;
- no page-wide typography/reset rules.

- [ ] **Step 4: Run structural test**

```bash
node tests/site-shell-structure.test.js
```
Expected: still FAIL only because page integrations are not complete yet; brand assertions must PASS.

- [ ] **Step 5: Commit asset/CSS work**

```bash
git add assets/icon.svg assets/site-shell.css tests/site-shell-structure.test.js
git commit -m "feat: add production website brand shell styles"
```

---

### Task 3: Add Shared Menu and Active-State JavaScript

**Files:**
- Create: `assets/js/site-shell.js`
- Create: `tests/site-shell-js.test.js`

**Interfaces:**
- Consumes markup attributes: `[data-site-shell]`, `[data-shell-menu-trigger]`, `[data-shell-menu]`, `[data-shell-backdrop]`, `[data-shell-menu-close]`, and links with `[data-shell-page]`.
- Produces `window.UFCSiteShell` with `openMenu()`, `closeMenu()`, and `syncActiveState()` for tests/debugging only; pages should work via automatic initialization.

- [ ] **Step 1: Write JS behavior tests first**

Use Node `vm` with a minimal fake document/history/event surface to assert:
- init is safe when shell markup is absent;
- `openMenu()` sets `aria-expanded="true"` and opens menu/backdrop;
- `closeMenu()` restores `aria-expanded="false"` and focus to trigger;
- Escape closes only when open;
- active link matching is based on pathname and never changes `UFCToolkit` state/localStorage.

- [ ] **Step 2: Run and confirm failure**

```bash
node tests/site-shell-js.test.js
```
Expected: FAIL because `assets/js/site-shell.js` does not exist.

- [ ] **Step 3: Implement the menu controller**

Core contract:

```js
(function (window, document) {
  'use strict';
  function openMenu() { /* toggle shell-owned state only */ }
  function closeMenu(options) { /* close + optional focus restore */ }
  function syncActiveState() { /* pathname -> aria-current */ }
  function init() { /* idempotent listener wiring */ }
  window.UFCSiteShell = { openMenu, closeMenu, syncActiveState, init };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window, document);
```

Behavior must include trigger, close button, backdrop, Escape, share link using Web Share when available with copy-link fallback, and history/back handling that closes the overlay rather than leaving a stale open state. Do not read/write calculator inputs or toolkit handoff keys.

- [ ] **Step 4: Run JS tests**

```bash
node tests/site-shell-js.test.js
```
Expected: PASS.

- [ ] **Step 5: Commit shared behavior**

```bash
git add assets/js/site-shell.js tests/site-shell-js.test.js
git commit -m "feat: add accessible website overflow menu"
```

---

### Task 4: Integrate the Shell Across Public Pages

**Files:**
- Modify: `index.html`
- Modify: `hourly-rate-calculator.html`
- Modify: `platform-fee-calculator.html`
- Modify: `tax-estimator.html`
- Modify: `income-goal-planner.html`
- Modify: `budget-planner.html`
- Modify: `about.html`
- Modify: `privacy.html`
- Modify: `terms.html`
- Modify: `contact.html`
- Modify: `app/index.html`
- Modify only where needed: `assets/site-pages.css`
- Test: `tests/site-shell-structure.test.js`

**Interfaces:**
- Each page loads the appropriate relative shell CSS/JS path.
- Root pages use `assets/...`; `app/index.html` uses `../assets/...`.

- [ ] **Step 1: Add shared `<head>` assets without removing current metadata**

Root pages:
```html
<link rel="stylesheet" href="assets/site-shell.css">
<script defer src="assets/js/site-shell.js"></script>
```

App page:
```html
<link rel="stylesheet" href="../assets/site-shell.css">
<script defer src="../assets/js/site-shell.js"></script>
<link rel="icon" href="../assets/icon.svg" type="image/svg+xml">
```

- [ ] **Step 2: Add semantic shell header markup to each page**

Use the same class/attribute contract, adapting relative URLs for `/app/`. Include brand link, five desktop tool links, Android App destination, menu trigger, backdrop, menu close button, tool/menu/info links, and `aria-current` on the current destination.

- [ ] **Step 3: Remove or neutralize duplicate top navigation blocks only after replacement exists**

For calculator pages, replace existing top-only toolkit strips/pill rows that duplicate the same five-tool navigation. Preserve page-specific hero/header content, mode controls, year controls, theme controls, and calculator actions. Do not remove toolkit handoff buttons inside calculators.

For legal pages, replace the old `legal-topnav` with the shared shell but preserve legal page body content.

For `app/index.html`, integrate the shell around the existing download page without changing APK href, checksum/version data, or update metadata file.

- [ ] **Step 4: Add/normalize the shared footer**

Footer links must expose: five tools, Android App, About, Contact, Privacy, Terms. Preserve tool-specific disclaimer/legal copy that already exists; remove only duplicate navigation wrappers after the shared footer is present.

- [ ] **Step 5: Run structural test until fully green**

```bash
node tests/site-shell-structure.test.js
```
Expected: PASS for all eleven target pages.

- [ ] **Step 6: Commit page integration**

```bash
git add index.html hourly-rate-calculator.html platform-fee-calculator.html tax-estimator.html income-goal-planner.html budget-planner.html about.html privacy.html terms.html contact.html app/index.html assets/site-pages.css
git commit -m "feat: integrate shared shell across website"
```

---

### Task 5: Add Browser-Level Shell QA

**Files:**
- Create: `tests/site-shell.playwright.js`

**Interfaces:**
- Uses `SITE_BASE_URL` defaulting to `http://127.0.0.1:4173`.
- Uses `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when supplied, matching the existing Platform Fee Playwright test convention.

- [ ] **Step 1: Write Playwright coverage for desktop + Pixel 7 + narrow 320px viewport**

Test these paths:
```js
const paths = [
  '/', '/hourly-rate-calculator.html', '/platform-fee-calculator.html',
  '/tax-estimator.html', '/income-goal-planner.html', '/budget-planner.html',
  '/about.html', '/privacy.html', '/terms.html', '/contact.html', '/app/'
];
```

For every path assert:
- no horizontal overflow (`document.documentElement.scrollWidth <= innerWidth + 1`);
- shell header and footer visible;
- production brand image resolves;
- expected current destination has `aria-current="page"` where applicable.

For mobile assert:
- menu trigger visible;
- clicking trigger opens menu and sets `aria-expanded=true`;
- backdrop closes;
- reopen + Escape closes;
- reopen + close button closes;
- focus returns to trigger after close;
- menu links have at least ~44px rendered height where practical.

- [ ] **Step 2: Serve the static repo and run Playwright**

Terminal A:
```bash
python3 -m http.server 4173
```

Terminal B:
```bash
node tests/site-shell.playwright.js
```
Expected: PASS for desktop, Pixel 7, and 320px profiles.

- [ ] **Step 3: Commit browser QA**

```bash
git add tests/site-shell.playwright.js
git commit -m "test: cover shared website shell in Chromium"
```

---

### Task 6: Run Calculator Regression Gates

**Files:**
- No intended product-code changes in this task.
- Existing tests: `tests/tax-estimator-regression.test.js`, `tests/budget-planner-regression.test.js`, `tests/platform-fee-caret.playwright.js`

**Interfaces:**
- Confirms Phase 1 did not disturb protected calculation/input behavior.

- [ ] **Step 1: Run deterministic Node regressions**

```bash
node tests/tax-estimator-regression.test.js
node tests/budget-planner-regression.test.js
```
Expected: both PASS.

- [ ] **Step 2: Run existing Platform Fee browser regression on the same static server**

```bash
PFC_BASE_URL=http://127.0.0.1:4173 node tests/platform-fee-caret.playwright.js
```
Expected: PASS for desktop Chromium and Pixel 7 mobile Chromium.

- [ ] **Step 3: Re-run new shell tests together**

```bash
node tests/site-shell-structure.test.js
node tests/site-shell-js.test.js
SITE_BASE_URL=http://127.0.0.1:4173 node tests/site-shell.playwright.js
```
Expected: all PASS.

- [ ] **Step 4: Verify protected release files are unchanged against `main`**

```bash
git diff --exit-code main...HEAD -- app/update-config.json downloads/usafreelancecalculator-installable.apk
```
Expected: no diff.

---

### Task 7: Whole-Branch Review and PR Gate

**Files:**
- Review all files changed on `feat/website-shell-branding-v1`.

**Interfaces:**
- Produces a reviewable PR only after automated gates pass.

- [ ] **Step 1: Inspect branch diff for scope creep**

```bash
git diff --stat main...HEAD
git diff main...HEAD -- assets/icon.svg assets/site-shell.css assets/js/site-shell.js tests/ index.html hourly-rate-calculator.html platform-fee-calculator.html tax-estimator.html income-goal-planner.html budget-planner.html about.html privacy.html terms.html contact.html app/index.html assets/site-pages.css
```
Reject any unrelated calculator-formula, sponsorship, APK/update, sitemap/robots, or SEO-copy rewrite.

- [ ] **Step 2: Confirm metadata basics programmatically and manually**

Check every target page still has a title, description, canonical, and robots/indexing behavior consistent with its baseline. Do not add the final SEO changes here.

- [ ] **Step 3: Perform physical-phone QA before merge**

On Android Chrome verify at minimum:
- Home and all five calculators load with no header overlap.
- `⋮` open/close/backdrop behavior is reliable.
- Theme controls still work where currently supported.
- Representative calculator input/result interaction still works.
- Share/menu links route correctly.
- Android App download page remains reachable.

- [ ] **Step 4: Open one PR from the existing branch, but do not merge**

PR title:
```text
Website shell + branding v1
```

PR body must summarize: shared shell, final brand mark, pages integrated, tests run, protected surfaces unchanged, and explicit non-goals (no sponsorship/final SEO/calculation changes).

- [ ] **Step 5: Final reviewer gate**

Require a fresh whole-branch review. Any blocker returns to the owning task, then rerun Task 6 before considering merge.

---

## Self-Review Result

- Spec coverage: branding, desktop/mobile nav, `⋮` menu, footer, theme compatibility, responsive/accessibility behavior, reuse boundaries, protected calculator surfaces, and validation gates are all assigned to tasks.
- Placeholder scan: no implementation step depends on TBD/TODO decisions.
- Interface consistency: shell CSS/JS class/data contracts are defined once and reused by page integration and tests.
- Review Focus coverage: all five identified high-risk areas have explicit automated or physical QA gates.
