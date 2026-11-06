import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {departments,policies,scenarios} from '../src/scenarios.mjs';
import {answerQuestion,currentStage,recordCheckpoint,recordReview,verifyAudit} from '../src/engine.mjs';

async function run(scenario) {
  let ledger=[];
  for(const _ of scenario.stages)ledger=await recordCheckpoint(scenario,ledger);
  return ledger;
}

test('all scenarios map their checkpoints to actual campus departments and evidence',()=>{
  for(const scenario of scenarios) {
    assert.equal(new Set(scenario.stages.map(step=>step.department)).size,departments.length);
    for(const step of scenario.stages) {
      assert.ok(departments.some(department=>department.id===step.department));
      assert.ok(step.evidence.every(id=>scenario.evidence.some(record=>record.id===id)));
      assert.ok(step.policy.every(id=>policies.some(policy=>policy.id===id)));
    }
  }
});

test('each case stops at a human checkpoint and permits one scoped decision',async()=>{
  for(const scenario of scenarios) {
    const opened=await recordCheckpoint(scenario,[]);
    await assert.rejects(recordReview(scenario,opened,'Approved','Bounded scope review',true),/every checkpoint/);
    const ledger=await run(scenario);
    assert.equal(currentStage(ledger),4);
    await assert.rejects(recordCheckpoint(scenario,ledger),/Every checkpoint/);
    await assert.rejects(recordReview(scenario,ledger,'Approved','Bounded scope review',false),/scope/);
    await assert.rejects(recordReview(scenario,ledger,'Returned','No',false),/reason/);
    const reviewed=await recordReview(scenario,ledger,'Approved','Bounded scope review',true);
    assert.equal(reviewed.at(-1).decision,'Approved');
    assert.ok(await verifyAudit(reviewed));
    await assert.rejects(recordReview(scenario,reviewed,'Returned','Need more evidence',false),/already/);
    assert.equal((await recordReview(scenario,ledger,'Returned','Need more evidence',false)).at(-1).decision,'Returned');
  }
});

test('audit links use SHA-256 and reject tampering, omission and reordering',async()=>{
  const ledger=await run(scenarios[0]);
  const entry=ledger[0];
  const data=[entry.caseId,entry.sequence,entry.timestamp,entry.type,entry.stage,entry.actor,entry.title,entry.evidence,entry.previousHash,entry.decision,entry.reason];
  assert.equal(entry.hash,createHash('sha256').update(JSON.stringify(data)).digest('hex'));
  assert.ok(await verifyAudit(ledger));
  assert.equal(await verifyAudit([{...entry,title:'Edited title'},...ledger.slice(1)]),false);
  assert.equal(await verifyAudit(ledger.slice(1)),false);
  assert.equal(await verifyAudit([...ledger].reverse()),false);
});

test('assistant responds with released citations and respects replay context',async()=>{
  const scenario=scenarios[0];
  const ledger=await run(scenario);
  assert.deepEqual(answerQuestion('What evidence is available?',scenario,ledger,0).refs,['E01']);
  assert.deepEqual(answerQuestion('What does E03 say?',scenario,ledger,0).refs,[]);
  assert.deepEqual(answerQuestion('What does E03 say?',scenario,ledger,3).refs,['E03']);
  assert.deepEqual(answerQuestion('What comes next?',scenario,ledger,0).refs,['AUD-1']);
  assert.deepEqual(answerQuestion('What is the proposed action?',scenario,ledger,4).refs,['E04']);
  assert.deepEqual(answerQuestion('Explain quantum gravity',scenario,ledger,4).refs,[]);
});

test('switching scenarios keeps rehearsal ledgers isolated',async()=>{
  const original=await recordCheckpoint(scenarios[0],[]);
  await assert.rejects(recordCheckpoint(scenarios[1],original),/different case/);
  const fresh=await recordCheckpoint(scenarios[1],[]);
  assert.equal(fresh[0].caseId,scenarios[1].id);
  assert.notEqual(fresh[0].hash,original[0].hash);
});
