'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {test} = require('node:test');
const html = fs.readFileSync(new URL('../hourly-rate-calculator.html', `file://${__filename}`), 'utf8');
const context = vm.createContext({});
vm.runInContext(html.slice(html.indexOf('/* VALIDATION */'), html.indexOf('/* EXPENSE CHIPS */')), context);
const parse = (raw, field) => context.parseHourlyNumber(raw, context.HRC_INPUT_CONTRACTS[field]);

test('hourly money grammar preserves equivalent grouped and ungrouped dollars and cents', () => {
  for (const field of ['rate', 'target', 'expenses']) {
    for (const [raw, expected] of [['1500',1500],['1,500',1500],['1500.50',1500.5],['1,500.50',1500.5],['0.50',.5],['1000.00',1000],['1000.',1000],['.50',.5]]) {
      assert.equal(parse(raw, field), expected, `${field}: ${raw}`);
    }
  }
});
test('hourly money grammar rejects malformed separators and noncurrency representations', () => {
  for (const field of ['rate','target','expenses']) for (const raw of ['1,50','15,00','1..50','1,000.5.0','-1','+1','1e3','Infinity','NaN','1000 dollars','$1,000','1 000','0x10','1.005','.']) {
    assert.equal(parse(raw, field), null, `${field}: ${raw}`);
  }
});
test('hourly required money and optional expenses have explicit empty and range contracts', () => {
  for (const field of ['rate','target']) {
    for (const raw of ['', ' ', '0', '0.00','1000000000.01']) assert.equal(parse(raw,field),null,`${field}: ${raw}`);
    assert.equal(parse('1000000000',field),1e9);
  }
  assert.equal(parse('', 'expenses'),0);
  assert.equal(parse('0', 'expenses'),0);
  assert.equal(parse('999,999.00', 'expenses'),999999);
  assert.equal(parse('1,000,000', 'expenses'),null);
});
test('hourly schedules and percentages keep separate decimal and separator policies', () => {
  for (const field of ['hpd','hpdR','dpw','dpwR','wpy','wpyR','billable','billableR','billableRTxt']) {
    assert.equal(parse('1.5',field),1.5);
    for (const raw of ['', '0','-1','1,000','2x','Infinity']) assert.equal(parse(raw,field),null,`${field}: ${raw}`);
  }
  for (const field of ['hpd','hpdR']) {assert.equal(parse('24',field),24);assert.equal(parse('24.1',field),null);}
  for (const field of ['dpw','dpwR']) {assert.equal(parse('7',field),7);assert.equal(parse('7.1',field),null);}
  for (const field of ['wpy','wpyR']) {assert.equal(parse('52',field),52);assert.equal(parse('52.1',field),null);}
  assert.equal(parse('69.5','billable'),69.5);
  assert.equal(parse('100.1','billableR'),null);
});
test('hourly custom tax accepts zero and valid decimals but never truncates bad text', () => {
  for (const field of ['taxRate','revTaxRate','fwdCustomTaxPct','revCustomTaxPct']) {
    for (const [raw,n] of [['0',0],['25.5',25.5],['99',99]]) assert.equal(parse(raw,field),n);
    for (const raw of ['', '-1','99.1','25,5','25x','Infinity']) assert.equal(parse(raw,field),null);
  }
});
test('hourly derived currency guard rejects nonfinite and precision-unsafe results', () => {
  assert.equal(context.hourlyAmountsAreSafe([0,1e13,2016672]),true);
  for(const value of [Infinity,NaN,1e14])assert.equal(context.hourlyAmountsAreSafe([value]),false);
});
