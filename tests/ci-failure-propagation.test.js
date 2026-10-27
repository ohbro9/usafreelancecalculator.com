'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/pr-validation.yml'),'utf8');
test('Round 2 R6 every tee test pipeline propagates child failure and preserves logs',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'usafc-ci-failure-'));
 try{
  const failing=path.join(temp,'intentional.test.js');fs.writeFileSync(failing,"require('node:test').test('intentional propagation check',()=>require('node:assert/strict').fail('deliberate failure'))\n");
  const blocks=[...workflow.matchAll(/        run: \|\n((?:          .*\n|\n)+)/g)].map(m=>m[1]);
  let pipelines=0;
  for(const block of blocks){
   const sets=block.split('\n').filter(line=>/^\s*set /.test(line)).map(line=>line.trim()).join('\n');
   for(const line of block.split('\n').filter(line=>line.includes('node tests/')&&line.includes('| tee')||line.includes('node --test')&&line.includes('| tee'))){
    assert.match(sets,/pipefail/);const log=path.join(temp,`pipeline-${pipelines++}.log`);
    const cmd=line.includes('node --test')?`node --test ${JSON.stringify(failing)}`:`node -e 'console.log("deliberate failed browser/caret process");process.exit(23)'`;
    // The nested Node runner must bootstrap its own test harness, not inherit the
    // parent's internal child-runner mode (which can otherwise report a false zero exit).
    const childEnv={...process.env};delete childEnv.NODE_TEST_CONTEXT;
    const r=spawnSync('bash',['-e','-c',sets+'\n'+cmd+' | tee '+JSON.stringify(log)],{encoding:'utf8',env:childEnv});
    assert.ok(r.status!==0,`pipeline masked failure: ${line}`);assert.ok(fs.statSync(log).size>0,'failed process log must survive');
   }
  }
  assert.equal(pipelines,8,'Node, Platform, caret, Hourly, Tax, Tax safety, Tax reporting and Income Goal pipelines');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
