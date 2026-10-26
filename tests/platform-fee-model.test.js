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
test('Round 2 R4 zero before/after-reserve targets ignore positive-transaction work bounds',()=>{
 for(const mode of ['off','manual','smart']){
  vm.runInContext(`revTaxMode='${mode}';revManualTaxPct=25`,ctx);call('setPlatformAnnualTaxProfile',{annualIncome:96000,annualExpenses:16000});
  for(const patch of [{},{procOn:true,prFix:1800},{procOn:true,prFix:1e8},{withdrawal:2000},{withdrawal:1e8}])for(const after of [false,true]){
   const r=call('solvePlatformTarget',0,settings(.1,patch),after);assert.equal(r.solvable,true);assert.equal(r.gross,0);assert.equal(r.netAfterFees,0);if(after)assert.equal(r.taxSummary.finalTakeHome,0);
  }
 }
 vm.runInContext("revTaxMode='smart'",ctx);call('setPlatformAnnualTaxProfile',{annualIncome:null});assert.equal(call('solvePlatformTarget',0,combined,true).solvable,false);
});
test('Round 2 R7 cached exact candidate arithmetic agrees with rational rounding',()=>{
 let seed=8265;const next=()=>{seed=(1664525*seed+1013904223)>>>0;return seed};
 for(let i=0;i<10000;i++){
  const n=next()*2,units=next(),den=(next()%1000000000)+1;
  const expected=Number((2n*BigInt(n)*BigInt(units)+BigInt(den))/(2n*BigInt(den)));
  assert.equal(call('platformRoundedProduct',n,units,den),expected);
 }
 for(const [n,u,d] of [[8999999999,1000000,1000000],[9999999999,1,1000000],[12345,333333,1000000],[999999,999,999999999]])assert.equal(call('platformRoundedProduct',n,u,d),Number((2n*BigInt(n)*BigInt(u)+BigInt(d))/(2n*BigInt(d))));
});
test('Round 2 R7 high-rate scan builds tax summaries only for setup and winning quote',()=>{
 vm.runInContext("revTaxMode='manual';revManualTaxPct=98.9999",ctx);
 const original=ctx.getReverseTaxCalcSummary;let summaries=0;ctx.getReverseTaxCalcSummary=(...args)=>{summaries++;return original(...args)};
 try{const t=performance.now();const r=call('solvePlatformTarget',1,settings(.989999),true);console.log('HIGH_RATE_SOLVE_MS '+(performance.now()-t).toFixed(3));assert.equal(r.gross,9948.51);assert.equal(r.taxSummary.finalTakeHome,1);assert.equal(summaries,2);}finally{ctx.getReverseTaxCalcSummary=original;}
});
test('Round 2 R9 candidate budget counts both endpoints exactly',()=>{
 assert.equal(call('platformCandidateCountAllowed',0,199999),true);
 assert.equal(call('platformCandidateCountAllowed',0,200000),false);
 assert.equal(call('platformCandidateCountAllowed',1000,200999),true);
 assert.equal(call('platformCandidateCountAllowed',1,0),false);
});
