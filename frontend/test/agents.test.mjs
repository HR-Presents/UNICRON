import test from 'node:test';
import assert from 'node:assert/strict';
import {agents,selectStage} from '../src/agents.mjs';

test('agent roster maps all six recorded checkpoint names to independent views',()=>{
  const events=agents.map((agent,index)=>({
    agent:agent.name,stage:{agent:agent.name,status:index===2?'source_required':'completed',result:{sample:index}},
  }));
  assert.equal(agents.length,6);
  assert.equal(new Set(agents.map(agent=>agent.id)).size,6);
  for(const [index,agent] of agents.entries())assert.equal(selectStage(agent,events)?.stage.result.sample,index);
  assert.equal(selectStage(agents[2],events)?.stage.status,'source_required');
});

test('a current run never shows stale standalone work as a new checkpoint',()=>{
  const records={triage:[{result:{classification:'Previously recorded'},created_at:'2026-11-06T09:00:00Z'}]};
  const agent=agents[0];
  assert.equal(selectStage(agent,[],null,records,true),null);
  assert.equal(selectStage(agent,[],null,records,false).origin,'Standalone analysis');
  const previous=[{agent:agent.name,created_at:'2026-11-06T08:00:00Z',stage:{status:'completed',result:{classification:'Earlier run'}}}];
  assert.equal(selectStage(agent,previous,null,records,false).stage.result.classification,'Previously recorded');
});
