import test from 'node:test';
import assert from 'node:assert/strict';
import {assessReadiness} from '../src/readiness.mjs';
import {exportSnapshot,verifySnapshot} from '../src/audit-export.mjs';

test('readiness awards no points for absent backend data or model fixtures',()=>{
  assert.equal(assessReadiness().total,0);
  const run={execution:{id:'run-1',status:'completed'},events:Array.from({length:6},(_,i)=>({agent:'agent-'+i}))};
  const records={investigations:[{id:'run-1',model:'contract-fixture'}],reviews:[{investigation_id:'run-1',rationale:'Review complete'}]};
  assert.equal(assessReadiness(records,run).rows[1].score,0);
  records.investigations[0].model='qwen3:4b';
  assert.equal(assessReadiness(records,run).rows[1].score,14);
});

test('audit export verifies the case snapshot and detects altered evidence',()=>{
  const records={audit:[{id:'e2',case_id:'CIV-1',action:'case.updated',detail:'Updated',created_at:'2026-11-06T10:02Z'},
    {id:'e1',case_id:'CIV-1',action:'case.created',detail:'Opened',created_at:'2026-11-06T10:01Z'}]};
  const snapshot=exportSnapshot('CIV-1',{},records);
  assert.ok(verifySnapshot(snapshot));
  assert.equal(snapshot.auditChain[0].id,'e1');
  assert.equal(snapshot.auditChain[1].previousHash,snapshot.auditChain[0].hash);
  const changed=structuredClone(snapshot);
  changed.auditChain[0].detail='Altered';
  assert.equal(verifySnapshot(changed),false);
});
