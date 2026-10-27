'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(process.env.TAX_BASELINE_HTML||new URL('../tax-estimator.html',`file://${__filename}`),'utf8');
const source=html.match(/^function parseMoneyValue\([\s\S]*?^\}/m)[0],c=vm.createContext({});vm.runInContext(source,c);const parse=v=>c.parseMoneyValue(v);
for(const raw of ['12,34','1,000,00','1234,567','1,,000','85,000.','123.','.', '1e3','-1','Infinity','NaN','1000000000001'])test('TAX01 strict rejected money '+raw,()=>assert.equal(parse(raw),null));
test('TAX01 legitimate grouping cents zero and blank remain distinct',()=>{for(const [raw,n]of [['1,000.50',1000.5],['.25',.25],['0',0],['1,000,000,000,000',1e12],['85000.25',85000.25]])assert.equal(parse(raw),n);assert.equal(parse(''),null);});
