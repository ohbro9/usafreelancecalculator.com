#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(new URL('../tax-estimator.html', `file://${__filename}`), 'utf8');
const start = html.indexOf('// ─── TAX DATA');
const end = html.indexOf('// ─── APP STATE');
assert.ok(start >= 0 && end > start, 'tax calculation source region is present');

const names = [
  'TAX', 'getSALTLimit', 'getItemizedDeduction', 'getUsedDeduction',
  'getMedicalDeduction', 'getCreditPhaseoutThreshold', 'getDependentCreditBreakdown', 'applyDependentCreditPhaseout',
  'getACTCEstimate', 'getDependentTaxCredits', 'getQBIThresholds', 'getQBIBase',
  'getQBILimitFromWagesAndUbia', 'getQBIDeduction',
  'getW2PayrollTax', 'getAdditionalMedicareTax', 'getQuarterlyPlan',
];
function extractFunction(name) {
  const functionStart = html.indexOf(`function ${name}(`);
  assert.ok(functionStart >= 0, `${name} is present`);
  const bodyStart = html.indexOf('{', functionStart);
  let depth = 0;
  for (let i = bodyStart; i < html.length; i += 1) {
    if (html[i] === '{') depth += 1;
    if (html[i] === '}') depth -= 1;
    if (depth === 0) return html.slice(functionStart, i + 1);
  }
  throw new Error(`could not extract ${name}`);
}
const context = { console };
vm.createContext(context);
const laterFunctions = names.filter(name => name !== 'TAX' && html.indexOf(`function ${name}(`) > end);
vm.runInContext(`${html.slice(start, end)}\n${laterFunctions.map(extractFunction).join('\n')}\nglobalThis.__tax = { ${names.join(', ')} };`, context);
const tax = context.__tax;
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 0.005, `${message}: ${actual} !== ${expected}`);

// 2025 single and 2026 MFJ: standard-vs-itemized choice plus SALT cap/phase-down.
assert.equal(tax.getSALTLimit(2025, 'single', 500000), 40000);
assert.equal(tax.getSALTLimit(2025, 'mfj', 550000), 25000);
assert.equal(tax.getSALTLimit(2025, 'single', 700000), 10000);
assert.equal(tax.getSALTLimit(2026, 'mfj', 505000), 40400);
assert.equal(tax.getSALTLimit(2026, 'single', 520000), 35900);
const itemized = tax.getItemizedDeduction({ year: 2025, status: 'single', saltPaid: 50000, mortgageInterest: 9000, charity: 2000, medicalPaid: 10000, agiProxy: 100000 });
assert.equal(itemized.itemizedTotal, 53500);
let deduction = tax.getUsedDeduction({ itemizedOn: true, standardDeduction: 15750, itemizedTotal: itemized.itemizedTotal });
assert.deepEqual([deduction.usedDeduction, deduction.usedDeductionMode], [53500, 'itemized']);
deduction = tax.getUsedDeduction({ itemizedOn: false, standardDeduction: 32200, itemizedTotal: 50000 });
assert.deepEqual([deduction.usedDeduction, deduction.usedDeductionMode], [32200, 'standard']);

// CTC-only, ODC-only, mixed, and refundable ACTC. ODC can never enter ACTC.
let credits = tax.getDependentTaxCredits({ year: 2025, status: 'single', totalDependents: 1, otherDependents: 0, phaseoutBase: 60000, federalBeforeCredits: 3000, earnedIncome: 40000 });
assert.deepEqual([credits.nonrefundableCTC, credits.odc, credits.actcEstimate, credits.federalTaxAfterCredits], [2200, 0, 0, 800]);
credits = tax.getDependentTaxCredits({ year: 2026, status: 'single', totalDependents: 1, otherDependents: 1, phaseoutBase: 60000, federalBeforeCredits: 0, earnedIncome: 40000 });
assert.deepEqual([credits.nonrefundableCTC, credits.odc, credits.actcEstimate, credits.federalTaxAfterCredits], [0, 0, 0, 0]);
credits = tax.getDependentTaxCredits({ year: 2026, status: 'mfj', totalDependents: 2, otherDependents: 1, phaseoutBase: 100000, federalBeforeCredits: 2500, earnedIncome: 50000 });
assert.deepEqual([credits.nonrefundableCTC, credits.odc, credits.actcEstimate], [2200, 300, 0]);
credits = tax.getDependentTaxCredits({ year: 2025, status: 'single', totalDependents: 1, otherDependents: 0, phaseoutBase: 30000, federalBeforeCredits: 200, earnedIncome: 20000 });
assert.deepEqual([credits.nonrefundableCTC, credits.odc, credits.actcEstimate, credits.federalTaxAfterCredits], [200, 0, 1700, -1700]);

// QBI: correct base reductions, taxable-income limit, and gradual wage/UBIA phase-in.
assert.equal(tax.getQBIBase({ netProfit: 100000, halfSE: 7065, retirementDeduction: 10000 }), 82935);
near(tax.getQBIDeduction({ year: 2025, status: 'single', businessType: 'general', qbiBase: 100000, taxableBeforeQBI: 150000, wages: 0, ubia: 0 }).deduction, 20000, 'below-threshold QBI');
near(tax.getQBIDeduction({ year: 2026, status: 'single', businessType: 'general', qbiBase: 200000, taxableBeforeQBI: 239250, wages: 40000, ubia: 0 }).deduction, 30000, 'phase-in QBI');
near(tax.getQBIDeduction({ year: 2026, status: 'single', businessType: 'general', qbiBase: 200000, taxableBeforeQBI: 300000, wages: 40000, ubia: 0 }).deduction, 20000, 'above-phase-in QBI');
const mfjQBI = tax.getQBIThresholds(2026, 'mfj');
assert.deepEqual([mfjQBI.threshold, mfjQBI.phaseRange], [403500, 150000]);

// Form 8959 combined wages/SE threshold and employee FICA included in take-home inputs.
near(tax.getAdditionalMedicareTax(190000, 30000, 'single'), 180, 'single combined Additional Medicare Tax');
near(tax.getAdditionalMedicareTax(240000, 30000, 'mfj'), 180, 'MFJ combined Additional Medicare Tax');
near(tax.getW2PayrollTax(100000, 0, tax.TAX[2025].SE.wageBase), 7650, 'W-2 employee FICA');

// The deductible half remains based on regular SE tax only; Additional Medicare is excluded.
const seBase = 100000 * tax.TAX[2025].SE.mult;
const regularSE = seBase * (tax.TAX[2025].SE.ss + tax.TAX[2025].SE.medicare);
near(regularSE / 2, 7064.775, 'half-SE-tax regression');
assert.ok(tax.getAdditionalMedicareTax(190000, 30000, 'single') > 0);

// Prior-year AGI—not current estimated AGI—selects the 100%/110% safe harbor.
let plan = tax.getQuarterlyPlan({ currentYearTax: 30000, withholding: 5000, priorYearTotalTax: 20000, priorYearAGI: 150000, status: 'single' });
assert.deepEqual([plan.priorYearMultiplier, plan.safeHarborAnnual, plan.annualTarget], [1, 20000, 15000]);
plan = tax.getQuarterlyPlan({ currentYearTax: 30000, withholding: 5000, priorYearTotalTax: 20000, priorYearAGI: 150001, status: 'single' });
assert.deepEqual([plan.priorYearMultiplier, plan.safeHarborAnnual, plan.annualTarget], [1.1, 22000, 17000]);

console.log('tax-estimator deterministic regression tests: PASS');
