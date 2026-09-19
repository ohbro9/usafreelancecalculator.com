#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(new URL('../budget-planner.html', `file://${__filename}`), 'utf8');

function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} is present`);
  const bodyStart = html.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < html.length; i += 1) {
    if (html[i] === '{') depth += 1;
    if (html[i] === '}') depth -= 1;
    if (depth === 0) return html.slice(start, i + 1);
  }
  throw new Error(`could not extract ${name}`);
}

const taxDataStart = html.indexOf('const PLANNER_FILING_LABELS');
const taxDataEnd = html.indexOf('function clampTaxPct');
assert.ok(taxDataStart >= 0 && taxDataEnd > taxDataStart, '2026 tax data block is present');

const context = {
  console,
  window: {},
  document: { querySelectorAll() { return []; } },
  taxMode: 'smart',
  manualTaxPct: 30,
  smartTaxBreakdown: null,
  filingStatus: 'single',
  taxRegion: 'federal_only'
};
vm.createContext(context);
vm.runInContext(`
function fmt(value) { return '$' + Number(value).toFixed(2); }
${html.slice(taxDataStart, taxDataEnd)}
${[
  'clampTaxPct', 'formatTaxPct', 'getManualTaxPct', 'calcProgressiveTax',
  'calcSelfEmploymentTax2026', 'calcFederalIncomeTax2026', 'getPlannerStateRate',
  'calcPlannerStateTax', 'calcSmartTaxReserve', 'getAppliedTaxModel',
  'normalizeIncomeToMonthly', 'roundToolkitMoney', 'normalizeBudgetToolkitPeriod',
  'getBudgetToolkitSourceLabel',
  'buildBudgetToolkitImport', 'clampRunway', 'getRunwayMonths',
  'getReserveCoverageMonths', 'getSectionRows', 'getTopDriver',
  'buildBudgetHealth', 'fmtPdfMoney', 'getPdfToneFromHealth',
  'buildBudgetPdfInsightModel'
].map(extractFunction).join('\n')}
globalThis.__budget = {
  TAX_2026, calcSelfEmploymentTax2026, calcSmartTaxReserve, getAppliedTaxModel,
  normalizeIncomeToMonthly, buildBudgetToolkitImport, getRunwayMonths,
  getReserveCoverageMonths, buildBudgetHealth, buildBudgetPdfInsightModel,
  setTaxMode(value, pct) { taxMode = value; manualTaxPct = pct; }
};`, context);
const budget = context.__budget;
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 0.005, `${message}: ${actual} !== ${expected}`);

// Published 2026 IRS/SSA inputs: Rev. Proc. 2025-32 and SSA's 2026 contribution base.
assert.deepEqual(Array.from(budget.TAX_2026.standardDeduction ? Object.values(budget.TAX_2026.standardDeduction) : []), [16100, 32200, 24150]);
assert.equal(budget.TAX_2026.brackets.single[0][0], 12400);
assert.equal(budget.TAX_2026.brackets.single[5][0], 640600);
assert.equal(budget.TAX_2026.socialSecurityWageBase, 184500);
assert.equal(budget.TAX_2026.seBaseFactor, 0.9235);
assert.deepEqual(Array.from(Object.values(budget.TAX_2026.additionalMedicareThreshold)), [200000, 250000, 200000]);

// Half-SE deduction excludes Additional Medicare Tax and business costs reduce profit once.
let se = budget.calcSelfEmploymentTax2026(100000, 'single');
near(se.seBase, 92350, 'Schedule SE base');
near(se.deductibleHalf, (92350 * (0.124 + 0.029)) / 2, 'deductible half of regular SE tax');
se = budget.calcSelfEmploymentTax2026(300000, 'single');
assert.ok(se.additionalMedicareTax > 0);
near(se.deductibleHalf, (se.ssTax + se.medicareTax) / 2, 'Additional Medicare is not deductible half-SE tax');
const smart = budget.calcSmartTaxReserve(10000, 1000, 500, 'single', 'federal_only');
assert.equal(smart.breakdown.annualGross, 120000);
assert.equal(smart.breakdown.annualBusinessExpenses, 18000);
assert.equal(smart.breakdown.annualNetProfit, 102000);
near(smart.monthlyTax * 12, smart.annualTax, 'monthly/annual smart tax parity');
near(smart.quarterlyTax * 4, smart.annualTax, 'quarterly/annual smart tax parity');

// Monthly is the canonical base; repeated view round-trips do not compound conversion.
let monthly = budget.normalizeIncomeToMonthly(5000, 'monthly');
for (let i = 0; i < 5; i += 1) {
  const annualDisplay = monthly * 12;
  monthly = budget.normalizeIncomeToMonthly(annualDisplay, 'annual');
}
assert.equal(monthly, 5000);
assert.equal(monthly * 12, 60000);

// Manual modes replace (rather than retain) the smart result.
budget.setTaxMode('25', 30);
near(budget.getAppliedTaxModel(5000, 500, 250).monthlyTax, 1250, '25% manual reserve');
budget.setTaxMode('30', 25);
near(budget.getAppliedTaxModel(5000, 500, 250).monthlyTax, 1500, '30% manual reserve');
budget.setTaxMode('35', 30);
near(budget.getAppliedTaxModel(5000, 500, 250).monthlyTax, 1750, '35% manual reserve');
budget.setTaxMode('custom', 27.5);
near(budget.getAppliedTaxModel(5000, 500, 250).monthlyTax, 1375, 'custom manual reserve');
budget.setTaxMode('smart', 27.5);
assert.equal(budget.getAppliedTaxModel(5000, 500, 250).mode, 'smart');

// Positive coverage uses outflow; deficit runway uses only the monthly deficit.
near(budget.getRunwayMonths(12000, 4000, 1000), 3, 'positive cash-flow coverage');
near(budget.getRunwayMonths(12000, 6000, -1000), 12, 'negative cash-flow burn runway');
near(budget.getReserveCoverageMonths(12000, 6000), 2, 'deficit expense coverage');
assert.equal(budget.getRunwayMonths(0, 0, 0), 0);
assert.ok(Number.isFinite(budget.getRunwayMonths(5000, 0, 0)));

// Reserve health and advice stay outflow-based even when deficit runway is longer.
const deficitHealth = budget.buildBudgetHealth(5000, 2000, 1000, 1500, 1500, 12000, 6000, -1000, { mode: 'smart' });
near(deficitHealth.reserveMonths, 2, 'health expense coverage');
assert.equal(deficitHealth.status, 'risk');
const deficitAdvice = budget.buildBudgetPdfInsightModel(
  deficitHealth, 5000, 2000, 1000, 1500, 1500, 12000, 6000, -1000, { mode: 'smart' }
);
assert.equal(deficitAdvice.chips[3].label, 'Reserve 2.0 mo');
assert.equal(deficitAdvice.chips[3].cls, 'risk');
assert.ok(deficitAdvice.tips.some(tip => tip.msg === 'Add $6,000 to reach a 3-month reserve floor.'));
assert.equal(6000 * 3, 18000, '3-month reserve target stays outflow-based');

// Positive cash flow continues to use normal expense coverage for both displays and advice.
near(budget.getRunwayMonths(12000, 4000, 1000), budget.getReserveCoverageMonths(12000, 4000), 'positive runway parity');

// Income Goal handoffs normalize annual and monthly amounts to the same monthly base.
const annualImport = budget.buildBudgetToolkitImport({
  updatedAt: 1, sourceTool: 'income_goal', handoff: { amount: 60000, period: 'year', label: 'Gross' },
  normalized: { annualGross: 60000 }, assumptions: { budgetView: 'annual' }
});
const monthlyImport = budget.buildBudgetToolkitImport({
  updatedAt: 2, sourceTool: 'income_goal', handoff: { amount: 5000, period: 'month', label: 'Gross' },
  normalized: { monthlyGross: 5000 }, assumptions: { budgetView: 'monthly' }
});
assert.deepEqual([annualImport.monthlyBase, annualImport.annualGross, annualImport.budgetView], [5000, 60000, 'annual']);
assert.deepEqual([monthlyImport.monthlyBase, monthlyImport.annualGross, monthlyImport.budgetView], [5000, 60000, 'monthly']);

// Guard the shared data-flow contracts used by persistence and every export.
assert.match(html, /incomeMonthlyBase:\s*parseIncome\('income'\)/);
assert.match(html, /incEl\.value = hasIncomeValue \? formatIncomeForView\(monthlyBase, viewMode\)/);
assert.match(html, /const outflow = personal \+ business \+ taxAmt;\s*const net = income - outflow;/);
assert.match(html, /const mult = viewMode === 'annual' \? 12 : 1;/);
for (const fn of ['copySummary', 'buildBudgetPdfData', 'buildBudgetPngData', 'exportCSV']) {
  assert.match(extractFunction(fn), /getBudgetSnapshot\(\)/, `${fn} uses the live canonical snapshot`);
}
assert.match(html, /excludes QBI, credits, itemized deductions, other income, withholding, and prior payments/i);

console.log('budget-planner deterministic regression tests: PASS');
