'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {test} = require('node:test');
const html = fs.readFileSync(new URL('../income-goal-planner.html', `file://${__filename}`), 'utf8');
function extract(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} exists`);
  const body = html.indexOf('{', html.indexOf(') {', start));
  let depth = 0;
  for (let i = body; i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}') depth--;
    if (!depth) return html.slice(start, i + 1);
  }
  throw Error(`Cannot extract ${name}`);
}
const names = ['num','fmt','fmtUSD','fmtRate','clamp','safe','boundedInputValue','boundedPercentValue','platformFeePercentValue','processorFeePercentValue','processorFixedFeeValue','feeTransactionCountValue','totalFeePercentValue','currentFeeMode','federalTaxFromTaxableIncome','estimateAnnualTaxes','modelMonthlyGross','solveMonthlyGross','calculate','calculatePipeline'];
function fixture() {
  const c = {console}; vm.createContext(c);
  vm.runInContext(html.slice(html.indexOf('const PRESETS ='), html.indexOf('function init()')) + '\n' + names.map(extract).join('\n') + '\nglobalThis.api={state,ui,'+names.join(',')+'};', c);
  const a = c.api;
  Object.assign(a.state,{advancedEnabled:true,stateTaxRate:3,feesEnabled:true,withdrawalEnabled:false,bufferPct:15});
  for (const [k,v] of Object.entries({incomeInput:5000,hoursInput:8,daysInput:5,weeksInput:48,utilInput:70,taxInput:15,seInput:15.3,expenseInput:600,stateTaxInput:3,feePercentInput:0,processorFeeInput:2.9,fixedFeeInput:.3,txInput:4,feeModeSelect:'Freelancer absorbs',pipeModelInput:3500,pipeLeadInput:25,pipeCallInput:70,pipeCloseInput:40,pipeWorkingDaysInput:22})) a.ui[k]={value:String(v)};
  return a;
}
const near=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<eps, `${a} != ${b}`);
test('reference gross/net equation reconciles independently calculated taxes and fees',()=>{
  const a=fixture(), r=a.calculate(); assert.equal(r.error,false);
  near(r.grossRequired,8891.39440826311); near(r.requiredHourlyRate,79.38745007377777);
  near(r.federalTaxMonthly,906.4395938378053); near(r.stateLocalTaxMonthly,240.97031911270437);
  near(r.seTaxMonthly,1134.9340574729706); near(r.absorbedFeeTotal,259.05043783963015);
  assert.deepEqual([r.billableHoursWeekPlan,r.billableHoursMonth,r.billableHoursYear],[28,112,1344]);
  near(r.grossRequired,r.goalMonthly+r.bufferAmount+r.monthlyExpenses+r.taxPaidMonthlyActual+r.absorbedFeeTotal);
  near(r.grossRequiredAnnual,r.grossRequired*12);
});
test('hourly take-home excludes buffer across percentage and amount modes',()=>{
  for(const pct of [0,10,15,20]) {const a=fixture();a.state.bufferPct=pct;const r=a.calculate();near(r.ownerNetHourly,44.642857142857146);near(r.takeHomeAfterTaxMonthly,5000+50*pct);}
  const a=fixture();Object.assign(a.state,{bufferMode:'amount',bufferAmount:750});near(a.calculate().ownerNetHourly,44.642857142857146);
});
test('zero conversion cannot produce a positive attainable pipeline',()=>{
  for(const key of ['pipeLeadInput','pipeCallInput','pipeCloseInput']) {const a=fixture();a.ui[key].value='0';assert.equal(a.calculatePipeline(a.calculate()),null);}
});
test('scenario multiplier scales conversions without a hidden probability floor',()=>{
  const a=fixture();a.state.confidence='conservative';a.ui.pipeLeadInput.value='0.1';const p=a.calculatePipeline(a.calculate());near(p.leadsNeeded,17720.41296289682,1e-5);
});
test('ordinary Schedule SE excludes net earnings below $400',()=>{
  const a=fixture();near(a.estimateAnnualTaxes(400).seTaxAnnual,0);
  const at=a.estimateAnnualTaxes(400/0.9235);near(at.seTaxAnnual,61.2);
});
test('Social Security cap and deductible half exclude Additional Medicare',()=>{
  const a=fixture();a.state.w2IncomeAnnual=184500;
  const t=a.estimateAnnualTaxes(100000);near(t.socialSecurityTaxAnnual,0);near(t.medicareTaxAnnual,2678.15);near(t.additionalMedicareTaxAnnual,691.65);near(t.halfSeDeductionAnnual,1339.075);
});
test('percentage buffer is distinct from currency amount',()=>{
  const a=fixture();a.state.bufferPct=750;near(a.calculate().bufferAmount,37500);Object.assign(a.state,{bufferMode:'amount',bufferAmount:750});near(a.calculate().bufferAmount,750);
});
test('matching yearly and monthly targets produce identical gross',()=>{
  const a=fixture(),m=a.calculate();a.state.goalMode='yearly';a.ui.incomeInput.value='60000';near(a.calculate().grossRequired,m.grossRequired);
});
test('invalid schedule and zero billable utilization block a rate',()=>{
  for(const key of ['incomeInput','hoursInput','daysInput','weeksInput','utilInput']){const a=fixture();a.ui[key].value='0';assert.equal(a.calculate().error,true);}
});
module.exports={fixture,extract,html};
test('client-absorbed processor fee covers fee on the full client payment',()=>{
 const a=fixture();a.ui.feeModeSelect.value='Client absorbs';const r=a.calculate();
 near(r.absorbedFeeTotal,0);near(r.clientSideFees,(r.grossRequired*.029+1.2)/.971);
 near(r.grossRequired+r.clientSideFees-(r.grossRequired+r.clientSideFees)*.029-1.2,r.grossRequired);
});
test('combined absorbed fees at 100% block unattainable goals',()=>{
 const a=fixture();a.ui.feePercentInput.value='80';a.ui.processorFeeInput.value='20';assert.equal(a.calculate().error,true);
});
test('pipeline needs a positive project value and working-day count',()=>{
 for(const key of ['pipeModelInput','pipeWorkingDaysInput']){const a=fixture();a.ui[key].value='0';assert.equal(a.calculatePipeline(a.calculate()),null);}
});
test('small annual goal uses the least gross solution below the SE threshold',()=>{
 const a=fixture();Object.assign(a.state,{goalMode:'yearly',bufferPct:0,feesEnabled:false,stateTaxRate:0});a.ui.stateTaxInput.value='0';a.ui.expenseInput.value='0';for(const goal of [400,410,425,430]){a.ui.incomeInput.value=String(goal);near(a.calculate().grossRequiredAnnual,goal);}
});
test('nonfinite numeric inputs cannot create NaN or infinite plans',()=>{
 const a=fixture();a.ui.incomeInput.value='Infinity';assert.equal(a.calculate().error,true);
});
test('fee and withdrawal modes balance with manual taxes disabled',()=>{
 const a=fixture();Object.assign(a.state,{taxMode:'manual',seTaxEnabled:false,bufferPct:0,withdrawalEnabled:true,withdrawalPct:2});a.ui.taxInput.value='0';a.ui.feePercentInput.value='10';a.ui.processorFeeInput.value='3';a.ui.expenseInput.value='600';
 const r=a.calculate();near(r.grossRequired,(5600/.98+1.2)/.87);near(r.takeHomeAfterTaxMonthly,5000);near(r.feeFixedTotal,1.2);
 a.ui.feeModeSelect.value='Client absorbs';const c=a.calculate();near(c.grossRequired,5600/.98);near(c.clientSideFees,(c.grossRequired*.13+1.2)/.87);near(c.withdrawalAmount,c.grossRequired*.02);
});
test('filing status progressive tax brackets match IRS endpoint fixtures',()=>{
 const a=fixture();for(const [status,input,want] of [['single',105700,17966],['mfj',211400,35932],['mfs',384350,103291.75],['hoh',201750,39207]])near(a.federalTaxFromTaxableIncome(input,status),want);
 for(const status of ['single','mfj','mfs','hoh']){a.state.filingStatus=status;assert.equal(a.calculate().error,false);}
});
test('SE wage base boundaries and Additional Medicare across filing statuses',()=>{
 const a=fixture();for(const earnings of [184499,184500,184501])near(a.estimateAnnualTaxes(earnings/.9235).socialSecurityTaxAnnual,Math.min(earnings,184500)*.124);
 for(const [status,threshold] of [['single',200000],['mfj',250000],['mfs',125000],['hoh',200000]]){a.state.filingStatus=status;near(a.estimateAnnualTaxes((threshold+1000)/.9235).additionalMedicareTaxAnnual,9);}
});
test('pipeline full conversion and all scenarios preserve fractional expected deals',()=>{
 const a=fixture();a.ui.pipeLeadInput.value='100';a.ui.pipeCallInput.value='100';a.ui.pipeCloseInput.value='100';near(a.calculatePipeline(a.calculate()).leadsNeeded,2.5403984023608883);
 a.ui.pipeLeadInput.value='25';a.ui.pipeCallInput.value='70';a.ui.pipeCloseInput.value='40';for(const [confidence,want] of [['realistic',36.29140574801269],['conservative',70.88165185158726],['aggressive',21.001970919]]){a.state.confidence=confidence;near(a.calculatePipeline(a.calculate()).leadsNeeded,want,1e-6);}
});
test('Basic Smart income-tax model omits all advanced costs and ordinary SE tax',()=>{
 const a=fixture();a.state.advancedEnabled=false;const r=a.calculate();
 near(r.grossRequired,5685.555555555556);near(r.requiredHourlyRate,50.76388888888889);
 near(r.federalTaxMonthly,514.988888888889);near(r.stateLocalTaxMonthly,170.5666666666667);
 near(r.seTaxMonthly,0);near(r.bufferAmount,0);near(r.monthlyExpenses,0);near(r.absorbedFeeTotal,0);near(r.ownerNetHourly,44.642857142857146);
});
test('mode switching preserves advanced settings and financial models',()=>{
 const a=fixture(), advanced=a.calculate();a.state.advancedEnabled=false;const basic=a.calculate();a.state.advancedEnabled=true;near(a.calculate().grossRequired,advanced.grossRequired);
 a.state.advancedEnabled=false;near(a.calculate().grossRequired,basic.grossRequired);
 assert.equal(a.state.seTaxEnabled,true);assert.equal(a.state.feesEnabled,true);assert.equal(a.state.bufferPct,15);
});
