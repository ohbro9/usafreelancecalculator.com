'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'../platform-fee-calculator.html'),'utf8');
function slice(a,b){return html.slice(html.indexOf(a),html.indexOf(b));}
const ctx=vm.createContext({window:{},console});
vm.runInContext(slice('const PFC_MAX_AMOUNT','const fmt=' )+
 slice('function stripPlatformNumericFormatting','function getPlatformIntegerInputConfig')+
 slice('/* PHASE 1: SHARED SMART TAX ENGINE */','/* ══ DARK MODE ══ */')+
 slice('function defaultPlatformAnnualTaxProfile','function syncPlatformTaxQuickPickUi')+
 `let revGoalType='after_tax',revTaxMode='off',revManualTaxPct=25;function getReverseManualPct(){return revManualTaxPct;}\n`+
 slice('function computeClientScenario','function getForwardTaxCalcSummary')+
 slice('function getReversePlatformTaxModel','function computeTaxSummary'),ctx);
const call=(name,...args)=>ctx[name](...args);
const settings=(pf=.1,extra={})=>({pf,procOn:false,prPct:0,prFix:0,intl:false,fx:false,withdrawal:0,...extra});
const combined=settings(.1,{procOn:true,prPct:.029,prFix:.3,intl:true,fx:true,withdrawal:2});
function oracle(c,s){
 const round=(rate)=>Number((BigInt(c)*BigInt(Math.round(rate*1e6))+500000n)/1000000n);
 const fees=round(s.pf)+(s.procOn&&c>0?round(s.prPct)+Math.round(s.prFix*100):0)+(s.intl?round(.015):0)+(s.fx?round(.02):0);
 return Math.max(0,c-fees-Math.round(s.withdrawal*100));
}
test('PFC F2 independent integer-cent forward grid: 1,000,000 cases',()=>{
 for(const s of [settings(.1),settings(.2),settings(.0895),combined,{...combined,pf:.2}]){
  for(let c=0;c<200000;c++)assert.equal(Math.round(call('computeClientScenario',c/100,s).netAfterFees*100),oracle(c,s),`gross cents ${c}`);
 }
});
test('PFC baseline USD examples and explicit half-up ties',()=>{
 for(const [gross,pf,keep] of [[1000,.1,900],[1000,.2,800],[1000.55,.1,900.49],[.35,.1,.31]])assert.equal(call('computeClientScenario',gross,settings(pf)).netAfterFees,keep);
 for(const [target,pf,gross] of [[1000,.1,1111.11],[1000,.2,1250],[1000.55,.1,1111.72]])assert.equal(call('solveGrossForTargetNet',target,settings(pf)).gross,gross);
});
test('PFC F1 10,000 before-tax quotes equal exhaustive earliest feasible cent',()=>{
 // Enumerate the independent forward oracle once, recording first achievement of each target.
 for(const s of [settings(.1),combined]){
  const first=new Map();let best=0;
  for(let c=0;first.size<5000;c++){
   const n=oracle(c,s);while(best<n&&best<5000)first.set(++best,c);
  }
  for(let target=1;target<=5000;target++)assert.equal(Math.round(call('solveGrossForTargetNet',target/100,s).gross*100),first.get(target));
 }
});
test('PFC F1 8,000 manual after-reserve quotes equal exhaustive oracle',()=>{
 vm.runInContext("revTaxMode='manual';revManualTaxPct=25",ctx);
 for(const s of [settings(.1),combined]){
  let best=0;const first=new Map();
  for(let c=0;first.size<4000;c++){
   const before=oracle(c,s),n=before-Math.floor((before*25+50)/100);
   while(best<n&&best<4000)first.set(++best,c);
  }
  for(let target=1;target<=4000;target++)assert.equal(Math.round(call('solveChargeForAfterTaxKeepTarget',target/100,s).gross*100),first.get(target));
 }
 assert.equal(call('solveChargeForAfterTaxKeepTarget',1000,settings()).gross,1481.48);
});
test('PFC S9/F3 ordinary SE gate uses net earnings, preserving high-income taxes',()=>{
 for(const status of ['single','mfj','hoh']){
  for(const profit of [0,100,400,433.13])assert.equal(call('calcSelfEmploymentTax2026',profit,status).total,0);
  assert.ok(call('calcSelfEmploymentTax2026',433.14,status).total>0);
  assert.ok(call('calcSelfEmploymentTax2026',300000,status).additionalMedicareTax>0);
 }
});
test('PFC F4 missing Smart profile and F6 unsupported quote fail explicitly',()=>{
 vm.runInContext("revTaxMode='smart'",ctx);call('setPlatformAnnualTaxProfile',{annualIncome:null,annualExpenses:0});
 const r=call('solveChargeForAfterTaxKeepTarget',1000,settings());assert.equal(r.solvable,false);assert.equal(r.taxSetupNeeded,true);
 for(const n of [100000000,100000000.01,1e9])assert.equal(call('solveGrossForTargetNet',n,settings()).solvable,false);
 assert.equal(call('solveGrossForTargetNet',100000000,settings(0)).gross,100000000);
});
test('PFC S6 money grammar rejects transformations and unsafe precision/ranges',()=>{
 for(const raw of ['-100','1e3','1..50','1,50','1.005','1,000.5.0','100000000.01','Infinity','NaN','abc'])assert.ok(Number.isNaN(call('platformMoney',raw)),raw);
 for(const [raw,n] of [['$1,000.55',1000.55],['.50',.5],['1,000',1000],['1000.',1000],['0',0],['100000000',1e8]])assert.equal(call('platformMoney',raw),n);
});
test('PFC F5 fee deficits are explicit rather than a reconciled zero payout',()=>{
 const r=call('computeClientScenario',.01,combined);assert.equal(r.invalid,true);assert.ok(r.deficit>0);
});
test('PFC Smart inverse quotes match 4,000 exhaustive rational-tax oracle minima',()=>{
 vm.runInContext("revTaxMode='smart'",ctx);call('setPlatformAnnualTaxProfile',{annualIncome:96000,annualExpenses:16000,filingStatus:'single',taxRegion:'state_balanced'});
 const annual=call('getPlatformSmartTaxModel',{mode:'smart',annualIncome:96000,annualExpenses:16000,filingStatus:'single',taxRegion:'state_balanced',transactionBase:0});
 const profit=BigInt(Math.round(annual.annualProfitBasis*100));
 const tax=n=>['federalTax','stateTax','seTax'].reduce((sum,k)=>sum+Number((BigInt(n)*BigInt(Math.round(annual[k]*100))*2n+profit)/(profit*2n)),0);
 for(const s of [settings(.1),combined]){
  const first=new Map();let best=0;
  for(let c=0;first.size<2000;c++){const before=oracle(c,s),n=before-tax(before);while(best<n&&best<2000)first.set(++best,c);}
  for(let target=1;target<=2000;target++)assert.equal(Math.round(call('solveChargeForAfterTaxKeepTarget',target/100,s).gross*100),first.get(target));
 }
});
