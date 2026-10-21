#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

const html = fs.readFileSync(new URL('../tax-estimator.html', `file://${__filename}`), 'utf8');
const start = html.indexOf('// ─── TAX DATA');
const end = html.indexOf('// ─── APP STATE');
assert.ok(start >= 0 && end > start, 'tax calculation source region is present');

const names = [
  'TAX', 'getSALTLimit', 'getItemizedDeduction', 'getUsedDeduction',
  'getMedicalDeduction', 'getCreditPhaseoutThreshold', 'getDependentCreditBreakdown', 'applyDependentCreditPhaseout',
  'getACTCEstimate', 'getDependentTaxCredits', 'getQBIThresholds', 'getQBIBase',
  'getQBILimitFromWagesAndUbia', 'getQBIDeduction',
  'getW2PayrollTax', 'getAdditionalMedicareTax', 'getFederalEstimatedTaxLiability', 'getQuarterlyPlan',
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
credits = tax.getDependentTaxCredits({ year: 2025, status: 'single', totalDependents: 2, otherDependents: 1, phaseoutBase: 220000, federalBeforeCredits: 0, earnedIncome: 220000 });
assert.deepEqual([credits.phaseout.creditAfterPhaseout, credits.phaseout.phasedCTC, credits.phaseout.phasedODC, credits.actcEstimate], [1700, 1700, 0, 1700]);
credits = tax.getDependentTaxCredits({ year: 2025, status: 'single', totalDependents: 2, otherDependents: 1, phaseoutBase: 220000, federalBeforeCredits: 300, earnedIncome: 220000 });
assert.deepEqual([credits.phaseout.creditAfterPhaseout, credits.nonrefundableCTC, credits.odc, credits.actcEstimate, credits.federalTaxAfterCredits], [1700, 300, 0, 1400, 0]);
credits = tax.getDependentTaxCredits({ year: 2026, status: 'mfj', totalDependents: 2, otherDependents: 1, phaseoutBase: 100000, federalBeforeCredits: 2500, earnedIncome: 50000 });
assert.deepEqual([credits.nonrefundableCTC, credits.odc, credits.actcEstimate, credits.federalTaxAfterCredits], [2000, 500, 200, 0]);
credits = tax.getDependentTaxCredits({ year: 2025, status: 'single', totalDependents: 1, otherDependents: 0, phaseoutBase: 30000, federalBeforeCredits: 200, earnedIncome: 20000 });
assert.deepEqual([credits.nonrefundableCTC, credits.odc, credits.actcEstimate, credits.federalTaxAfterCredits], [200, 0, 1700, 0]);
assert.equal(credits.federalTaxAfterCredits - credits.actcEstimate, -1700, 'ACTC is tracked separately from nonnegative federal income tax');

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
assert.equal(tax.getFederalEstimatedTaxLiability({ federalIncomeTax: 10000, selfEmploymentTax: 3000, additionalMedicareTax: 180, niit: 0, refundableCredits: 500, w2PayrollTax: 7650 }), 12680, 'ordinary W-2 FICA is excluded from quarterly estimated tax');

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

function helper(name) {
  vm.runInContext(extractFunction(name), context);
  return vm.runInContext(name, context);
}

test('official 2025/2026 brackets keep Single, HoH and QBI boundaries distinct', () => {
  // Rev. Proc. 2024-40 section 2.01; 2025-32 sections 4.01, 4.13, 4.26.
  const endpoints = {
    2025: {single:[11925,48475,103350,197300,250525,626350],mfj:[23850,96950,206700,394600,501050,751600],hoh:[17000,64850,103350,197300,250500,626350]},
    2026: {single:[12400,50400,105700,201775,256225,640600],mfj:[24800,100800,211400,403550,512450,768700],hoh:[17700,67450,105700,201750,256200,640600]}
  };
  for (const year of [2025,2026]) for (const status of ['single','mfj','hoh']) {
    assert.equal(JSON.stringify(tax.TAX[year].brackets[status].slice(0,-1).map(row=>row[0])), JSON.stringify(endpoints[year][status]));
    assert.equal(JSON.stringify(tax.TAX[year].brackets[status].map(row=>row[1])),JSON.stringify([.10,.12,.22,.24,.32,.35,.37]));
  }
  assert.equal(JSON.stringify(tax.TAX[2025].stdDed),JSON.stringify({single:15750,mfj:31500,hoh:23625}));
  assert.equal(JSON.stringify(tax.TAX[2026].stdDed),JSON.stringify({single:16100,mfj:32200,hoh:24150}));
  assert.equal(tax.getQBIThresholds(2026,'single').threshold,201750);
  near(helper('marginalTax')(201775,tax.TAX[2026].brackets.single),41024,'Single bracket endpoint');
  near(helper('marginalTax')(201750,tax.TAX[2026].brackets.hoh),39207,'HoH bracket endpoint');
});
test('ordinary Schedule SE $400 threshold is on net earnings, not Schedule C profit', () => {
  // Schedule SE lines 4a/4c; ordinary method only, no church/farm optional methods.
  const calc=helper('getSelfEmploymentTax');
  for(const profit of [0,300,400,400/.9235-.0001]) assert.equal(calc(profit,0,0,'single',tax.TAX[2026].SE).seStandard,0);
  for(const profit of [400/.9235,400/.9235+.0001,100000]) {
    const r=calc(profit,0,0,'single',tax.TAX[2026].SE);
    near(r.seStandard,profit*.9235*.153,'SE at/above threshold');near(r.halfSE,r.seStandard/2,'deductible half');
  }
  assert.equal(calc(-100,0,0,'single',tax.TAX[2026].SE).seStandard,0);
});
test('SE Social Security uses owner wages; Medicare coordinates combined MFJ wages', () => {
  const calc=helper('getSelfEmploymentTax'), se=tax.TAX[2026].SE;
  near(calc(100000,184500,184500,'single',se).seStandard,2678.15,'owner wage cap');
  near(calc(100000,0,184500,'mfj',se).seStandard,14129.55,'spouse does not use owner SS cap');
  near(calc(100000,240000,240000,'mfj',se).amedTax,741.15,'combined Medicare');
  near(calc(100000,240000,240000,'mfj',se).halfSE,1339.075,'half excludes AMED');
});
test('2026 QBI minimum requires material participation and $1000 active qualifying QBI', () => {
  // P.L.119-21 section 70105: new 199A(i), plus express exception in 199A(a).
  const base={year:2026,status:'single',businessType:'general',taxableBeforeQBI:10000,wages:0,ubia:0,materiallyParticipates:true};
  for(const qbiBase of [0,999]) near(tax.getQBIDeduction({...base,qbiBase}).deduction,qbiBase*.2,'below active threshold');
  for(const qbiBase of [1000,1500,2000]) assert.equal(tax.getQBIDeduction({...base,qbiBase}).deduction,400);
  assert.equal(tax.getQBIDeduction({...base,qbiBase:1000,materiallyParticipates:false}).deduction,200);
  assert.equal(tax.getQBIDeduction({...base,year:2025,qbiBase:1000}).deduction,200);
  assert.equal(tax.getQBIDeduction({...base,qbiBase:1000,taxableBeforeQBI:0}).deduction,400,'statutory minimum overrides subsection (a) limit; taxable income itself remains floored at zero');
  assert.equal(tax.getQBIDeduction({...base,qbiBase:100000,taxableBeforeQBI:300000}).deduction,400,'wage-limited active general business');
  assert.equal(tax.getQBIDeduction({...base,qbiBase:100000,taxableBeforeQBI:300000,businessType:'sstb'}).deduction,0,'excluded SSTB is not a qualified trade');
});
test('QBI applies wage/UBIA phase-in before the overall taxable-income ceiling', () => {
  // Form 8995-A Part II (business component), Part IV (overall limitation).
  const base={year:2026,status:'single',businessType:'general',qbiBase:1000000,taxableBeforeQBI:239250,wages:0,ubia:0};
  assert.equal(tax.getQBIDeduction(base).deduction,47850);
  assert.equal(tax.getQBIDeduction({...base,wages:40000}).deduction,47850);
  assert.equal(tax.getQBIDeduction({...base,taxableBeforeQBI:300000}).deduction,0);
  assert.equal(tax.getQBIDeduction({...base,taxableBeforeQBI:300000,ubia:1000000}).deduction,25000);
  assert.equal(tax.getQBIDeduction({...base,taxableBeforeQBI:239250,businessType:'sstb',wages:40000}).deduction,47850);
});
test('QBI base distinguishes S-Corp employer SEP from employee elective deferrals', () => {
  assert.equal(tax.getQBIBase({isSCorp:true,distribution:50000,retirementDeduction:10000,retirePlanType:'sep'}),40000);
  assert.equal(tax.getQBIBase({isSCorp:true,distribution:50000,retirementDeduction:10000,retirePlanType:'401k'}),50000);
});
test('2026 itemized charitable floor is separate from the 2025 treatment', () => {
  // P.L.119-21 section 70425, 1040-ES (2026) p.3. Input is otherwise eligible gifts.
  for(const [year,expected] of [[2025,1000],[2026,500]]) {
    const r=tax.getItemizedDeduction({year,status:'single',charity:1000,agiProxy:100000});assert.equal(r.charityDeduction,expected);
  }
  assert.equal(tax.getItemizedDeduction({year:2026,status:'mfj',charity:400,agiProxy:100000}).charityDeduction,0);
});
test('eligible non-itemizer cash gifts are capped and never counted with itemized gifts', () => {
  // P.L.119-21 section 70424; IRC 170(p); 1040-ES (2026) line 2a.
  const base={year:2026,status:'single',standardDeduction:16100,itemizedOn:true,itemizedTotal:17000,qualifyingCashGifts:2000};
  assert.equal(tax.getUsedDeduction(base).usedDeduction,17100);
  assert.equal(tax.getUsedDeduction(base).usedDeductionMode,'standard');
  assert.equal(tax.getUsedDeduction({...base,itemizedTotal:18000}).usedDeduction,18000);
  assert.equal(tax.getUsedDeduction({...base,year:2025}).usedDeduction,17000);
  assert.equal(tax.getUsedDeduction({...base,status:'mfj',standardDeduction:32200}).usedDeduction,34200);
});
test('quarterly safe-harbor mode observes the $1000 balance-due threshold', () => {
  // Form 1040-ES (2026) lines 12c–15; full annual reserve remains available.
  const base={status:'single',mode:'safe_harbor',currentYearTax:950,withholding:0};
  assert.equal(tax.getQuarterlyPlan(base).quarterly,0);
  assert.equal(tax.getQuarterlyPlan({...base,mode:'full'}).annualTarget,950);
  assert.equal(tax.getQuarterlyPlan({...base,currentYearTax:1000}).quarterly,225);
  assert.equal(tax.getQuarterlyPlan({...base,currentYearTax:10000,withholding:9100}).quarterly,0);
  assert.equal(tax.getQuarterlyPlan({...base,currentYearTax:10000}).quarterly,2250);
});
test('prior-year safe harbor requires known AGI and an eligible 12-month return, including zero tax', () => {
  const base={status:'single',mode:'safe_harbor',currentYearTax:30000,withholding:0,priorYearTotalTax:0,priorYearAGI:0,priorYearEligible:true};
  assert.equal(tax.getQuarterlyPlan(base).annualTarget,0);
  assert.equal(tax.getQuarterlyPlan({...base,priorYearEligible:false}).annualTarget,27000);
  assert.equal(tax.getQuarterlyPlan({...base,priorYearTotalTax:20000,priorYearAGI:''}).annualTarget,27000);
  assert.equal(tax.getQuarterlyPlan({...base,priorYearTotalTax:20000,priorYearAGI:150001}).annualTarget,22000);
});
test('published installment dates include the June 2025 weekend adjustment', () => {
  // IRS Form 1040-ES (2025) p.3; (2026) p.5.
  assert.equal(JSON.stringify(helper('getQuarterlyDates')(2025)),JSON.stringify(['Apr 15, 2025','Jun 16, 2025','Sep 15, 2025','Jan 15, 2026']));
  assert.equal(JSON.stringify(helper('getQuarterlyDates')(2026)),JSON.stringify(['Apr 15, 2026','Jun 15, 2026','Sep 15, 2026','Jan 15, 2027']));
});
test('employee-style self-employed deferral compensation subtracts the deductible half of SE', () => {
  // Pub.560, self-employed compensation/earned income; no employer contribution in this mode.
  assert.equal(helper('getRetirementPlanContext')({planType:'401k',year:2026,isSCorp:false,grossIncome:20000,netProfit:20000,totalW2:0,sCorpSalary:0,halfSE:1412.955}).compBase401k,18587.045);
});
test('S-Corp salary plus employer payroll fits available business profit', () => {
  const calc=helper('getAffordableSCorpSalary'),se=tax.TAX[2026].SE;
  for(const available of [0,10000,100000,1000000]) {
    const salary=calc(available,available,se);
    near(salary+Math.min(salary,se.wageBase)*.062+salary*.0145,available,'salary budget reconciles');
  }
});

test('section 68 uses enacted 2/37 after QBI, with both sides of each filing-status boundary', () => {
  // Final Pub.505 (2026), Worksheet 2-6 lines 3–13; P.L.119-21 §70111.
  // IRS worksheet uses rounded 0.054; these cents fixtures use exact statutory 2/37.
  const reduce=helper('getSection68Reduction');
  for(const [status,threshold] of [['single',640600],['hoh',640600],['mfj',768700]]) {
    assert.equal(reduce({year:2026,status,agi:threshold,itemizedTotal:100000,qbiDeduction:0}),0);
    near(reduce({year:2026,status,agi:threshold+3700,itemizedTotal:100000,qbiDeduction:0}),200,'partial section 68');
    near(reduce({year:2026,status,agi:threshold+200000,itemizedTotal:100000,qbiDeduction:0}),200000/37,'full section 68');
  }
  assert.equal(reduce({year:2025,status:'single',agi:800000,itemizedTotal:100000,qbiDeduction:0}),0);
  assert.equal(reduce({year:2026,status:'single',agi:650000,itemizedTotal:100000,qbiDeduction:40000}),0,'QBI shelters the threshold');
});
test('section 68 can change standard/itemized choice and never feeds back into QBI', () => {
  helper('getSection68Reduction');
  const plan=helper('getFederalDeductionPlan');
  const base={year:2026,status:'single',agi:800000,standardDeduction:16100,itemizedTotal:17000,itemizedOn:true,qbiOn:false,qbi:{}};
  assert.equal(plan(base).usedDeductionMode,'standard');
  assert.equal(plan(base).usedDeduction,16100);
  const large=plan({...base,itemizedTotal:100000});
  near(large.section68Reduction,200000/37,'full reduction');
  near(large.taxableIncome,705405.4054054054,'limited itemized taxable income');
  const qbi=plan({...base,itemizedTotal:600000,qbiOn:true,qbi:{qbiBase:200000,businessType:'general',wages:0,ubia:0}});
  assert.equal(qbi.qbiTaxableBeforeQBI,200000);
  assert.equal(qbi.qbiCalc.deduction,40000,'QBI determined without section 68');
  near(qbi.section68Reduction,6454.054054054054,'reduction uses AGI minus QBI');
  near(qbi.taxableIncome,166454.05405405405,'no circular rephasing of QBI');
});
test('QBI phase-in fixtures cover both years, all statuses, SSTB and business property', () => {
  for(const [year,status,threshold,range] of [[2025,'single',197300,50000],[2025,'hoh',197300,50000],[2025,'mfj',394600,100000],[2026,'single',201750,75000],[2026,'hoh',201750,75000],[2026,'mfj',403500,150000]]) {
    const base={year,status,qbiBase:100000,wages:20000,ubia:0,businessType:'general'};
    assert.equal(tax.getQBIDeduction({...base,taxableBeforeQBI:threshold-1}).deduction,20000);
    assert.equal(tax.getQBIDeduction({...base,taxableBeforeQBI:threshold}).deduction,20000);
    assert.equal(tax.getQBIDeduction({...base,taxableBeforeQBI:threshold+range/2}).deduction,15000);
    assert.equal(tax.getQBIDeduction({...base,taxableBeforeQBI:threshold+range}).deduction,10000);
    assert.equal(tax.getQBIDeduction({...base,taxableBeforeQBI:threshold+range/2,businessType:'sstb'}).deduction,7500);
    assert.equal(tax.getQBIDeduction({...base,taxableBeforeQBI:threshold+range,businessType:'sstb'}).deduction,0);
    assert.equal(tax.getQBIDeduction({...base,taxableBeforeQBI:threshold+range,wages:0,ubia:400000}).deduction,10000);
  }
  const active={year:2026,status:'single',taxableBeforeQBI:239250,businessType:'sstb',wages:0,ubia:0,materiallyParticipates:true};
  near(tax.getQBIDeduction({...active,qbiBase:1999}).deduction,99.95,'below adjusted active QBI boundary');
  assert.equal(tax.getQBIDeduction({...active,qbiBase:2000}).deduction,400);
  assert.equal(tax.getQBIDeduction({...active,qbiBase:-10000}).deduction,0);
});
test('ordinary SE and Additional Medicare boundaries are preserved in both years', () => {
  const calc=helper('getSelfEmploymentTax');
  for(const year of [2025,2026]) {
    const se=tax.TAX[year].SE;
    near(calc(100000,se.wageBase, se.wageBase,'single',se).seStandard,2678.15,'Medicare after SS cap');
    near(calc(100000,se.wageBase-100,se.wageBase-100,'single',se).seStandard,2690.55,'remaining $100 SS base');
    for(const [status,threshold] of [['single',200000],['hoh',200000],['mfj',250000]]) {
      assert.equal(calc(0,threshold,threshold,status,se).amedTax,0);
      near(calc(0,threshold+1000,threshold+1000,status,se).amedTax,9,'wages above threshold');
    }
  }
});
test('money grammar rejects malformed prior-year tax and non-decimal blur conversions', () => {
  const parse=helper('parseMoneyValue');
  for(const raw of ['0x100','1e3','123abc','-1','1'+'0'.repeat(307)]) assert.equal(parse(raw),null);
  assert.equal(parse('0'),0);assert.equal(parse('1,000.50'),1000.5);
  assert.equal(tax.getQuarterlyPlan({currentYearTax:30000,withholding:0,status:'single',mode:'safe_harbor',priorYearEligible:true,priorYearTotalTax:'0x0',priorYearAGI:'0'}).annualTarget,27000);
});
