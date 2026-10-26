# Platform Fee Calculator remediation — October 26, 2026

Base: `b23a0e034e4fb14e57e4ea0c4172e8d9c104e0c1` (audit baseline and remote main when work began).
Branch: `fix/platform-fee-comprehensive-audit-remediation`.
The original checkout was clean. The supplied archive's 44 SHA-256/size entries matched.
No production deployment, Pages/domain setting, analytics, article, or other calculator source was changed.
Audit evidence and generated reports remain outside the public checkout.

## Financial policies and root causes

USD transaction/fixed-fee inputs support zero through $100,000,000 inclusive, at most two decimals,
optional leading dollar sign and valid US thousands grouping. Blank transactions remain invalid while
editing and become explicit zero on blur. Negative/exponent/malformed/overprecision input is rejected,
not repaired. Comma decimal notation is no longer supported. Annual profile inputs retain the existing
whole-dollar rounding policy. Rates accept up to four decimal places in percentage units; aggregate
fee percentages must be strictly below 99%. Invalid or unachievable states invalidate both public result
objects and block copy, all three exports and handoff. Restoring valid input recovers immediately.

Fees use integer cents and integer millionth-rate units with decimal half-up rounding of each component.
The fixed processor fee is added to its percentage component; withdrawal remains capped at available
payout. When non-withdrawal fees exceed gross, the scenario is explicitly invalid; we do not invent a
provider debt policy or present a zero payout as a reconciled ledger.

Separate rounded fees and Smart reserve components are nonmonotonic at cents. Reverse inversion scans
the entire conservative rounding-error interval around the continuous inverse. Four fee components
contribute at most 2 cents of rounding error, and three reserve components at most 1.5 cents. The
8-cent envelope divided by the continuous retention slope covers these errors (and floating arithmetic
at the supported cap); scanning starts below its lower bound, not at a binary-search candidate.
Zero targets are handled separately. Work is bounded at 200,000 candidates and $100m gross. A quote
outside those bounds fails explicitly. There is no unconditional guarantee for unsupported inputs.

Manual transaction reserves use integer-cent percentage arithmetic. Smart transaction allocations use
rational integer rounding of each annual tax component / annual profit ratio. The annual simplified
2026 model otherwise remains intact, with ordinary SE gated at **$400 net SE earnings**, after the
92.35% adjustment. The audit's IRS Topic 554 / SE-tax references and existing Tax Estimator gate agree.
A fresh request to https://www.irs.gov/taxtopics/tc554 was blocked by the environment's egress proxy;
this task does not claim a fresh authoritative-page retrieval or form-level filing validation.

Smart still applies a profit-based effective reserve rate to the fee-adjusted payout. It does not
allocate operating expenses to individual cash receipts. This convention is now explicit in setup
and exports; it can reserve more than modeled annual tax when applied to gross receipts. QBI, credits,
other/spouse wages and income, withholding and payment safe harbors remain excluded. Flat state layers
are planning assumptions. Manual export profile fields are marked as unused by the manual reserve.

## Issue coverage matrix

Source paths below are relative to the checkout. P1/P2 priorities follow Report 01.
`M` = tests/platform-fee-model.test.js; `B` = tests/platform-fee-remediation.playwright.js;
`C` = tests/platform-fee-caret.playwright.js.
All implementation changes are in platform-fee-calculator.html; shared toolkit and destination
calculator source remain unchanged.

| ID | Priority | Root cause / function and reproduction | Correction | Regression / final status |
|---|---|---|---|---|
| S1 | P1 | calc returned at 99% with old positive __pfcResult (98.9% → 99%) | Central validation/invalidation; every financial action revalidates | B S1/X3 + aggregate exact-99 check: FIXED AND VERIFIED |
| S2 | P1 | applyPlatformToolkitAutofill accepted its own $900 payout as fresh gross | Accept only hourly_rate + gross; apply same rule to legacy origin, honor consumed stamp; pageshow refresh | B own-source, actual return/reload, Hourly chain: FIXED AND VERIFIED |
| S3 | P2 | save used truthiness for 0%/$0 processor and zero amounts | Explicit finite/default handling; retain raw transaction state | B zero fees/payment reload: FIXED AND VERIFIED |
| S4 | P1 | updateComp/export builder omitted Custom and substituted zero baseline | One comparison builder includes real current Custom, with signed differences and ties; unsupported rows omitted | B Custom 0/10/12/20, forward/reverse/manual + add-ons, actual export current row: FIXED AND VERIFIED |
| S5 | P1 recurring | import period/calendar lived only in memory and disappeared on refresh | Persist typed import context without reapplying amount; show period near outgoing action and restored banner | B project/week/month/year, reload, actual Hourly→Platform→Tax→Back, expenses preserved: FIXED AND VERIFIED |
| S6 | P2 | normalizer stripped minus/exponent/junk or truncated cents | Validate grammar/range before normalization; preserve invalid text; grouping edits retain caret intent | M grammar; B invalid input/annual/custom reserve; C: FIXED AND VERIFIED |
| S7 | P2 | clickable divs, unnamed hidden checkboxes/inputs | Native buttons, pressed states, named visible native checkboxes/inputs/selects, focus outlines, alert errors | B keyboard workflow, C desktop/mobile: FIXED — VERIFICATION LIMITED (no screen reader / WCAG certification) |
| S8 | P2 | goNextPlatform used nonexistent toast on zero payout | Correct showToast helper, revalidate before navigation | B zero Next, no page errors: FIXED AND VERIFIED |
| S9 / F3 | P2 | calcSelfEmploymentTax2026 taxed every positive profit | Apply ordinary minimum to adjusted net earnings; preserve wage cap and Additional Medicare | M three filing statuses, below/above gate, high-income Additional Medicare: FIXED — VERIFICATION LIMITED (fresh IRS retrieval blocked) |
| S10 / F5 | P2 | computeClientScenario floored payout while fees exceeded gross | Explicit deficit/invalid scenario; block financial actions, no fabricated reconciliation | M deficit, B fixed-fee invalid/recovery: FIXED AND VERIFIED |
| S11 | P1 | blur restored $1,000 without calc, copy recomputed a conflicting value | Explicit zero-on-blank-blur policy in both modes, recalculation and persistence | B invalid/blank/reload, copy boundary: FIXED AND VERIFIED |
| F1 | P2 | cent payout is nonmonotonic; binary search skipped earlier feasible quotes | Exhaustive bounded rounding-envelope inversion, real payout/target check | M 10k before-tax + 8k manual + 4k Smart oracle minima: FIXED AND VERIFIED within documented bounds |
| F2 | P2 | binary multiplication rounded half cents inconsistently | Integer percentage fee/manual reserve arithmetic; rational Smart transaction allocation | M 1m forward grid; .35 at 10% now .04 fee/.31 keep; reverse sweeps: FIXED AND VERIFIED for tested monetary operations |
| F4 | P2 | merge order overwrote missing-profile solvable:false | Return explicit failure with setup-needed flag; central gate blocks false success | M missing profile; B setup recovery: FIXED AND VERIFIED |
| F6 | P2 boundary | solver failure ignored; retainedBeforeTax fabricated from target | Limit inputs/quotes, preserve actual achieved payout, stop invalid result construction | M max/above-max, B failed/successful large quote: FIXED AND VERIFIED |
| X1 | P2 | reverse PNG used target/gross for green and separately added reserve | Use canonical after-reserve keep share for geometry and legend | B real reverse-preview/manual/Smart PNG captures sum to 100% within printed rounding: FIXED AND VERIFIED |
| X2 | P2 | downloadPDF stitched reports into one tall raster page | Fit complete report sheets onto separate numbered A4 pages; wrap long assumptions without horizontal clipping | B actual files/pdf-lib geometry; Poppler render visually inspected: FIXED AND VERIFIED (raster content; physical printer untested) |
| X3 | P1 | report recomputation bypassed validation and used zero Custom snapshots | Gate every export; use shared current comparison data | B invalid-download prevention and 12 actual PNG/PDF files across four states: FIXED AND VERIFIED |
| C-Toptal / comparison labels | P1 labeling | Best-platform/client-savings claims treated talent-rate deductions as client invoices | Remove universal recommendation banner; frame modeled gross/keep and explain separate client pricing; rate caveats visible and exported | B exported text/current baseline plus source review: FIXED AND VERIFIED for reviewed surfaces; no new platform schedules asserted |
| Minor labels | P3 | Wrong >=99 wording; imported label without import; manual profile looked operative | Strict less-than-99 wording; current-gross label; manual profile marked unused; explicit period | B current states/exports: FIXED AND VERIFIED |
| Smart expense allocation, QBI/state/profile exclusions | Model | Profit-based reserve applied to payout is not a complete tax return or per-receipt expense allocation | Preserve methodology, disclose basis/exclusions beside setup and in exports | M Smart minima; B Smart export: DOCUMENTED MODEL LIMITATION |
| Legacy context, editing, Reset/Clean Slate | Policy | Old saved states have no reliable source period | Missing legacy context defaults explicitly to project; editing either amount or amount presets clears imported period; Reset and Clean Slate clear it too | B context/recovery: FIXED AND VERIFIED; unknown old calendar is never inferred |
| Preset schedules / processing basis | Model | Flat illustrative schedules omit tiers/minima/client costs; some rates unverified | Preserve editable presets; immediate and exported warnings, no universal rate or marketplace recommendation | DOCUMENTED MODEL LIMITATION; no pricing research/API introduced |

## Concrete financial changes

- $1,000 at 10% still retains $900; at 20% still retains $800.
- $1,000.55 at 10% still retains $900.49; its reverse target still quotes $1,111.72.
- $1,000 before-tax target at 10% still quotes $1,111.11; at 20%, $1,250.
- $1,000 after-reserve target with 10% and manual 25% still quotes $1,481.48.
- $0.35 at 10% now deducts $0.04 and retains $0.31 (previously .03/.32).
- Custom 12%, $1,000 gross now compares Upwork +$20 versus $880 current (previously +$900).
- Audit examples .42 before tax / .62 manual after reserve / .79 Smart after reserve are covered
  by exhaustive minimum sweeps using the new rounding policy; source/oracle counts are not browser counts.

## Reproduction and validation

Use Node 24 and the temporary CI-pinned dependencies from .github/workflows/pr-validation.yml.
No runtime package dependency was added to the site.

```bash
node --test tests/*.test.js
# NODE_PATH points to external test node_modules; browser executable can be overridden.
node tests/platform-fee-remediation.playwright.js
# Start a static server on 127.0.0.1:4173 before the caret test.
node tests/platform-fee-caret.playwright.js
node tests/hourly-rate.playwright.js
node tests/tax-estimator.playwright.js
node tests/income-goal-planner.playwright.js
```

Browser suites need export-library/artifact variables configured as in CI. The Platform suite uses
NODE_PATH (or PFC_EXPORT_LIB_DIR) for html2canvas/jsPDF and PFC_ARTIFACT_DIR for evidence; default is
/tmp/usafc-platform-evidence. Browser dependencies are pinned to Playwright 1.62.1,
html2canvas 1.4.1, jsPDF 2.5.1, html2pdf.js 0.10.1 and pdf-lib 1.17.1.
CI now runs both Platform suites and retains their logs/files with the existing artifact upload.

Current verification: 70 Node tests passed, zero failures/skips (61 existing + 9 new). Within the
new tests: 1,000,000 forward, 10,000 before-tax, 8,000 manual and 4,000 Smart inverse oracle cases,
all with zero failures. The Platform browser suite passed 21 cases, zero failures/skips, including
12 genuine export downloads. Caret suite passed desktop Chromium and Pixel 7 profiles. Tax suite
passed 45; Income Goal suite passed 20. Hourly suite passed 61. All suites completed with zero failures/skips.

Browser: Chromium 154.0.8037.57, Debian Linux, Playwright 1.62.1. Viewports: 1366×768,
390×844 and 360×800. Light/dark layout/overflow and keyboard workflows checked; actual
PDF/PNG generation exercised for forward Custom, reverse preview, reverse manual and reverse Smart.
All generated PDFs have two A4 pages, verified with pdf-lib; representative output was also decoded
with pdfinfo/Poppler and visually inspected. These are local tests, not production or physical-device QA.

Not verified: Firefox/WebKit, physical Android/iPhone keyboards/download sheets, screen readers,
physical printer behavior, tagged/selectable PDF text, exhaustive providers' policies, private-mode
storage failures, new-cloud-instance reproduction, production deployment. Worst-case high-rate inverse
search and scaling of unusually long reports deserve independent review. No claim of global US tax
liability correctness or actual marketplace billing equivalence is made.

## Independent review and release gate

Review the monetary policy and rounding-envelope derivation; rerun all commands above. Inspect the
new matrix against the original reports, actual reverse-preview charts, both A4 report pages, and
monthly handoff while keeping pre-existing Tax Estimator expenses. Check high-rate solver latency,
legacy session restoration and accessible name/focus behavior with assistive technology.

Branch changes are intended for an unmerged Draft PR. **Do not merge or deploy without the owner’s
approval.** API/network access limitations and the final push/PR outcome are recorded in the delivery
report; this document does not assert that a remote PR exists.
