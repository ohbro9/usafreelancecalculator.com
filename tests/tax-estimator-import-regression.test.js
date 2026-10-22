'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {test} = require('node:test');

const html = fs.readFileSync(new URL('../tax-estimator.html', `file://${__filename}`), 'utf8');
// Exercise the real import helpers without a DOM or a second implementation.
const context = vm.createContext({});
vm.runInContext(
  html.slice(html.indexOf('let _sntPeriod ='), html.indexOf('function goNextTool()')) +
  html.slice(html.indexOf('function _srcName('), html.indexOf('function collectState()')), context);
const meta = context.buildToolkitImportMeta;
const annual = context.getSharedAnnualizedAmount;
function shared(period, kind = 'gross', assumptions = {}) {
  return {
    sourceTool: 'platform_fee',
    handoff: {amount: kind === 'gross' ? 60000 : 48000, period, kind, label: kind === 'gross' ? 'Client Pays' : 'You Receive (pre-tax)'},
    normalized: {annualGross: 999999, annualPreTaxAfterFees: 888888},
    assumptions,
  };
}

test('platform project/custom imports ignore stale normalized gross and net amounts', () => {
  for (const period of ['project', 'custom']) for (const kind of ['gross', 'pre_tax_after_fees']) {
    const input = shared(period, kind), result = meta(input);
    assert.equal(result.amount, input.handoff.amount, `${period} ${kind}`);
    assert.equal(result.incomeMode, 'annual');
    assert.match(result.bannerText, /Review the period/);
    assert.doesNotMatch(result.bannerText, /999,999|888,888|annualized/);
  }
});
test('platform supported time periods use the current amount and work calendar', () => {
  for (const kind of ['gross', 'pre_tax_after_fees']) {
    for (const [period, multiplier, mode] of [['year', 1, 'annual'], ['month', 1, 'monthly'], ['week', 48, 'annual'], ['day', 240, 'annual']]) {
      const input = shared(period, kind, {weeksPerYear: 48, daysPerWeek: 5});
      const result = meta(input);
      assert.equal(result.amount, input.handoff.amount * multiplier, `${period} ${kind}`);
      assert.equal(result.incomeMode, mode);
      assert.doesNotMatch(result.bannerText, /999,999|888,888/);
    }
  }
});
test('platform annualization rejects missing, malformed, nonfinite and out-of-range weeks', () => {
  for (const value of [undefined, null, '', ' ', 0, -1, 54, Infinity, NaN, true, [], {}, '48weeks', 'Infinity', '0x30']) {
    for (const period of ['week', 'day']) {
      const input = shared(period, 'pre_tax_after_fees', {weeksPerYear: value, daysPerWeek: 5});
      assert.equal(annual(input), 0, `${period}: ${String(value)}`);
      assert.equal(meta(input).amount, 48000);
      assert.match(meta(input).bannerText, /Review the period/);
      assert.match(meta(input).bannerText, /No annual conversion was applied/);
      assert.doesNotMatch(meta(input).bannerText, /annualized/);
    }
  }
});
test('platform daily annualization requires valid days as well as weeks', () => {
  for (const value of [undefined, null, '', 0, -1, 8, Infinity, NaN, true, '5days', '0x5']) {
    const input = shared('day', 'gross', {weeksPerYear: 48, daysPerWeek: value});
    assert.equal(annual(input), 0, String(value));
    assert.equal(meta(input).amount, 60000);
    assert.match(meta(input).bannerText, /Review the period/);
  }
});
test('platform calendar accepts decimal strings, partial workweeks and calendar bounds', () => {
  assert.equal(annual(shared('week', 'gross', {weeksPerYear: '48'})), 2880000);
  assert.equal(annual(shared('day', 'gross', {weeksPerYear: 52.5, daysPerWeek: '4.5'})), 14175000);
  assert.equal(annual(shared('day', 'gross', {weeksPerYear: 53, daysPerWeek: 7})), 22260000);
  const cents = shared('week', 'gross', {weeksPerYear: 48});
  cents.handoff.amount = 250.25;
  assert.equal(annual(cents), 12012);
});
test('platform source aliases use the same current-handoff rules', () => {
  for (const source of [{sourceTool: 'platform'}, {source: 'platform'}, {sourceTool: 'platform_fee'}]) {
    const input = {...shared('project'), sourceTool: undefined, ...source};
    assert.equal(meta(input).amount, 60000);
  }
});
test('non-platform import metadata retains existing normalized annualization behavior', () => {
  for (const sourceTool of ['hourly_rate', 'income_goal', 'budget_planner']) {
    const input = {...shared('week', 'gross', {weeksPerYear: 48}), sourceTool};
    assert.equal(meta(input).amount, 999999, sourceTool);
    input.handoff.kind = 'pre_tax_after_fees';
    assert.equal(meta(input).amount, 888888, sourceTool);
  }
  assert.equal(meta({...shared('month'), sourceTool: 'hourly_rate'}).incomeMode, 'monthly');
});
