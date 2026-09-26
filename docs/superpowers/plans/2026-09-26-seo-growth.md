# USA Freelance Calculator SEO Growth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved SEO Growth v1 design on the website repository without changing calculator math, breaking interconnected-tool behavior, or redesigning the product.

**Architecture:** Keep the existing static HTML calculators and shared assets intact, adding search-intent-specific metadata/content, trust/source blocks, safer technical SEO, and regression coverage in small reviewable batches. Core website SEO is one implementation plan; Blogger publishing/distribution is a separate follow-up subsystem because it is not implemented in this GitHub repository.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test scripts, existing Playwright browser regression script, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-26-seo-growth-design.md`

## Global Constraints

- Repository: `ohbro9/usafreelancecalculator.com`.
- Planning-time `main` HEAD: `d029b291463dab0541c30c94ab01276e74536e64`; execution must re-fetch and start from the then-current `main`.
- Create one fresh branch: `feat/seo-growth-v1`.
- Never modify `main` directly.
- Never merge `feat/website-shell-branding-v1`.
- Do not intentionally change calculator formulas/business logic for SEO.
- Preserve cents/precision, reverse modes, cross-tool handoff, PNG/PDF/export/share behavior, sponsorship behavior, and Android release values.
- Preserve current visual design; only add focused SEO/supporting-content UI that fits existing styles.
- Verify platform-fee and tax claims against authoritative sources immediately before implementation.
- No schema spam, fake reviews/ratings, keyword stuffing, mass AI content, bot traffic, paid-link schemes, or unrelated refactors.
- Commit each task separately; do not squash tasks during implementation unless the final review specifically requests it.
- Do not merge the PR until automated tests, browser QA, physical/mobile spot checks where needed, and final diff review pass.

## Review Focus

1. **SEO copy accidentally changes product behavior:** static-content edits must not touch calculation functions, numeric constants unrelated to factual preset labels, handoff contracts, export data models, or sponsorship routing.
2. **Home/Hourly separation breaks navigation or duplicate IDs:** both pages must retain valid anchors/tool access while exposing distinct H1/title/purpose.
3. **Variable platform-fee claims become misleading:** any fixed starter percentage must be explicitly labeled illustrative/editable and never described as a universal current fee.
4. **Tax trust copy conflicts with calculator year/data:** visible year, assumptions and IRS-source language must agree with the calculation data actually shipped.
5. **Technical SEO change harms indexability or mobile UX:** canonicals, robots, sitemap, structured data, share metadata and supporting sections must not introduce noindex errors, broken links, overflow, or layout shift.

---

## Pre-Execution Gate: Rebase the Plan on Current Main

**Files:** none

**Interfaces:**
- Consumes: approved spec and this plan.
- Produces: a clean `feat/seo-growth-v1` branch from the latest `origin/main`.

- [ ] **Step 1: Refresh repository state**

  Run:
  ```bash
  git fetch origin
  git checkout main
  git pull --ff-only origin main
  git rev-parse HEAD
  ```
  Expected: clean current `main`; record the SHA in the PR description.

- [ ] **Step 2: Run existing deterministic baseline tests**

  Run:
  ```bash
  node tests/budget-planner-regression.test.js
  node tests/tax-estimator-regression.test.js
  node tests/android-download-page-release.test.js
  ```
  Expected: all three print `PASS`.

- [ ] **Step 3: Create the implementation branch**

  Run:
  ```bash
  git checkout -b feat/seo-growth-v1
  ```
  Expected: branch created from the recorded latest `main`.

- [ ] **Step 4: Add the approved spec and implementation plan to the branch**

  Create:
  - `docs/superpowers/specs/2026-09-26-seo-growth-design.md`
  - `docs/superpowers/plans/2026-09-26-seo-growth.md`

  Expected: files match the approved documents without changing product files.

- [ ] **Step 5: Commit planning artifacts**

  ```bash
  git add docs/superpowers/specs/2026-09-26-seo-growth-design.md docs/superpowers/plans/2026-09-26-seo-growth.md
  git commit -m "docs: add SEO growth spec and implementation plan"
  ```

---

### Task 1: Add Static SEO Regression Coverage

**Files:**
- Create: `tests/seo-structure-regression.test.js`
- Read only for assertions: `index.html`, `budget-planner.html`, `hourly-rate-calculator.html`, `platform-fee-calculator.html`, `tax-estimator.html`, `income-goal-planner.html`, `app/index.html`, `sitemap.xml`, `404.html`

**Interfaces:**
- Consumes: approved page-ownership/title/H1/canonical map.
- Produces: one deterministic Node regression script used by every later task.

- [ ] **Step 1: Write the failing SEO structure test**

  Use `node:assert/strict` + `node:fs`. Assert exact approved title/H1/canonical expectations for Home, Budget, Hourly, Platform, Tax and Income Goal; assert each page has one canonical to its own URL; assert descriptions are non-empty and page-specific; assert `/app/` has its own canonical/title/H1; assert `sitemap.xml` contains `/app/`; assert `404.html` contains root-safe `href="/"` and `/platform-fee-calculator.html`; assert no core page contains the known visitor-facing implementation phrases:
  - `homepage now stays tighter`
  - `without turning the page into a cluttered social block`
  - `without adding a messy social strip`
  - `so the main tool keeps its premium flow`
  - `Keep the end-of-page UI premium and compact`

  Also assert Home H1 and Hourly H1 are not identical.

- [ ] **Step 2: Run the new test and verify expected failures**

  ```bash
  node tests/seo-structure-regression.test.js
  ```
  Expected: FAIL on current metadata/H1/app-sitemap/404/dev-copy assertions.

- [ ] **Step 3: Keep the test narrowly structural**

  Do not duplicate tax math or budget math assertions already owned by existing regression files. Do not parse rendered CSS layout in this test.

- [ ] **Step 4: Commit the failing test**

  ```bash
  git add tests/seo-structure-regression.test.js
  git commit -m "test: pin SEO structure requirements"
  ```

---

### Task 2: P0 Platform-Fee Trust Copy and Public Dev-Copy Cleanup

**Files:**
- Modify: `platform-fee-calculator.html`
- Modify only where offending visitor-facing implementation copy exists: `index.html`, `tax-estimator.html`, `budget-planner.html`, `income-goal-planner.html`
- Test: `tests/seo-structure-regression.test.js`
- Preserve: `tests/platform-fee-caret.playwright.js`

**Interfaces:**
- Consumes: current platform preset UI and current official platform documentation checked at implementation time.
- Produces: truthful public fee wording without changing percentage arithmetic functions.

- [ ] **Step 1: Add/extend failing trust assertions**

  In `tests/seo-structure-regression.test.js`, assert Platform no longer states `Upwork now charges a flat 10% fee on all marketplace contracts`; assert it contains a clear account/contract-specific fee disclaimer and a visible `Last reviewed` label; assert variable-platform preset labels cannot be presented as universally current facts.

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  node tests/seo-structure-regression.test.js
  ```
  Expected: FAIL on platform trust/dev-copy assertions.

- [ ] **Step 3: Correct platform public copy without rewriting calculator math**

  In `platform-fee-calculator.html`:
  - remove the universal flat-10% Upwork statement;
  - describe variable platform percentages as illustrative starter/default values where they are not universal;
  - tell users to use the fee shown in their account/contract when available;
  - tell users to use `Custom` for an exact account/contract rate when a preset does not match;
  - replace stale withdrawal examples with verified current wording or a neutral “verify current payout fee” instruction if a single universal amount cannot be stated safely;
  - add a visible assumptions/source/last-reviewed block with authoritative links;
  - do not alter fee arithmetic functions in this task.

- [ ] **Step 4: Remove visitor-facing implementation commentary**

  Replace only the known internal/design commentary with user-facing copy. Do not redesign the surrounding components.

- [ ] **Step 5: Run deterministic tests**

  ```bash
  node tests/seo-structure-regression.test.js
  node tests/budget-planner-regression.test.js
  node tests/tax-estimator-regression.test.js
  ```
  Expected: SEO test should progress past P0 assertions; budget/tax remain PASS.

- [ ] **Step 6: Browser-regress Platform input behavior**

  Serve the repo locally, then run:
  ```bash
  node tests/platform-fee-caret.playwright.js
  ```
  with `PFC_BASE_URL` / `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` only if the environment requires them.

  Expected: desktop Chromium and Pixel 7 profiles PASS.

- [ ] **Step 7: Commit**

  ```bash
  git add platform-fee-calculator.html index.html tax-estimator.html budget-planner.html income-goal-planner.html tests/seo-structure-regression.test.js
  git commit -m "fix: correct public fee and trust copy"
  ```

---

### Task 3: Budget Planner SEO Quick Win

**Files:**
- Modify: `budget-planner.html`
- Test: `tests/seo-structure-regression.test.js`
- Preserve: `tests/budget-planner-regression.test.js`

**Interfaces:**
- Consumes: Budget keyword ownership and existing calculator UI.
- Produces: a dedicated `Freelance Budget Calculator` landing/tool page with supporting content below the tool.

- [ ] **Step 1: Add failing Budget SEO assertions**

  Assert:
  - title exactly `Freelance Budget Calculator for Irregular Income | Free Tool`;
  - H1 exactly `Freelance Budget Calculator`;
  - description mentions irregular freelance income and budgeting purpose;
  - supporting headings exist for how it works, irregular-income example, tax reserve, runway/savings or equivalent approved concepts, FAQ, and related tools/guides;
  - page links contextually to Hourly and Tax calculators;
  - calculation source functions/constants used by the existing budget regression test are unchanged by this task.

- [ ] **Step 2: Run tests and confirm SEO failure / math pass**

  ```bash
  node tests/seo-structure-regression.test.js
  node tests/budget-planner-regression.test.js
  ```
  Expected: SEO assertions FAIL before implementation; deterministic budget math PASS.

- [ ] **Step 3: Implement approved Budget metadata/H1**

  Update only title, description, OG/Twitter copy and the visible page heading/intro necessary for Budget search intent.

- [ ] **Step 4: Add concise supporting content below the calculator**

  Add:
  - how-it-works section;
  - one clearly labeled irregular-income worked example;
  - tax reserve and runway explanation;
  - concise visible FAQs;
  - descriptive related-tool links.

  Keep the calculator above the supporting SEO content.

- [ ] **Step 5: Run tests**

  ```bash
  node tests/seo-structure-regression.test.js
  node tests/budget-planner-regression.test.js
  ```
  Expected: Budget SEO assertions PASS; deterministic budget regression still PASS.

- [ ] **Step 6: Mobile/desktop spot check**

  Verify no horizontal overflow, no calculator displacement above a giant content block, and no broken tool inputs/actions at ~390px and ~1280px widths.

- [ ] **Step 7: Commit**

  ```bash
  git add budget-planner.html tests/seo-structure-regression.test.js
  git commit -m "feat: strengthen budget planner search intent"
  ```

---

### Task 4: Separate Home Hub From Hourly Rate Search Intent

**Files:**
- Modify: `index.html`
- Modify: `hourly-rate-calculator.html`
- Test: `tests/seo-structure-regression.test.js`

**Interfaces:**
- Consumes: existing connected-tool navigation and approved distinct page ownership.
- Produces: a compact Home toolkit hub and a dedicated Hourly Rate page without changing the hourly calculator’s numeric logic.

- [ ] **Step 1: Add failing Home/Hourly assertions**

  Assert exact approved titles/H1s, distinct H1s, Home includes links to all five tools, Hourly includes supporting headings for formula/how-to, billable hours, time off/expenses, worked example, FAQ and related tools, and both pages retain their correct self-canonicals.

- [ ] **Step 2: Verify expected failure**

  ```bash
  node tests/seo-structure-regression.test.js
  ```
  Expected: FAIL on current generic Hourly H1/content overlap.

- [ ] **Step 3: Refocus Home**

  Keep Home compact and hub-like:
  - approved Home title/H1/description;
  - clear chooser for the five calculators;
  - short connected-workflow explanation;
  - goal-based entry points;
  - no duplicate long Hourly-specific explanatory copy.

- [ ] **Step 4: Refocus Hourly**

  Give `hourly-rate-calculator.html`:
  - approved Hourly title/H1/description;
  - concise rate-specific intro;
  - formula/methodology;
  - billable vs non-billable hours;
  - unpaid time off/expenses/tax considerations;
  - one clearly labeled worked example;
  - FAQs;
  - descriptive links to Platform Fee and relevant next tools.

  Do not modify calculation functions or handoff contracts.

- [ ] **Step 5: Run structural + manual calculation smoke checks**

  ```bash
  node tests/seo-structure-regression.test.js
  ```
  Then manually verify a known Hourly forward and reverse scenario from the existing project QA notes, including cents-preserving handoff.

- [ ] **Step 6: Browser QA**

  Verify Home and Hourly on mobile and desktop: tool navigation, anchors, dark/light where applicable, reverse mode, share/export controls, and no duplicate IDs introduced by supporting sections.

- [ ] **Step 7: Commit**

  ```bash
  git add index.html hourly-rate-calculator.html tests/seo-structure-regression.test.js
  git commit -m "feat: separate home and hourly SEO intent"
  ```

---

### Task 5: Platform Fee and Tax SEO Depth / Trust

**Files:**
- Modify: `platform-fee-calculator.html`
- Modify: `tax-estimator.html`
- Test: `tests/seo-structure-regression.test.js`
- Preserve: `tests/platform-fee-caret.playwright.js`, `tests/tax-estimator-regression.test.js`

**Interfaces:**
- Consumes: corrected P0 trust copy, approved metadata map, current authoritative platform/IRS sources.
- Produces: source-backed supporting content and clearer search intent while preserving calculations.

- [ ] **Step 1: Add failing metadata/content assertions**

  Assert exact approved Platform/Tax titles/H1s; Platform has how-it-works, worked example, assumptions/sources, fee-difference explanation, FAQs; Tax has how-it-works, SE-tax explanation, quarterly-estimate explanation, worked example, methodology/IRS sources, last-reviewed, estimate disclaimer, FAQs.

- [ ] **Step 2: Run tests to confirm content failures and calculation baseline**

  ```bash
  node tests/seo-structure-regression.test.js
  node tests/tax-estimator-regression.test.js
  ```
  Expected: new SEO assertions FAIL; tax regression PASS.

- [ ] **Step 3: Implement Platform metadata/supporting sections**

  Add the approved title/meta/H1 and concise supporting sections below the active calculator. Keep all variable-fee statements explicitly account/contract-dependent where appropriate.

- [ ] **Step 4: Implement Tax metadata/trust/supporting sections**

  Add approved title/meta/H1, visible tax year, methodology, IRS-source block, last-reviewed date, concise worked example and FAQs. Source wording must agree with the currently shipped `TAX` data; do not change `TAX` values in this task unless a separately verified calculation bug is discovered, in which case stop and open a separate calculation-fix task.

- [ ] **Step 5: Run full relevant regressions**

  ```bash
  node tests/seo-structure-regression.test.js
  node tests/tax-estimator-regression.test.js
  node tests/platform-fee-caret.playwright.js
  ```
  Expected: PASS.

- [ ] **Step 6: Browser QA**

  Verify source links, last-reviewed text, examples, Platform Client Pays/I Want to Keep modes, comparison UI, Tax year controls, exports/share, and mobile readability.

- [ ] **Step 7: Commit**

  ```bash
  git add platform-fee-calculator.html tax-estimator.html tests/seo-structure-regression.test.js
  git commit -m "feat: add platform and tax SEO trust content"
  ```

---

### Task 6: Income Goal, Android App, Sitemap, 404 and Social Metadata

**Files:**
- Modify: `income-goal-planner.html`
- Modify: `app/index.html`
- Modify: `sitemap.xml`
- Modify: `404.html`
- Modify core pages only as needed for shared social metadata: `index.html`, `budget-planner.html`, `hourly-rate-calculator.html`, `platform-fee-calculator.html`, `tax-estimator.html`
- Create if approved brand asset can be produced without redesign: `assets/og-default.png`
- Test: `tests/seo-structure-regression.test.js`
- Preserve: `tests/android-download-page-release.test.js`

**Interfaces:**
- Consumes: approved Income Goal ownership, locked brand, current Android release details.
- Produces: distinct Income Goal search intent plus consistent technical/social SEO.

- [ ] **Step 1: Add failing assertions**

  Assert:
  - Income title/H1 match approved values and page contains gross-vs-net, taxes/fees/expenses, worked example, methodology and FAQs;
  - `/app/` title/meta/H1/canonical are Android-specific and current release values remain present;
  - sitemap contains all canonical core pages including `/app/`;
  - 404 links are root-safe;
  - core pages contain consistent `og:title`, `og:description`, `og:url`, Twitter card metadata;
  - if `og:image` is shipped, the referenced asset exists and is consistent across core pages.

- [ ] **Step 2: Confirm failing SEO / passing Android release baseline**

  ```bash
  node tests/seo-structure-regression.test.js
  node tests/android-download-page-release.test.js
  ```
  Expected: SEO assertions FAIL before implementation; Android release test PASS.

- [ ] **Step 3: Implement Income Goal content**

  Add approved metadata/H1 and concise supporting sections. Keep Income Goal centered on desired take-home → required gross revenue, not on stealing Hourly’s primary keyword.

- [ ] **Step 4: Strengthen `/app/` technical SEO without touching release facts**

  Add/normalize social metadata and valid software/app structured data only with supportable visible facts. Do not modify version, build, package ID, APK size, checksum, download filename or update config.

- [ ] **Step 5: Update sitemap and 404**

  Add `/app/` to `sitemap.xml`; use root-safe links in `404.html`; do not invent fake `lastmod` values.

- [ ] **Step 6: Add default share image only if production-ready**

  Create one 1200×630 branded image using the locked navy/orange/near-white identity. If a production-ready raster cannot be generated in the implementation environment, do not ship a broken/placeholder `og:image`; leave image metadata out and track it as a separate follow-up rather than blocking SEO v1.

- [ ] **Step 7: Run tests**

  ```bash
  node tests/seo-structure-regression.test.js
  node tests/android-download-page-release.test.js
  node tests/budget-planner-regression.test.js
  node tests/tax-estimator-regression.test.js
  ```
  Expected: PASS.

- [ ] **Step 8: Commit**

  ```bash
  git add income-goal-planner.html app/index.html sitemap.xml 404.html index.html budget-planner.html hourly-rate-calculator.html platform-fee-calculator.html tax-estimator.html tests/seo-structure-regression.test.js
  git commit -m "feat: complete technical SEO and app metadata"
  ```
  Add `assets/og-default.png` only if Task 6 Step 6 ships it.

---

### Task 7: Whole-Branch Regression and Browser Review

**Files:** no product changes unless a confirmed regression is fixed in a dedicated follow-up commit.

**Interfaces:**
- Consumes: all prior task outputs.
- Produces: merge-ready evidence.

- [ ] **Step 1: Run deterministic tests**

  ```bash
  node tests/seo-structure-regression.test.js
  node tests/budget-planner-regression.test.js
  node tests/tax-estimator-regression.test.js
  node tests/android-download-page-release.test.js
  ```
  Expected: all PASS.

- [ ] **Step 2: Run Platform Playwright regression**

  Start a local static server on the expected base URL, then:
  ```bash
  node tests/platform-fee-caret.playwright.js
  ```
  Expected: desktop Chromium + Pixel 7 PASS. If Chromium is unavailable, record that limitation and use an available browser QA route; do not claim Playwright passed.

- [ ] **Step 3: Search final diff for protected behavior**

  Verify no intentional edits to:
  - tax calculation functions/data;
  - budget calculation functions/data;
  - Hourly calculation/handoff functions;
  - Platform formatting/caret functions except copy/metadata/trust sections;
  - APK binary/update config;
  - sponsorship routing/config.

- [ ] **Step 4: Browser/mobile QA matrix**

  Check Home + all five calculators + `/app/` + 404 on a mobile viewport and desktop viewport:
  - titles/H1 visible and unique;
  - calculator remains prominent;
  - dark/light where present;
  - navigation/anchors;
  - reverse modes;
  - calculator-to-calculator handoff;
  - share;
  - PNG/PDF/CSV where applicable;
  - no overflow or clipped content;
  - source/FAQ links usable.

- [ ] **Step 5: Validate technical SEO**

  Verify final HTML source for self-canonicals, robots directives, sitemap entries and JSON-LD syntax. Use a live structured-data validator after deployment for rich-result eligibility rather than claiming eligibility from local syntax alone.

- [ ] **Step 6: Review branch diff**

  ```bash
  git diff origin/main...HEAD --stat
  git diff origin/main...HEAD
  ```
  Expected: only approved SEO/docs/tests/assets changes.

- [ ] **Step 7: Commit any review-only fixes separately**

  If QA finds a regression, make the smallest targeted fix with its own test and commit. Do not fold unrelated cleanup into this branch.

---

### Task 8: Pull Request, Merge Gate and Post-Deploy SEO Verification

**Files:** none unless review requests changes.

**Interfaces:**
- Consumes: reviewed branch with passing evidence.
- Produces: one reviewable PR and a post-deploy verification record.

- [ ] **Step 1: Push one branch and open one PR**

  PR title direction: `SEO growth v1: clarify calculator search intent and trust`

  PR body must include:
  - base SHA;
  - exact changed-page list;
  - protected behaviors;
  - automated test results;
  - browser/mobile QA results;
  - authoritative Platform/Tax sources reviewed;
  - known deferred items such as `og:image` if not production-ready.

- [ ] **Step 2: Do not merge immediately**

  Perform final whole-PR diff review and confirm no old redesign changes entered the branch.

- [ ] **Step 3: Physical Android spot check where useful**

  Verify the live/preview site on the user’s physical Android phone for Home, Budget, Hourly, Platform and Tax at minimum. This is a release gate for obvious mobile regressions, not a replacement for automated tests.

- [ ] **Step 4: Merge only after approval**

  Merge only after the user approves the PR/review evidence.

- [ ] **Step 5: Live verification**

  After deployment, verify:
  - live source has intended titles/H1/canonicals;
  - calculators still calculate correctly;
  - handoffs/export/share work;
  - `/app/` still reports exact release facts;
  - sitemap serves the expected URLs;
  - no accidental `noindex` or broken source links.

- [ ] **Step 6: Search Console follow-up**

  Resubmit the main sitemap / request recrawl for priority URLs where appropriate. Record the deployment date and use it as the comparison point for weekly GSC reviews.

- [ ] **Step 7: Weekly measurement**

  Compare US calculator clicks/impressions, target-query positions and CTR at roughly 7-day intervals. Do not repeatedly rewrite titles based on a few days of noise.

---

## Separate Follow-Up Plan: Blog Publishing / Distribution

This website-repository plan intentionally does **not** implement Blogger articles or outreach. After the core website PR is live and verified, create a separate plan for:
- the first 6–8 articles from the approved cluster;
- authoritative-source review for platform/tax guides;
- calculator ↔ blog internal-link updates;
- indexing checks;
- non-spam distribution/outreach;
- weekly GSC evaluation.

This separation keeps the website code release independently testable and prevents a Blogger/content workflow from blocking calculator SEO fixes.

## Self-Review Result

- Spec coverage: page ownership, metadata, P0 trust fixes, Budget quick win, Home/Hourly separation, Platform/Tax depth, Income Goal, app, sitemap, 404, social metadata, internal links, QA and measurement are assigned to tasks.
- Protected behavior: existing deterministic budget/tax/app tests and Platform Playwright coverage are explicitly retained.
- Scope: blog publishing is separated as an independent subsystem rather than mixed into the GitHub code release.
- Risk handling: volatile Platform/Tax facts require authoritative verification at implementation time; calculation bugs discovered during SEO work must stop and become separate targeted fixes.
- Plan proportion: tasks specify decisions/tests/commands without transcribing the site implementation.
